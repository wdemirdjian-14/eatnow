import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import {
  INCLUDED_LANGS,
  type AppState, type Category, type Dish, type DishOptionGroup, type FixedMenu,
  type I18nField, type Lang, type Restaurant, type SelectionLine,
  type Session,
} from '../types'
import { autoTranslate, field } from '../lib/translate'
import { uid, slugify } from '../lib/format'
import { ApiError, api, type SessionUser } from '../lib/api'

/**
 * Miroir hors connexion de l'annuaire.
 *
 * La source de vérité est le serveur. Cette copie locale ne sert qu'à afficher
 * quelque chose quand le réseau manque — cas courant en salle de restaurant.
 */
const CACHE_KEY = 'eatnow.cache.v2'
const LANG_KEY = 'eatnow.lang.v1'
const SEL_KEY = 'eatnow.selection.v1'

/** Délai avant envoi des modifications, pour regrouper les frappes clavier. */
const PUSH_DELAY = 700

/** Prix mensuel d'une langue supplémentaire, par plan. */
export const LANG_PRICE: Record<Restaurant['plan'], number> = { essai: 12, starter: 12, pro: 9 }

/** Langues publiées pour un restaurant : incluses + achetées. */
export function activeLangs(r: Restaurant): Lang[] {
  return [...new Set([r.sourceLang, ...INCLUDED_LANGS, ...r.purchasedLangs])] as Lang[]
}

/** Applique la traduction automatique sur un champ, sans écraser les forçages. */
function withAuto(f: I18nField, sourceLang: Lang, langs: Lang[]): I18nField {
  const auto: I18nField['auto'] = {}
  for (const l of langs) {
    if (l === sourceLang) continue
    auto[l] = autoTranslate(f.source, sourceLang, l).text
  }
  return { ...f, auto }
}

/**
 * Cible d'un forçage manuel de traduction. Pour les options, `id` porte
 * l'identifiant du groupe ou du choix, qui est unique dans toute la base.
 */
export type ManualTarget =
  | 'restaurant-desc' | 'category'
  | 'dish-name' | 'dish-desc'
  | 'menu-name' | 'menu-desc'
  | 'option-group' | 'option-choice'

/** Applique une transformation de champ à tous les textes d'un plat, options comprises. */
function mapDishFields(d: Dish, go: (f: I18nField) => I18nField): Dish {
  return {
    ...d,
    name: go(d.name),
    description: go(d.description),
    options: d.options.map((g) => ({
      ...g,
      name: go(g.name),
      choices: g.choices.map((c) => ({ ...c, label: go(c.label) })),
    })),
  }
}

interface Store {
  state: AppState
  session: Session
  /** Langue d'affichage du site public. */
  lang: Lang
  setLang: (l: Lang) => void

  /** Chargement initial terminé (succès ou repli sur le cache). */
  ready: boolean
  /** État de l'enregistrement des modifications sur le serveur. */
  syncStatus: SyncStatus
  /** Recharge l'annuaire depuis le serveur. */
  reload: () => Promise<void>

  loginOwner: (email: string, password: string) => Promise<string | null>
  loginAdmin: (login: string, password: string) => Promise<string | null>
  logout: () => Promise<void>

  currentOwner: () => { owner: AppState['owners'][number]; restaurant: Restaurant } | null
  /** Vrai quand un administrateur agit au nom d'un restaurateur. */
  isImpersonating: boolean
  impersonate: (ownerId: string) => Promise<void>
  stopImpersonating: () => Promise<void>

  updateRestaurant: (id: string, patch: Partial<Restaurant>) => void
  setRestaurantField: (id: string, key: 'description', source: string) => void

  addCategory: (restaurantId: string, name: string) => void
  updateCategory: (id: string, patch: Partial<Category> & { source?: string }) => void
  removeCategory: (id: string) => void
  moveCategory: (id: string, dir: -1 | 1) => void

  addDish: (restaurantId: string, categoryId: string) => string
  updateDish: (id: string, patch: Partial<Dish> & { nameSource?: string; descSource?: string }) => void
  removeDish: (id: string) => void

  setDishPhoto: (id: string, photo: string | undefined) => Promise<void>
  addOptionGroup: (dishId: string, name: string) => void
  updateOptionGroup: (dishId: string, groupId: string, patch: { source?: string; required?: boolean; multiple?: boolean }) => void
  removeOptionGroup: (dishId: string, groupId: string) => void
  addOptionChoice: (dishId: string, groupId: string, label: string) => void
  updateOptionChoice: (dishId: string, groupId: string, choiceId: string, patch: { source?: string; priceDelta?: number }) => void
  removeOptionChoice: (dishId: string, groupId: string, choiceId: string) => void

  addMenu: (restaurantId: string) => string
  updateMenu: (id: string, patch: Partial<FixedMenu> & { nameSource?: string; descSource?: string }) => void
  removeMenu: (id: string) => void

  /** Force (ou efface) une traduction manuelle sur une entité. */
  setManual: (entity: ManualTarget, id: string, lang: Lang, value: string) => void
  /** Relance la traduction automatique sur toute la carte d'un restaurant. */
  retranslate: (restaurantId: string) => void
  purchaseLang: (restaurantId: string, lang: Lang) => Promise<string | null>

  /** Sélection du client, en cours de constitution sur une carte. */
  selection: SelectionLine[]
  addToSelection: (dishId: string, restaurantId: string, choiceIds: string[], qty?: number) => void
  setSelectionQty: (lineId: string, qty: number) => void
  removeFromSelection: (lineId: string) => void
  clearSelection: () => void

}

export type SyncStatus =
  | { kind: 'idle' }
  | { kind: 'saving' }
  /** Modifications conservées localement, en attente de réseau. */
  | { kind: 'offline'; pending: number }
  | { kind: 'error'; message: string }

const Ctx = createContext<Store | null>(null)

function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

const EMPTY_STATE: AppState = {
  restaurants: [], categories: [], dishes: [], menus: [], owners: [], purchases: [],
}

/**
 * Convertit l'utilisateur renvoyé par l'API en session utilisable par l'app.
 *
 * Pendant un endossement, l'API décrit le compte *endossé* — donc de rôle
 * `owner` — et place le titulaire réel dans `realUser`. L'endossement doit
 * donc être testé en premier : le tester après le rôle ferait passer un
 * administrateur pour un simple restaurateur, sans bandeau ni retour possible
 * vers la console.
 */
function toSession(user: SessionUser | null): Session {
  if (!user) return { role: 'guest' }
  if (user.impersonating && user.realUser) {
    return { role: 'admin', login: user.realUser.login, impersonating: user.id }
  }
  if (user.role === 'owner') return { role: 'owner', ownerId: user.id }
  return { role: 'admin', login: user.login }
}

interface Changes { profile: Set<string>; menu: Set<string> }

/**
 * Repère les restaurants touchés par une mutation.
 *
 * Toutes les mutations du store sont immuables : seuls les objets réellement
 * modifiés changent d'identité. Une comparaison de références suffit donc, et
 * évite d'annoter chaque action — un oubli signifierait une modification
 * jamais enregistrée.
 */
function diffRestaurants(prev: AppState, next: AppState): Changes {
  const profile = new Set<string>()
  const menu = new Set<string>()

  const before = new Map(prev.restaurants.map((r) => [r.id, r] as const))
  for (const r of next.restaurants) if (before.get(r.id) !== r) profile.add(r.id)

  const scan = <T extends { id: string; restaurantId: string }>(a: T[], b: T[]) => {
    const seen = new Map(a.map((x) => [x.id, x] as const))
    for (const x of b) if (seen.get(x.id) !== x) menu.add(x.restaurantId)
    const kept = new Set(b.map((x) => x.id))
    for (const x of a) if (!kept.has(x.id)) menu.add(x.restaurantId)
  }
  scan(prev.categories, next.categories)
  scan(prev.dishes, next.dishes)
  scan(prev.menus, next.menus)

  return { profile, menu }
}


export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState>(EMPTY_STATE)
  const [session, setSession] = useState<Session>({ role: 'guest' })
  const [ready, setReady] = useState(false)
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({ kind: 'idle' })
  const [lang, setLangState] = useState<Lang>(() => load<Lang>(LANG_KEY, 'fr'))
  const [selection, setSelection] = useState<SelectionLine[]>(() => load<SelectionLine[]>(SEL_KEY, []))

  /** État courant, lisible depuis les envois différés sans capture périmée. */
  const stateRef = useRef(state)
  stateRef.current = state

  /** Restaurants modifiés localement et pas encore enregistrés. */
  const dirty = useRef(new Map<string, { profile: boolean; menu: boolean }>())
  const pushTimer = useRef<number | null>(null)

  useEffect(() => {
    try { localStorage.setItem(SEL_KEY, JSON.stringify(selection)) } catch { /* quota */ }
  }, [selection])

  /** Enregistre le miroir hors connexion (annuaire seul, sans données privées). */
  const cacheLocally = useCallback((s: AppState) => {
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify({
        restaurants: s.restaurants, categories: s.categories, dishes: s.dishes, menus: s.menus,
      }))
    } catch { /* quota dépassé : le mode hors ligne sera simplement indisponible */ }
  }, [])

  /**
   * Envoie au serveur les restaurants modifiés.
   *
   * On pousse la fiche et la carte entières plutôt qu'un différentiel : c'est
   * idempotent, insensible à l'ordre des modifications, et le volume reste
   * négligeable à l'échelle d'une carte de restaurant.
   */
  const flush = useCallback(async () => {
    if (dirty.current.size === 0) return
    const batch = new Map(dirty.current)
    dirty.current.clear()
    setSyncStatus({ kind: 'saving' })

    const failed = new Map<string, { profile: boolean; menu: boolean }>()
    let lastError: string | null = null
    let offline = false

    for (const [rid, what] of batch) {
      const s = stateRef.current
      const r = s.restaurants.find((x) => x.id === rid)
      if (!r) continue
      try {
        if (what.profile) {
          const { purchasedLangs: _skip, ...profile } = r
          await api.updateRestaurant(rid, profile)
        }
        if (what.menu) {
          await api.replaceMenu(rid, {
            categories: s.categories.filter((c) => c.restaurantId === rid),
            dishes: s.dishes.filter((d) => d.restaurantId === rid),
            menus: s.menus.filter((m) => m.restaurantId === rid),
          })
        }
      } catch (err) {
        failed.set(rid, what)
        if (err instanceof ApiError && err.status === 0) offline = true
        else lastError = err instanceof Error ? err.message : 'Enregistrement impossible.'
      }
    }

    // Les modifications non enregistrées restent en attente : rien n'est perdu.
    for (const [rid, what] of failed) {
      const prev = dirty.current.get(rid)
      dirty.current.set(rid, {
        profile: what.profile || !!prev?.profile,
        menu: what.menu || !!prev?.menu,
      })
    }

    if (failed.size === 0) setSyncStatus({ kind: 'idle' })
    else if (offline) setSyncStatus({ kind: 'offline', pending: failed.size })
    else setSyncStatus({ kind: 'error', message: lastError ?? 'Enregistrement impossible.' })
  }, [])

  const markDirty = useCallback((restaurantId: string, what: 'profile' | 'menu') => {
    const prev = dirty.current.get(restaurantId) ?? { profile: false, menu: false }
    dirty.current.set(restaurantId, { ...prev, [what]: true })
    if (pushTimer.current !== null) window.clearTimeout(pushTimer.current)
    pushTimer.current = window.setTimeout(() => { void flush() }, PUSH_DELAY)
  }, [flush])

  /** Recharge l'annuaire et, si une session existe, ses données privées. */
  const reload = useCallback(async () => {
    try {
      const [pub, user] = await Promise.all([api.publicState(), api.me()])
      let priv = { owners: [], purchases: [] } as Pick<AppState, 'owners' | 'purchases'>
      if (user.user) priv = await api.sessionState()
      const next: AppState = { ...pub, ...priv }
      setState(next)
      setSession(toSession(user.user))
      cacheLocally(next)
      setSyncStatus((cur) => (cur.kind === 'offline' ? { kind: 'idle' } : cur))
    } catch {
      // Serveur injoignable : on repart du miroir local s'il existe.
      const cached = load<Pick<AppState, 'restaurants' | 'categories' | 'dishes' | 'menus'> | null>(
        CACHE_KEY, null,
      )
      if (cached) setState({ ...cached, owners: [], purchases: [] })
      setSyncStatus({ kind: 'offline', pending: dirty.current.size })
    } finally {
      setReady(true)
    }
  }, [cacheLocally])

  useEffect(() => { void reload() }, [reload])

  // Retente l'enregistrement dès le retour du réseau.
  useEffect(() => {
    const retry = () => { if (dirty.current.size > 0) void flush() }
    window.addEventListener('online', retry)
    return () => window.removeEventListener('online', retry)
  }, [flush])

  // Prévient avant de fermer l'onglet s'il reste des modifications en attente.
  useEffect(() => {
    const guard = (e: BeforeUnloadEvent) => {
      if (dirty.current.size > 0) e.preventDefault()
    }
    window.addEventListener('beforeunload', guard)
    return () => window.removeEventListener('beforeunload', guard)
  }, [])

  const setLang = useCallback((l: Lang) => {
    setLangState(l)
    try { localStorage.setItem(LANG_KEY, JSON.stringify(l)) } catch { /* quota */ }
  }, [])

  /** Retraduit un champ dans le contexte d'un restaurant. */
  const retranslateField = useCallback(
    (s: AppState, restaurantId: string, f: I18nField): I18nField => {
      const r = s.restaurants.find((x) => x.id === restaurantId)
      if (!r) return f
      return withAuto(f, r.sourceLang, activeLangs(r))
    },
    [],
  )

  const store = useMemo<Store>(() => {
    const patchState = (fn: (s: AppState) => AppState) =>
      setState((s) => {
        const next = fn(s)
        if (next === s) return s
        // `markDirty` est idempotent : la double exécution des mises à jour en
        // mode strict n'a pas d'effet observable.
        const { profile, menu } = diffRestaurants(s, next)
        for (const rid of profile) markDirty(rid, 'profile')
        for (const rid of menu) markDirty(rid, 'menu')
        return next
      })

    return {
      state,
      session,
      ready,
      syncStatus,
      reload,
      lang,
      setLang,

      async loginOwner(email, password) {
        try {
          const { user } = await api.login(email, password)
          if (user.role !== 'owner') {
            await api.logout()
            return 'Ce compte n’est pas un compte restaurateur.'
          }
          setSession(toSession(user))
          await reload()
          return null
        } catch (err) {
          return err instanceof ApiError && err.status === 0
            ? 'Serveur injoignable. Vérifiez votre connexion.'
            : 'Identifiants incorrects.'
        }
      },

      async loginAdmin(login, password) {
        try {
          const { user } = await api.login(login, password)
          if (user.role !== 'admin') {
            await api.logout()
            return 'Ce compte n’est pas un compte administrateur.'
          }
          setSession(toSession(user))
          await reload()
          return null
        } catch (err) {
          return err instanceof ApiError && err.status === 0
            ? 'Serveur injoignable. Vérifiez votre connexion.'
            : 'Identifiants administrateur incorrects.'
        }
      },

      async logout() {
        // Les modifications en attente partent avant de perdre la session.
        await flush().catch(() => {})
        await api.logout().catch(() => {})
        setSession({ role: 'guest' })
        await reload()
      },

      currentOwner() {
        // Un restaurateur voit son espace ; un admin voit celui qu'il a endossé.
        const ownerId =
          session.role === 'owner' ? session.ownerId
          : session.role === 'admin' ? session.impersonating
          : undefined
        if (!ownerId) return null
        const owner = state.owners.find((o) => o.id === ownerId)
        if (!owner) return null
        const restaurant = state.restaurants.find((r) => r.id === owner.restaurantId)
        if (!restaurant) return null
        return { owner, restaurant }
      },

      isImpersonating: session.role === 'admin' && !!session.impersonating,

      async impersonate(ownerId) {
        const { user } = await api.impersonate(ownerId)
        setSession(toSession(user))
        await reload()
      },

      async stopImpersonating() {
        await flush().catch(() => {})
        const { user } = await api.stopImpersonating()
        setSession(toSession(user))
        await reload()
      },

      updateRestaurant(id, patch) {
        patchState((s) => ({
          ...s,
          restaurants: s.restaurants.map((r) =>
            r.id === id ? { ...r, ...patch, slug: patch.name ? slugify(patch.name) : r.slug } : r,
          ),
        }))
      },

      setRestaurantField(id, _key, source) {
        patchState((s) => ({
          ...s,
          restaurants: s.restaurants.map((r) =>
            r.id === id
              ? { ...r, description: retranslateField(s, id, { ...r.description, source }) }
              : r,
          ),
        }))
      },

      addCategory(restaurantId, name) {
        patchState((s) => ({
          ...s,
          categories: [
            ...s.categories,
            {
              id: uid('cat'), restaurantId,
              name: retranslateField(s, restaurantId, field(name)),
              order: s.categories.filter((c) => c.restaurantId === restaurantId).length,
            },
          ],
        }))
      },

      updateCategory(id, patch) {
        patchState((s) => ({
          ...s,
          categories: s.categories.map((c) => {
            if (c.id !== id) return c
            const name = patch.source !== undefined
              ? retranslateField(s, c.restaurantId, { ...c.name, source: patch.source })
              : (patch.name ?? c.name)
            return { ...c, ...patch, name }
          }),
        }))
      },

      removeCategory(id) {
        patchState((s) => ({
          ...s,
          categories: s.categories.filter((c) => c.id !== id),
          dishes: s.dishes.filter((d) => d.categoryId !== id),
        }))
      },

      moveCategory(id, dir) {
        patchState((s) => {
          const cat = s.categories.find((c) => c.id === id)
          if (!cat) return s
          const siblings = s.categories
            .filter((c) => c.restaurantId === cat.restaurantId)
            .sort((a, b) => a.order - b.order)
          const i = siblings.findIndex((c) => c.id === id)
          const j = i + dir
          if (j < 0 || j >= siblings.length) return s
          const swapped = siblings.map((c, k) =>
            k === i ? { ...c, order: j } : k === j ? { ...c, order: i } : c,
          )
          const byId = new Map(swapped.map((c) => [c.id, c] as const))
          return { ...s, categories: s.categories.map((c) => byId.get(c.id) ?? c) }
        })
      },

      addDish(restaurantId, categoryId) {
        const id = uid('dish')
        patchState((s) => ({
          ...s,
          dishes: [
            ...s.dishes,
            {
              id, restaurantId, categoryId,
              name: field('Nouveau plat'), description: field(''),
              price: 0, allergens: [], tags: [], available: true, dishOfDay: false, options: [],
              order: s.dishes.filter((d) => d.categoryId === categoryId).length,
            },
          ],
        }))
        return id
      },

      updateDish(id, patch) {
        patchState((s) => ({
          ...s,
          dishes: s.dishes.map((d) => {
            if (d.id !== id) return d
            const next: Dish = { ...d, ...patch }
            if (patch.nameSource !== undefined) {
              next.name = retranslateField(s, d.restaurantId, { ...d.name, source: patch.nameSource })
            }
            if (patch.descSource !== undefined) {
              next.description = retranslateField(s, d.restaurantId, {
                ...d.description, source: patch.descSource,
              })
            }
            delete (next as Partial<Dish> & { nameSource?: string }).nameSource
            delete (next as Partial<Dish> & { descSource?: string }).descSource
            return next
          }),
        }))
      },

      async setDishPhoto(id, photo) {
        // Le serveur écrit le fichier et renvoie son URL : la carte ne
        // transporte plus l'image elle-même, seulement un lien.
        const { photo: url } = await api.setDishPhoto(id, photo ?? null)
        setState((s) => ({
          ...s,
          dishes: s.dishes.map((d) => (d.id === id ? { ...d, photo: url ?? undefined } : d)),
        }))
      },

      addOptionGroup(dishId, name) {
        patchState((s) => ({
          ...s,
          dishes: s.dishes.map((d) => {
            if (d.id !== dishId) return d
            const group: DishOptionGroup = {
              id: uid('grp'),
              name: retranslateField(s, d.restaurantId, field(name)),
              required: false, multiple: false, choices: [],
            }
            return { ...d, options: [...d.options, group] }
          }),
        }))
      },

      updateOptionGroup(dishId, groupId, patch) {
        patchState((s) => ({
          ...s,
          dishes: s.dishes.map((d) => {
            if (d.id !== dishId) return d
            return {
              ...d,
              options: d.options.map((g) => {
                if (g.id !== groupId) return g
                const name = patch.source !== undefined
                  ? retranslateField(s, d.restaurantId, { ...g.name, source: patch.source })
                  : g.name
                return {
                  ...g, name,
                  required: patch.required ?? g.required,
                  multiple: patch.multiple ?? g.multiple,
                }
              }),
            }
          }),
        }))
      },

      removeOptionGroup(dishId, groupId) {
        patchState((s) => ({
          ...s,
          dishes: s.dishes.map((d) =>
            d.id === dishId ? { ...d, options: d.options.filter((g) => g.id !== groupId) } : d,
          ),
        }))
      },

      addOptionChoice(dishId, groupId, label) {
        patchState((s) => ({
          ...s,
          dishes: s.dishes.map((d) => {
            if (d.id !== dishId) return d
            return {
              ...d,
              options: d.options.map((g) =>
                g.id === groupId
                  ? {
                      ...g,
                      choices: [...g.choices, {
                        id: uid('cho'),
                        label: retranslateField(s, d.restaurantId, field(label)),
                        priceDelta: 0,
                      }],
                    }
                  : g,
              ),
            }
          }),
        }))
      },

      updateOptionChoice(dishId, groupId, choiceId, patch) {
        patchState((s) => ({
          ...s,
          dishes: s.dishes.map((d) => {
            if (d.id !== dishId) return d
            return {
              ...d,
              options: d.options.map((g) => {
                if (g.id !== groupId) return g
                return {
                  ...g,
                  choices: g.choices.map((c) => {
                    if (c.id !== choiceId) return c
                    const label = patch.source !== undefined
                      ? retranslateField(s, d.restaurantId, { ...c.label, source: patch.source })
                      : c.label
                    return { ...c, label, priceDelta: patch.priceDelta ?? c.priceDelta }
                  }),
                }
              }),
            }
          }),
        }))
      },

      removeOptionChoice(dishId, groupId, choiceId) {
        patchState((s) => ({
          ...s,
          dishes: s.dishes.map((d) =>
            d.id === dishId
              ? {
                  ...d,
                  options: d.options.map((g) =>
                    g.id === groupId ? { ...g, choices: g.choices.filter((c) => c.id !== choiceId) } : g,
                  ),
                }
              : d,
          ),
        }))
      },

      removeDish(id) {
        patchState((s) => ({
          ...s,
          dishes: s.dishes.filter((d) => d.id !== id),
          menus: s.menus.map((m) => ({ ...m, dishIds: m.dishIds.filter((x) => x !== id) })),
        }))
      },

      addMenu(restaurantId) {
        const id = uid('menu')
        patchState((s) => ({
          ...s,
          menus: [
            ...s.menus,
            {
              id, restaurantId, name: field('Nouvelle formule'), description: field(''),
              price: 0, dishIds: [],
              order: s.menus.filter((m) => m.restaurantId === restaurantId).length,
            },
          ],
        }))
        return id
      },

      updateMenu(id, patch) {
        patchState((s) => ({
          ...s,
          menus: s.menus.map((m) => {
            if (m.id !== id) return m
            const next: FixedMenu = { ...m, ...patch }
            if (patch.nameSource !== undefined) {
              next.name = retranslateField(s, m.restaurantId, { ...m.name, source: patch.nameSource })
            }
            if (patch.descSource !== undefined) {
              next.description = retranslateField(s, m.restaurantId, {
                ...m.description, source: patch.descSource,
              })
            }
            delete (next as Partial<FixedMenu> & { nameSource?: string }).nameSource
            delete (next as Partial<FixedMenu> & { descSource?: string }).descSource
            return next
          }),
        }))
      },

      removeMenu(id) {
        patchState((s) => ({ ...s, menus: s.menus.filter((m) => m.id !== id) }))
      },

      setManual(entity, id, lang: Lang, value) {
        const apply = (f: I18nField): I18nField => {
          const manual = { ...f.manual }
          if (value.trim()) manual[lang] = value
          else delete manual[lang]
          return { ...f, manual }
        }
        patchState((s) => {
          switch (entity) {
            case 'restaurant-desc':
              return { ...s, restaurants: s.restaurants.map((r) => (r.id === id ? { ...r, description: apply(r.description) } : r)) }
            case 'category':
              return { ...s, categories: s.categories.map((c) => (c.id === id ? { ...c, name: apply(c.name) } : c)) }
            case 'dish-name':
              return { ...s, dishes: s.dishes.map((d) => (d.id === id ? { ...d, name: apply(d.name) } : d)) }
            case 'dish-desc':
              return { ...s, dishes: s.dishes.map((d) => (d.id === id ? { ...d, description: apply(d.description) } : d)) }
            case 'menu-name':
              return { ...s, menus: s.menus.map((m) => (m.id === id ? { ...m, name: apply(m.name) } : m)) }
            case 'menu-desc':
              return { ...s, menus: s.menus.map((m) => (m.id === id ? { ...m, description: apply(m.description) } : m)) }
            case 'option-group':
              return {
                ...s,
                dishes: s.dishes.map((d) => ({
                  ...d,
                  options: d.options.map((g) => (g.id === id ? { ...g, name: apply(g.name) } : g)),
                })),
              }
            case 'option-choice':
              return {
                ...s,
                dishes: s.dishes.map((d) => ({
                  ...d,
                  options: d.options.map((g) => ({
                    ...g,
                    choices: g.choices.map((c) => (c.id === id ? { ...c, label: apply(c.label) } : c)),
                  })),
                })),
              }
          }
        })
      },

      retranslate(restaurantId) {
        patchState((s) => {
          const r = s.restaurants.find((x) => x.id === restaurantId)
          if (!r) return s
          const langs = activeLangs(r)
          const go = (f: I18nField) => withAuto(f, r.sourceLang, langs)
          return {
            ...s,
            restaurants: s.restaurants.map((x) => (x.id === r.id ? { ...x, description: go(x.description) } : x)),
            categories: s.categories.map((c) => (c.restaurantId === r.id ? { ...c, name: go(c.name) } : c)),
            dishes: s.dishes.map((d) => (d.restaurantId === r.id ? mapDishFields(d, go) : d)),
            menus: s.menus.map((m) =>
              m.restaurantId === r.id ? { ...m, name: go(m.name), description: go(m.description) } : m,
            ),
          }
        })
      },

      async purchaseLang(restaurantId, l) {
        try {
          // Le serveur fixe le prix et refuse les doublons : le client ne fait
          // qu'appliquer le résultat.
          const { alreadyOwned, restaurant } = await api.purchaseLang(restaurantId, l)
          if (alreadyOwned) return null

          setState((s) => {
            const langs = activeLangs(restaurant)
            const go = (f: I18nField) => withAuto(f, restaurant.sourceLang, langs)
            return {
              ...s,
              restaurants: s.restaurants.map((x) =>
                x.id === restaurantId ? { ...restaurant, description: go(restaurant.description) } : x,
              ),
              categories: s.categories.map((c) =>
                c.restaurantId === restaurantId ? { ...c, name: go(c.name) } : c,
              ),
              dishes: s.dishes.map((d) => (d.restaurantId === restaurantId ? mapDishFields(d, go) : d)),
              menus: s.menus.map((m) =>
                m.restaurantId === restaurantId
                  ? { ...m, name: go(m.name), description: go(m.description) }
                  : m,
              ),
            }
          })
          // Les traductions fraîchement calculées doivent rejoindre le serveur.
          markDirty(restaurantId, 'menu')
          await api.sessionState().then((priv) => setState((s) => ({ ...s, ...priv }))).catch(() => {})
          return null
        } catch (err) {
          return err instanceof Error ? err.message : 'Achat impossible.'
        }
      },

      selection,

      addToSelection(dishId, restaurantId, choiceIds, qty = 1) {
        setSelection((cur) => {
          // La sélection porte sur une seule carte à la fois.
          const base = cur.length && cur[0].restaurantId !== restaurantId ? [] : cur
          const key = [...choiceIds].sort().join('|')
          const existing = base.find(
            (l) => l.dishId === dishId && [...l.choiceIds].sort().join('|') === key,
          )
          if (existing) {
            return base.map((l) => (l.id === existing.id ? { ...l, qty: l.qty + qty } : l))
          }
          return [...base, { id: uid('sel'), restaurantId, dishId, choiceIds, qty }]
        })
      },

      setSelectionQty(lineId, qty) {
        setSelection((cur) =>
          qty <= 0 ? cur.filter((l) => l.id !== lineId) : cur.map((l) => (l.id === lineId ? { ...l, qty } : l)),
        )
      },

      removeFromSelection(lineId) {
        setSelection((cur) => cur.filter((l) => l.id !== lineId))
      },

      clearSelection() { setSelection([]) },

    }
  }, [
    state, session, ready, syncStatus, lang, setLang, selection,
    retranslateField, markDirty, flush, reload,
  ])

  return <Ctx.Provider value={store}>{children}</Ctx.Provider>
}

export function useStore(): Store {
  const v = useContext(Ctx)
  if (!v) throw new Error('useStore doit être utilisé dans <StoreProvider>')
  return v
}
