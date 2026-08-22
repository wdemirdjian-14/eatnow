import { randomUUID } from 'node:crypto'
import { db } from './db.js'

/**
 * Traduction entre les lignes SQLite et les objets attendus par le client.
 *
 * Les champs multilingues et les listes sont stockés en JSON : ils sont
 * toujours lus et écrits en bloc, et SQLite n'a pas besoin de les indexer.
 */

const json = <T>(raw: string, fallback: T): T => {
  try { return JSON.parse(raw) as T } catch { return fallback }
}

export interface RestaurantDTO {
  id: string; slug: string; ownerId: string; name: string
  description: unknown; cuisines: unknown; priceRange: number
  address: string; postalCode: string; city: string
  lat: number; lng: number; phone: string; website?: string
  emoji: string; hue: number; rating: number; reviews: number; hours: string
  sourceLang: string; purchasedLangs: unknown; published: boolean
  plan: string; createdAt: string; photo?: string
}

interface RestaurantRow {
  id: string; slug: string; owner_id: string | null; name: string
  description: string; cuisines: string; price_range: number
  address: string; postal_code: string; city: string
  lat: number; lng: number; phone: string; website: string | null
  emoji: string; hue: number; rating: number; reviews: number; hours: string
  source_lang: string; purchased_langs: string; published: number
  plan: string; created_at: string; photo: string | null
}

function toRestaurant(r: RestaurantRow): RestaurantDTO {
  return {
    id: r.id, slug: r.slug, ownerId: r.owner_id ?? '', name: r.name,
    description: json(r.description, {}), cuisines: json(r.cuisines, []),
    priceRange: r.price_range, address: r.address, postalCode: r.postal_code,
    city: r.city, lat: r.lat, lng: r.lng, phone: r.phone,
    website: r.website ?? undefined, emoji: r.emoji, hue: r.hue,
    rating: r.rating, reviews: r.reviews, hours: r.hours,
    sourceLang: r.source_lang, purchasedLangs: json(r.purchased_langs, []),
    published: !!r.published, plan: r.plan, createdAt: r.created_at,
    photo: r.photo ?? undefined,
  }
}

export function listRestaurants(): RestaurantDTO[] {
  return db.prepare<[], RestaurantRow>('SELECT * FROM restaurants ORDER BY name').all().map(toRestaurant)
}

export function getRestaurant(id: string): RestaurantDTO | undefined {
  const row = db.prepare<[string], RestaurantRow>('SELECT * FROM restaurants WHERE id = ?').get(id)
  return row ? toRestaurant(row) : undefined
}

export function listCategories(): unknown[] {
  return db
    .prepare<[], { id: string; restaurant_id: string; name: string; sort_order: number }>(
      'SELECT * FROM categories ORDER BY restaurant_id, sort_order',
    )
    .all()
    .map((c) => ({ id: c.id, restaurantId: c.restaurant_id, name: json(c.name, {}), order: c.sort_order }))
}

export function listDishes(): unknown[] {
  return db
    .prepare<[], {
      id: string; restaurant_id: string; category_id: string; name: string; description: string
      price: number; promo_price: number | null; allergens: string; tags: string
      available: number; dish_of_day: number; sort_order: number; photo: string | null; options: string
    }>('SELECT * FROM dishes ORDER BY restaurant_id, sort_order')
    .all()
    .map((d) => ({
      id: d.id, restaurantId: d.restaurant_id, categoryId: d.category_id,
      name: json(d.name, {}), description: json(d.description, {}),
      price: d.price, promoPrice: d.promo_price ?? undefined,
      allergens: json(d.allergens, []), tags: json(d.tags, []),
      available: !!d.available, dishOfDay: !!d.dish_of_day, order: d.sort_order,
      photo: d.photo ?? undefined, options: json(d.options, []),
    }))
}

export function listMenus(): unknown[] {
  return db
    .prepare<[], {
      id: string; restaurant_id: string; name: string; description: string
      price: number; dish_ids: string; sort_order: number
    }>('SELECT * FROM menus ORDER BY restaurant_id, sort_order')
    .all()
    .map((m) => ({
      id: m.id, restaurantId: m.restaurant_id, name: json(m.name, {}),
      description: json(m.description, {}), price: m.price,
      dishIds: json(m.dish_ids, []), order: m.sort_order,
    }))
}

/**
 * Comptes restaurateurs.
 *
 * Aucune empreinte de mot de passe n'en sort : la console d'administration
 * affiche l'identifiant de connexion et l'activité du compte, jamais de quoi
 * se faire passer pour lui.
 */
export function listOwners(): unknown[] {
  return db
    .prepare<[], {
      id: string; name: string; login: string; restaurant_id: string | null
      created_at: string; last_login_at: string | null
    }>(
      `SELECT id, name, login, restaurant_id, created_at, last_login_at
       FROM users WHERE role = 'owner' ORDER BY name`,
    )
    .all()
    .map((o) => ({
      id: o.id, name: o.name, email: o.login, restaurantId: o.restaurant_id ?? '',
      createdAt: o.created_at, lastLoginAt: o.last_login_at ?? undefined,
    }))
}

export function listPurchases(restaurantId?: string): unknown[] {
  const rows = restaurantId
    ? db.prepare('SELECT * FROM purchases WHERE restaurant_id = ? ORDER BY date').all(restaurantId)
    : db.prepare('SELECT * FROM purchases ORDER BY date').all()
  return (rows as { id: string; restaurant_id: string; lang: string; amount: number; date: string }[]).map(
    (p) => ({ id: p.id, restaurantId: p.restaurant_id, lang: p.lang, amount: p.amount, date: p.date }),
  )
}

/** Champs du profil qu'un restaurateur peut modifier. */
const PROFILE_FIELDS: Record<string, string> = {
  name: 'name', description: 'description', cuisines: 'cuisines', priceRange: 'price_range',
  address: 'address', postalCode: 'postal_code', city: 'city', lat: 'lat', lng: 'lng',
  phone: 'phone', website: 'website', emoji: 'emoji', hue: 'hue', hours: 'hours',
  published: 'published', plan: 'plan', slug: 'slug', purchasedLangs: 'purchased_langs',
}

const JSON_FIELDS = new Set(['description', 'cuisines', 'purchasedLangs'])
const BOOL_FIELDS = new Set(['published'])

export function updateRestaurant(id: string, patch: Record<string, unknown>): void {
  const sets: string[] = []
  const values: unknown[] = []
  for (const [key, column] of Object.entries(PROFILE_FIELDS)) {
    if (!(key in patch)) continue
    let value = patch[key]
    if (JSON_FIELDS.has(key)) value = JSON.stringify(value ?? null)
    else if (BOOL_FIELDS.has(key)) value = value ? 1 : 0
    sets.push(`${column} = ?`)
    values.push(value as never)
  }
  if (!sets.length) return
  sets.push("updated_at = datetime('now')")
  db.prepare(`UPDATE restaurants SET ${sets.join(', ')} WHERE id = ?`).run(...values, id)
}

export interface MenuPayload {
  categories: { id: string; name: unknown; order: number }[]
  dishes: {
    id: string; categoryId: string; name: unknown; description: unknown
    price: number; promoPrice?: number | null; allergens: unknown; tags: unknown
    available: boolean; dishOfDay: boolean; order: number; photo?: string | null; options: unknown
  }[]
  menus: { id: string; name: unknown; description: unknown; price: number; dishIds: unknown; order: number }[]
}

/**
 * Remplace toute la carte d'un restaurant en une transaction.
 *
 * L'éditeur du restaurateur manipule la carte entière en mémoire ; la
 * remplacer d'un bloc évite une douzaine d'endpoints et garantit qu'on ne
 * peut jamais observer un état intermédiaire (un plat sans sa catégorie).
 */
export const replaceMenu = db.transaction((restaurantId: string, payload: MenuPayload) => {
  db.prepare('DELETE FROM menus WHERE restaurant_id = ?').run(restaurantId)
  db.prepare('DELETE FROM dishes WHERE restaurant_id = ?').run(restaurantId)
  db.prepare('DELETE FROM categories WHERE restaurant_id = ?').run(restaurantId)

  const insertCat = db.prepare(
    'INSERT INTO categories (id, restaurant_id, name, sort_order) VALUES (?, ?, ?, ?)',
  )
  const known = new Set<string>()
  for (const [i, c] of payload.categories.entries()) {
    const id = c.id || randomUUID()
    known.add(id)
    insertCat.run(id, restaurantId, JSON.stringify(c.name ?? {}), c.order ?? i)
  }

  const insertDish = db.prepare(
    `INSERT INTO dishes (id, restaurant_id, category_id, name, description, price, promo_price,
                         allergens, tags, available, dish_of_day, sort_order, photo, options)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  )
  for (const [i, d] of payload.dishes.entries()) {
    // Un plat orphelin casserait la contrainte de clé étrangère : on l'ignore.
    if (!known.has(d.categoryId)) continue
    insertDish.run(
      d.id || randomUUID(), restaurantId, d.categoryId,
      JSON.stringify(d.name ?? {}), JSON.stringify(d.description ?? {}),
      Number(d.price) || 0,
      d.promoPrice === undefined || d.promoPrice === null ? null : Number(d.promoPrice),
      JSON.stringify(d.allergens ?? []), JSON.stringify(d.tags ?? []),
      d.available ? 1 : 0, d.dishOfDay ? 1 : 0, d.order ?? i,
      d.photo ?? null, JSON.stringify(d.options ?? []),
    )
  }

  const insertMenu = db.prepare(
    `INSERT INTO menus (id, restaurant_id, name, description, price, dish_ids, sort_order)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
  )
  for (const [i, m] of payload.menus.entries()) {
    insertMenu.run(
      m.id || randomUUID(), restaurantId,
      JSON.stringify(m.name ?? {}), JSON.stringify(m.description ?? {}),
      Number(m.price) || 0, JSON.stringify(m.dishIds ?? []), m.order ?? i,
    )
  }

  db.prepare("UPDATE restaurants SET updated_at = datetime('now') WHERE id = ?").run(restaurantId)
})

/** Enregistre l'achat d'une langue et l'ajoute aux langues publiées. */
export const purchaseLanguage = db.transaction(
  (restaurantId: string, lang: string, amount: number) => {
    const row = db
      .prepare<[string], { purchased_langs: string }>(
        'SELECT purchased_langs FROM restaurants WHERE id = ?',
      )
      .get(restaurantId)
    if (!row) throw new Error('restaurant introuvable')

    const langs = json<string[]>(row.purchased_langs, [])
    if (langs.includes(lang)) return { alreadyOwned: true }

    langs.push(lang)
    db.prepare("UPDATE restaurants SET purchased_langs = ?, updated_at = datetime('now') WHERE id = ?")
      .run(JSON.stringify(langs), restaurantId)
    db.prepare('INSERT INTO purchases (id, restaurant_id, lang, amount) VALUES (?, ?, ?, ?)')
      .run(randomUUID(), restaurantId, lang, amount)
    return { alreadyOwned: false }
  },
)

/** Rend un identifiant d'URL unique en le suffixant si besoin. */
export function uniqueSlug(base: string): string {
  const taken = (slug: string) =>
    !!db.prepare<[string], { n: number }>('SELECT COUNT(*) AS n FROM restaurants WHERE slug = ?')
      .get(slug)?.n
  if (!taken(base)) return base
  for (let i = 2; i < 500; i++) {
    if (!taken(`${base}-${i}`)) return `${base}-${i}`
  }
  return `${base}-${Date.now()}`
}

export function loginExists(login: string): boolean {
  return !!db
    .prepare<[string], { n: number }>('SELECT COUNT(*) AS n FROM users WHERE login = ? COLLATE NOCASE')
    .get(login)?.n
}

export interface NewRestaurantInput {
  restaurant: {
    name: string; slug: string; city: string; address: string; postalCode: string
    lat: number; lng: number; phone: string; website?: string
    cuisines: string[]; priceRange: number; emoji: string; hue: number
    hours: string; plan: string; sourceLang: string
  }
  owner: { id: string; name: string; login: string; hash: string; salt: string }
  /** Catégories créées d'emblée, pour que la carte ne soit pas vide. */
  categories: string[]
}

/**
 * Crée un restaurant et son compte restaurateur en une transaction.
 *
 * Les deux vont ensemble : un restaurant sans compte serait inadministrable,
 * un compte sans restaurant renverrait son titulaire sur un espace vide.
 */
export const createRestaurantWithOwner = db.transaction((input: NewRestaurantInput) => {
  const restaurantId = randomUUID()
  const r = input.restaurant

  db.prepare(
    `INSERT INTO users (id, login, name, role, password_hash, password_salt, restaurant_id)
     VALUES (?, ?, ?, 'owner', ?, ?, ?)`,
  ).run(input.owner.id, input.owner.login, input.owner.name, input.owner.hash, input.owner.salt, restaurantId)

  db.prepare(
    `INSERT INTO restaurants (id, slug, owner_id, name, description, cuisines, price_range,
       address, postal_code, city, lat, lng, phone, website, emoji, hue, rating, reviews,
       hours, source_lang, purchased_langs, published, plan)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 0, ?, ?, '[]', 0, ?)`,
  ).run(
    restaurantId, r.slug, input.owner.id, r.name,
    JSON.stringify({ source: '', auto: {}, manual: {} }),
    JSON.stringify(r.cuisines), r.priceRange, r.address, r.postalCode, r.city,
    r.lat, r.lng, r.phone, r.website ?? null, r.emoji, r.hue, r.hours, r.sourceLang, r.plan,
  )

  const insertCat = db.prepare(
    'INSERT INTO categories (id, restaurant_id, name, sort_order) VALUES (?, ?, ?, ?)',
  )
  input.categories.forEach((name, i) => {
    insertCat.run(randomUUID(), restaurantId, JSON.stringify({ source: name, auto: {}, manual: {} }), i)
  })

  return restaurantId
})

export function setRestaurantPhoto(id: string, photo: string | null): boolean {
  return db
    .prepare("UPDATE restaurants SET photo = ?, updated_at = datetime('now') WHERE id = ?")
    .run(photo, id).changes > 0
}

export function setDishPhoto(dishId: string, photo: string | null): boolean {
  return db.prepare('UPDATE dishes SET photo = ? WHERE id = ?').run(photo, dishId).changes > 0
}

export function dishRestaurant(dishId: string): string | undefined {
  return db
    .prepare<[string], { restaurant_id: string }>('SELECT restaurant_id FROM dishes WHERE id = ?')
    .get(dishId)?.restaurant_id
}

/**
 * Rattache un nouveau compte restaurateur à un restaurant qui n'en a pas.
 *
 * Les deux sens du lien sont écrits dans la même transaction :
 * `users.restaurant_id` porte le périmètre du compte, `restaurants.owner_id`
 * désigne son titulaire. Laisser l'un sans l'autre rendrait la fiche
 * inadministrable ou le compte aveugle.
 */
export const attachOwner = db.transaction(
  (restaurantId: string, owner: { id: string; name: string; login: string; hash: string; salt: string }) => {
    db.prepare(
      `INSERT INTO users (id, login, name, role, password_hash, password_salt, restaurant_id)
       VALUES (?, ?, ?, 'owner', ?, ?, ?)`,
    ).run(owner.id, owner.login, owner.name, owner.hash, owner.salt, restaurantId)
    db.prepare('UPDATE restaurants SET owner_id = ? WHERE id = ?').run(owner.id, restaurantId)
  },
)

/** Compte restaurateur rattaché à un restaurant, s'il en existe un. */
export function ownerOfRestaurant(restaurantId: string):
  { id: string; name: string; login: string } | undefined {
  return db
    .prepare<[string], { id: string; name: string; login: string }>(
      "SELECT id, name, login FROM users WHERE role = 'owner' AND restaurant_id = ? LIMIT 1",
    )
    .get(restaurantId)
}

/** Remplace l'empreinte du mot de passe d'un compte restaurateur. */
export function setOwnerPassword(ownerId: string, hash: string, salt: string): boolean {
  const r = db
    .prepare("UPDATE users SET password_hash = ?, password_salt = ? WHERE id = ? AND role = 'owner'")
    .run(hash, salt, ownerId)
  // Les sessions ouvertes avec l'ancien mot de passe doivent tomber : sinon un
  // appareil resté connecté continuerait d'accéder à l'espace après la reprise
  // en main du compte.
  if (r.changes > 0) db.prepare('DELETE FROM sessions WHERE user_id = ?').run(ownerId)
  return r.changes > 0
}
