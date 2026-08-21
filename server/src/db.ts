import Database from 'better-sqlite3'
import { mkdirSync } from 'node:fs'
import { dirname } from 'node:path'
import { config } from './config.js'

/**
 * Base SQLite unique.
 *
 * SQLite est ici un choix délibéré : un restaurant ne génère que quelques
 * écritures par jour, les lectures sont massivement majoritaires, et le mode
 * WAL suffit largement à la concurrence attendue. La base tient dans un
 * fichier, ce qui rend sauvegarde et restauration triviales sur un VPS.
 */
mkdirSync(dirname(config.dbFile), { recursive: true })
mkdirSync(config.uploadDir, { recursive: true })

export const db = new Database(config.dbFile)

db.pragma('journal_mode = WAL')
db.pragma('foreign_keys = ON')
// Compromis durabilité/vitesse standard en WAL : aucune perte sur crash
// applicatif, perte possible seulement sur coupure système brutale.
db.pragma('synchronous = NORMAL')

/**
 * Migrations appliquées en séquence. Chaque entrée est jouée une seule fois
 * et son numéro est mémorisé dans `user_version`, ce qui permet de faire
 * évoluer le schéma sans jamais repartir de zéro.
 */
const MIGRATIONS: string[] = [
  // 1 — schéma initial
  `
  CREATE TABLE users (
    id            TEXT PRIMARY KEY,
    login         TEXT NOT NULL UNIQUE COLLATE NOCASE,
    name          TEXT NOT NULL,
    role          TEXT NOT NULL CHECK (role IN ('admin', 'owner')),
    password_hash TEXT NOT NULL,
    password_salt TEXT NOT NULL,
    restaurant_id TEXT,
    created_at    TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE sessions (
    id         TEXT PRIMARY KEY,
    user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    -- Compte endossé par un administrateur, le cas échéant.
    acting_as  TEXT REFERENCES users(id) ON DELETE SET NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    expires_at TEXT NOT NULL
  );
  CREATE INDEX sessions_user ON sessions(user_id);
  CREATE INDEX sessions_expiry ON sessions(expires_at);

  CREATE TABLE restaurants (
    id              TEXT PRIMARY KEY,
    slug            TEXT NOT NULL UNIQUE,
    owner_id        TEXT REFERENCES users(id) ON DELETE SET NULL,
    name            TEXT NOT NULL,
    description     TEXT NOT NULL DEFAULT '{}',
    cuisines        TEXT NOT NULL DEFAULT '[]',
    price_range     INTEGER NOT NULL DEFAULT 2,
    address         TEXT NOT NULL DEFAULT '',
    postal_code     TEXT NOT NULL DEFAULT '',
    city            TEXT NOT NULL DEFAULT '',
    lat             REAL NOT NULL DEFAULT 0,
    lng             REAL NOT NULL DEFAULT 0,
    phone           TEXT NOT NULL DEFAULT '',
    website         TEXT,
    emoji           TEXT NOT NULL DEFAULT '🍽️',
    hue             INTEGER NOT NULL DEFAULT 188,
    rating          REAL NOT NULL DEFAULT 0,
    reviews         INTEGER NOT NULL DEFAULT 0,
    hours           TEXT NOT NULL DEFAULT '',
    source_lang     TEXT NOT NULL DEFAULT 'fr',
    purchased_langs TEXT NOT NULL DEFAULT '[]',
    published       INTEGER NOT NULL DEFAULT 0,
    plan            TEXT NOT NULL DEFAULT 'essai',
    created_at      TEXT NOT NULL DEFAULT (date('now')),
    updated_at      TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE categories (
    id            TEXT PRIMARY KEY,
    restaurant_id TEXT NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
    name          TEXT NOT NULL DEFAULT '{}',
    sort_order    INTEGER NOT NULL DEFAULT 0
  );
  CREATE INDEX categories_resto ON categories(restaurant_id);

  CREATE TABLE dishes (
    id            TEXT PRIMARY KEY,
    restaurant_id TEXT NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
    category_id   TEXT NOT NULL REFERENCES categories(id) ON DELETE CASCADE,
    name          TEXT NOT NULL DEFAULT '{}',
    description   TEXT NOT NULL DEFAULT '{}',
    price         REAL NOT NULL DEFAULT 0,
    promo_price   REAL,
    allergens     TEXT NOT NULL DEFAULT '[]',
    tags          TEXT NOT NULL DEFAULT '[]',
    available     INTEGER NOT NULL DEFAULT 1,
    dish_of_day   INTEGER NOT NULL DEFAULT 0,
    sort_order    INTEGER NOT NULL DEFAULT 0,
    photo         TEXT,
    options       TEXT NOT NULL DEFAULT '[]'
  );
  CREATE INDEX dishes_resto ON dishes(restaurant_id);
  CREATE INDEX dishes_category ON dishes(category_id);

  CREATE TABLE menus (
    id            TEXT PRIMARY KEY,
    restaurant_id TEXT NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
    name          TEXT NOT NULL DEFAULT '{}',
    description   TEXT NOT NULL DEFAULT '{}',
    price         REAL NOT NULL DEFAULT 0,
    dish_ids      TEXT NOT NULL DEFAULT '[]',
    sort_order    INTEGER NOT NULL DEFAULT 0
  );
  CREATE INDEX menus_resto ON menus(restaurant_id);

  CREATE TABLE purchases (
    id            TEXT PRIMARY KEY,
    restaurant_id TEXT NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
    lang          TEXT NOT NULL,
    amount        REAL NOT NULL,
    date          TEXT NOT NULL DEFAULT (date('now'))
  );
  CREATE INDEX purchases_resto ON purchases(restaurant_id);
  `,
]

/**
 * Applique les migrations en attente.
 *
 * Appelée automatiquement à l'import de ce module : les autres modules
 * préparent leurs requêtes dès leur chargement, et les imports ES sont
 * évalués avant le corps du module appelant. Sans cela, le tout premier
 * démarrage sur une base vide échouerait sur « no such table ».
 */
export function migrate(): void {
  const current = db.pragma('user_version', { simple: true }) as number
  for (let i = current; i < MIGRATIONS.length; i++) {
    db.exec('BEGIN')
    try {
      db.exec(MIGRATIONS[i])
      db.pragma(`user_version = ${i + 1}`)
      db.exec('COMMIT')
    } catch (err) {
      db.exec('ROLLBACK')
      throw new Error(`Migration ${i + 1} échouée : ${(err as Error).message}`)
    }
  }
}

migrate()

/** Supprime les sessions expirées. Appelé au démarrage puis chaque heure. */
export function purgeExpiredSessions(): number {
  return db.prepare("DELETE FROM sessions WHERE expires_at < datetime('now')").run().changes
}
