import Fastify, { type FastifyInstance, type FastifyReply, type FastifyRequest } from 'fastify'
import cookie from '@fastify/cookie'
import fastifyStatic from '@fastify/static'
import { randomUUID } from 'node:crypto'
import { writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { config } from './config.js'
import { db, purgeExpiredSessions } from './db.js'
import {
  SESSION_COOKIE, type SessionContext, canEditRestaurant, createSession, destroySession,
  findUserByLogin, readSession, setImpersonation, verifyPassword,
} from './auth.js'
import {
  type MenuPayload, dishRestaurant, getRestaurant, listCategories, listDishes, listMenus,
  listOwners, listPurchases, listRestaurants, purchaseLanguage, replaceMenu, setDishPhoto,
  updateRestaurant,
} from './store.js'

/** Tarif mensuel d'une langue supplémentaire, par plan. Autorité : le serveur. */
const LANG_PRICE: Record<string, number> = { essai: 12, starter: 12, pro: 9 }

declare module 'fastify' {
  interface FastifyRequest {
    ctx: SessionContext | null
  }
}

function publicUser(ctx: SessionContext) {
  return {
    id: ctx.acting.id,
    login: ctx.acting.login,
    name: ctx.acting.name,
    role: ctx.acting.role,
    restaurantId: ctx.acting.restaurant_id,
    impersonating: ctx.impersonating,
    realUser: ctx.impersonating ? { id: ctx.user.id, name: ctx.user.name, login: ctx.user.login } : null,
  }
}

export function buildApp(): FastifyInstance {
  const app = Fastify({
    logger: { level: process.env.LOG_LEVEL ?? 'info' },
    bodyLimit: config.maxPhotoBytes + 512 * 1024,
    trustProxy: true,
  })

  app.register(cookie)

  // Photos de plats. En production nginx sert ce dossier directement et
  // n'atteint jamais cette route ; elle sert au développement local.
  app.register(fastifyStatic, {
    root: config.uploadDir,
    prefix: '/uploads/',
    decorateReply: false,
    cacheControl: true,
    maxAge: '30d',
  })

  // --- Contexte de session sur chaque requête ---
  app.addHook('onRequest', async (req: FastifyRequest) => {
    req.ctx = readSession(req.cookies[SESSION_COOKIE])
  })

  /**
   * Protection CSRF. Le cookie de session est `SameSite=Strict`, ce qui bloque
   * déjà les requêtes déclenchées depuis un autre site. On exige en plus un
   * en-tête que seul du JavaScript de même origine peut poser : un formulaire
   * HTML classique en est incapable.
   */
  app.addHook('onRequest', async (req, reply) => {
    if (req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS') return
    if (req.url.startsWith('/api/auth/login')) return
    if (req.headers['x-eatnow-client'] !== '1') {
      return reply.code(403).send({ error: 'Requête refusée : en-tête client manquant.' })
    }
  })

  const requireAuth = async (req: FastifyRequest, reply: FastifyReply) => {
    if (!req.ctx) return reply.code(401).send({ error: 'Authentification requise.' })
  }

  /**
   * Le compte authentifié est-il administrateur ?
   *
   * On teste `user` et non `acting` : pendant un endossement, le titulaire de
   * la session reste l'administrateur. Ce garde protège le contrôle de la vue
   * (choisir qui l'on endosse), ce qui autorise volontairement à basculer
   * directement d'un restaurateur à un autre sans repasser par la console.
   *
   * L'accès aux *données* d'administration suit une règle plus stricte,
   * appliquée dans /api/state : pendant un endossement, l'administrateur ne
   * voit que le périmètre du restaurateur qu'il endosse.
   */
  const requireAdminSession = async (req: FastifyRequest, reply: FastifyReply) => {
    if (req.ctx?.user.role !== 'admin') {
      return reply.code(403).send({ error: 'Réservé aux administrateurs.' })
    }
  }


  // ============================================================
  // Authentification
  // ============================================================

  app.post<{ Body: { login?: string; password?: string } }>('/api/auth/login', async (req, reply) => {
    const login = (req.body?.login ?? '').trim()
    const password = req.body?.password ?? ''
    if (!login || !password) {
      return reply.code(400).send({ error: 'Identifiant et mot de passe requis.' })
    }

    const user = findUserByLogin(login)
    // Message identique dans les deux cas : ne révèle pas l'existence du compte.
    const ok = user ? await verifyPassword(password, user.password_hash, user.password_salt) : false
    if (!user || !ok) {
      return reply.code(401).send({ error: 'Identifiants incorrects.' })
    }

    const sid = createSession(user.id)
    reply.setCookie(SESSION_COOKIE, sid, {
      httpOnly: true,
      sameSite: 'strict',
      secure: config.secureCookies,
      path: '/',
      maxAge: config.sessionDays * 24 * 3600,
    })
    const ctx = readSession(sid)!
    return { user: publicUser(ctx) }
  })

  app.post('/api/auth/logout', async (req, reply) => {
    if (req.ctx) destroySession(req.ctx.session)
    reply.clearCookie(SESSION_COOKIE, { path: '/' })
    return { ok: true }
  })

  app.get('/api/auth/me', async (req) => (req.ctx ? { user: publicUser(req.ctx) } : { user: null }))

  app.post<{ Body: { ownerId?: string } }>(
    '/api/auth/impersonate',
    { onRequest: [requireAuth, requireAdminSession] },
    async (req, reply) => {
      const ownerId = req.body?.ownerId
      if (!ownerId) return reply.code(400).send({ error: 'ownerId requis.' })
      const target = db
        .prepare<[string], { id: string; role: string }>('SELECT id, role FROM users WHERE id = ?')
        .get(ownerId)
      if (!target || target.role !== 'owner') {
        return reply.code(404).send({ error: 'Restaurateur introuvable.' })
      }
      setImpersonation(req.ctx!.session, ownerId)
      return { user: publicUser(readSession(req.ctx!.session)!) }
    },
  )

  app.post('/api/auth/stop-impersonating', { onRequest: [requireAuth] }, async (req) => {
    setImpersonation(req.ctx!.session, null)
    return { user: publicUser(readSession(req.ctx!.session)!) }
  })

  // ============================================================
  // Données publiques
  // ============================================================

  /**
   * Annuaire complet : restaurants, catégories, plats et formules.
   *
   * Une seule réponse, mise en cache par le service worker : c'est ce qui rend
   * les cartes consultables hors connexion. À l'échelle de plusieurs milliers
   * de restaurants il faudra paginer et servir chaque carte séparément.
   */
  app.get('/api/public/state', async (_req, reply) => {
    reply.header('Cache-Control', 'public, max-age=30, stale-while-revalidate=86400')
    return {
      restaurants: listRestaurants(),
      categories: listCategories(),
      dishes: listDishes(),
      menus: listMenus(),
    }
  })

  app.get('/api/version', async () => ({
    version: config.version,
    time: new Date().toISOString(),
  }))

  // ============================================================
  // Données de session
  // ============================================================

  app.get('/api/state', { onRequest: [requireAuth] }, async (req) => {
    const ctx = req.ctx!
    const isAdmin = ctx.user.role === 'admin' && !ctx.impersonating
    if (isAdmin) {
      return { owners: listOwners(), purchases: listPurchases() }
    }
    // Hors périmètre d'administration, la session ne reçoit que son propre
    // compte — dont le client a besoin pour afficher l'espace restaurateur.
    return {
      owners: ctx.acting.restaurant_id
        ? [{
            id: ctx.acting.id,
            name: ctx.acting.name,
            email: ctx.acting.login,
            restaurantId: ctx.acting.restaurant_id,
          }]
        : [],
      purchases: ctx.acting.restaurant_id ? listPurchases(ctx.acting.restaurant_id) : [],
    }
  })

  // ============================================================
  // Écriture : fiche, carte, langues, photos
  // ============================================================

  app.patch<{ Params: { id: string }; Body: Record<string, unknown> }>(
    '/api/restaurants/:id',
    { onRequest: [requireAuth] },
    async (req, reply) => {
      const { id } = req.params
      if (!getRestaurant(id)) return reply.code(404).send({ error: 'Restaurant introuvable.' })
      if (!canEditRestaurant(req.ctx!, id)) {
        return reply.code(403).send({ error: 'Ce restaurant ne vous appartient pas.' })
      }
      // `purchasedLangs` ne se modifie que par un achat : le client ne peut pas
      // s'offrir une langue en modifiant sa fiche.
      const { purchasedLangs: _ignored, ...patch } = req.body ?? {}
      updateRestaurant(id, patch)
      return { restaurant: getRestaurant(id) }
    },
  )

  app.put<{ Params: { id: string }; Body: MenuPayload }>(
    '/api/restaurants/:id/menu',
    { onRequest: [requireAuth] },
    async (req, reply) => {
      const { id } = req.params
      if (!getRestaurant(id)) return reply.code(404).send({ error: 'Restaurant introuvable.' })
      if (!canEditRestaurant(req.ctx!, id)) {
        return reply.code(403).send({ error: 'Ce restaurant ne vous appartient pas.' })
      }
      const body = req.body
      if (!body || !Array.isArray(body.categories) || !Array.isArray(body.dishes) || !Array.isArray(body.menus)) {
        return reply.code(400).send({ error: 'Carte invalide : categories, dishes et menus sont requis.' })
      }
      replaceMenu(id, body)
      return { ok: true, counts: { categories: body.categories.length, dishes: body.dishes.length, menus: body.menus.length } }
    },
  )

  app.post<{ Params: { id: string }; Body: { lang?: string } }>(
    '/api/restaurants/:id/languages',
    { onRequest: [requireAuth] },
    async (req, reply) => {
      const { id } = req.params
      const resto = getRestaurant(id)
      if (!resto) return reply.code(404).send({ error: 'Restaurant introuvable.' })
      if (!canEditRestaurant(req.ctx!, id)) {
        return reply.code(403).send({ error: 'Ce restaurant ne vous appartient pas.' })
      }
      const lang = req.body?.lang
      if (!lang) return reply.code(400).send({ error: 'Langue requise.' })

      // Le tarif est décidé par le serveur, jamais envoyé par le client.
      const amount = LANG_PRICE[resto.plan] ?? 12
      const { alreadyOwned } = purchaseLanguage(id, lang, amount)
      return { alreadyOwned, amount, restaurant: getRestaurant(id) }
    },
  )

  app.post<{ Params: { id: string }; Body: { dataUrl?: string | null } }>(
    '/api/dishes/:id/photo',
    { onRequest: [requireAuth] },
    async (req, reply) => {
      const restaurantId = dishRestaurant(req.params.id)
      if (!restaurantId) return reply.code(404).send({ error: 'Plat introuvable.' })
      if (!canEditRestaurant(req.ctx!, restaurantId)) {
        return reply.code(403).send({ error: 'Ce plat ne vous appartient pas.' })
      }

      const dataUrl = req.body?.dataUrl
      if (!dataUrl) {
        setDishPhoto(req.params.id, null)
        return { photo: null }
      }

      const match = /^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/=]+)$/.exec(dataUrl)
      if (!match) return reply.code(400).send({ error: 'Image attendue en JPEG, PNG ou WebP.' })

      const bytes = Buffer.from(match[2], 'base64')
      if (bytes.length > config.maxPhotoBytes) {
        return reply.code(413).send({ error: 'Image trop lourde.' })
      }

      const ext = match[1] === 'jpeg' ? 'jpg' : match[1]
      const file = `${randomUUID()}.${ext}`
      await writeFile(join(config.uploadDir, file), bytes)

      const url = `/uploads/${file}`
      setDishPhoto(req.params.id, url)
      return { photo: url }
    },
  )

  // --- Ménage périodique des sessions expirées ---
  const timer = setInterval(() => purgeExpiredSessions(), 3600_000)
  timer.unref()

  app.setNotFoundHandler((req, reply) => {
    if (req.url.startsWith('/api/')) return reply.code(404).send({ error: 'Route inconnue.' })
    return reply.code(404).send({ error: 'Not found' })
  })

  return app
}
