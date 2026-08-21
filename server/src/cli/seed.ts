/**
 * Charge les données de démonstration dans une base vide.
 *
 *   npm run seed            # refuse si la base contient déjà des restaurants
 *   npm run seed -- --force # repart d'une base propre
 *
 * Le fichier `seed-data.json` est produit par `npm run export:seed` à la
 * racine du dépôt : les données de démonstration ont ainsi une seule source,
 * celle du client, traductions automatiques comprises.
 */
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'
import { db } from '../db.js'
import { hashPassword } from '../auth.js'
import { config } from '../config.js'

interface SeedOwner {
  id: string; name: string; email: string; password: string; restaurantId: string
}
interface SeedFile {
  restaurants: Record<string, any>[]
  categories: Record<string, any>[]
  dishes: Record<string, any>[]
  menus: Record<string, any>[]
  owners: SeedOwner[]
}

const here = dirname(fileURLToPath(import.meta.url))
const seedPath = resolve(here, '../../seed-data.json')

const force = process.argv.includes('--force')
const existing = db.prepare<[], { n: number }>('SELECT COUNT(*) AS n FROM restaurants').get()!.n
if (existing > 0 && !force) {
  console.error(`La base contient déjà ${existing} restaurant(s). Utilisez --force pour la réinitialiser.`)
  process.exit(1)
}

const data = JSON.parse(readFileSync(seedPath, 'utf8')) as SeedFile

// better-sqlite3 est synchrone et n'accepte pas de transaction asynchrone :
// le hachage des mots de passe, lui, est asynchrone. On le fait donc avant.
const owners = await Promise.all(
  data.owners.map(async (o) => ({ ...o, ...(await hashPassword(o.password)) })),
)

const load = db.transaction(() => {
  if (force) {
    db.exec('DELETE FROM purchases; DELETE FROM menus; DELETE FROM dishes; DELETE FROM categories;')
    db.exec("DELETE FROM restaurants; DELETE FROM sessions; DELETE FROM users WHERE role = 'owner';")
  }

  const insertUser = db.prepare(
    `INSERT INTO users (id, login, name, role, password_hash, password_salt, restaurant_id)
     VALUES (?, ?, ?, 'owner', ?, ?, ?)`,
  )
  for (const o of owners) insertUser.run(o.id, o.email, o.name, o.hash, o.salt, o.restaurantId)

  const insertResto = db.prepare(
    `INSERT INTO restaurants (id, slug, owner_id, name, description, cuisines, price_range,
       address, postal_code, city, lat, lng, phone, website, emoji, hue, rating, reviews,
       hours, source_lang, purchased_langs, published, plan, created_at, photo)
     VALUES (@id, @slug, @ownerId, @name, @description, @cuisines, @priceRange, @address,
       @postalCode, @city, @lat, @lng, @phone, @website, @emoji, @hue, @rating, @reviews,
       @hours, @sourceLang, @purchasedLangs, @published, @plan, @createdAt, @photo)`,
  )
  for (const r of data.restaurants) {
    insertResto.run({
      ...r,
      description: JSON.stringify(r.description),
      cuisines: JSON.stringify(r.cuisines),
      purchasedLangs: JSON.stringify(r.purchasedLangs),
      published: r.published ? 1 : 0,
      website: r.website ?? null,
      photo: r.photo ?? null,
    })
  }

  const insertCat = db.prepare(
    'INSERT INTO categories (id, restaurant_id, name, sort_order) VALUES (?, ?, ?, ?)',
  )
  for (const c of data.categories) {
    insertCat.run(c.id, c.restaurantId, JSON.stringify(c.name), c.order)
  }

  const insertDish = db.prepare(
    `INSERT INTO dishes (id, restaurant_id, category_id, name, description, price, promo_price,
       allergens, tags, available, dish_of_day, sort_order, photo, options)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  )
  for (const d of data.dishes) {
    insertDish.run(
      d.id, d.restaurantId, d.categoryId, JSON.stringify(d.name), JSON.stringify(d.description),
      d.price, d.promoPrice ?? null, JSON.stringify(d.allergens), JSON.stringify(d.tags),
      d.available ? 1 : 0, d.dishOfDay ? 1 : 0, d.order, d.photo ?? null,
      JSON.stringify(d.options ?? []),
    )
  }

  const insertMenu = db.prepare(
    `INSERT INTO menus (id, restaurant_id, name, description, price, dish_ids, sort_order)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
  )
  for (const m of data.menus) {
    insertMenu.run(
      m.id, m.restaurantId, JSON.stringify(m.name), JSON.stringify(m.description),
      m.price, JSON.stringify(m.dishIds), m.order,
    )
  }
})

load()

console.log(
  `Données chargées : ${data.restaurants.length} restaurants, ${data.dishes.length} plats, ` +
  `${owners.length} comptes restaurateurs.`,
)
console.log(`Base : ${config.dbFile}`)
