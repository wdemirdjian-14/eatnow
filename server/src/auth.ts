import { randomBytes, randomUUID, scrypt, timingSafeEqual } from 'node:crypto'
import { promisify } from 'node:util'
import { db } from './db.js'
import { config } from './config.js'

const scryptAsync = promisify(scrypt) as (
  password: string, salt: Buffer, keylen: number,
) => Promise<Buffer>

const KEY_LEN = 64

/**
 * Hachage des mots de passe par scrypt, fourni par Node.
 *
 * scrypt est volontairement coûteux en mémoire, ce qui rend les attaques par
 * dictionnaire sur GPU beaucoup plus chères que sur un simple SHA. Aucune
 * dépendance externe n'est nécessaire, donc aucune compilation native.
 */
export async function hashPassword(password: string): Promise<{ hash: string; salt: string }> {
  const salt = randomBytes(16)
  const hash = await scryptAsync(password, salt, KEY_LEN)
  return { hash: hash.toString('hex'), salt: salt.toString('hex') }
}

/** Comparaison à temps constant : ne fuit pas la position du premier écart. */
export async function verifyPassword(password: string, hash: string, salt: string): Promise<boolean> {
  try {
    const expected = Buffer.from(hash, 'hex')
    const actual = await scryptAsync(password, Buffer.from(salt, 'hex'), expected.length)
    return expected.length === actual.length && timingSafeEqual(expected, actual)
  } catch {
    return false
  }
}

export interface UserRow {
  id: string
  login: string
  name: string
  role: 'admin' | 'owner'
  restaurant_id: string | null
}

export interface SessionContext {
  session: string
  /** Compte réellement authentifié. */
  user: UserRow
  /** Compte sous lequel les actions s'exécutent (endossement admin). */
  acting: UserRow
  impersonating: boolean
}

export const SESSION_COOKIE = 'eatnow_session'

const selectUser = db.prepare<[string], UserRow>(
  'SELECT id, login, name, role, restaurant_id FROM users WHERE id = ?',
)

export function createSession(userId: string): string {
  const id = randomUUID()
  db.prepare(
    `INSERT INTO sessions (id, user_id, expires_at)
     VALUES (?, ?, datetime('now', ?))`,
  ).run(id, userId, `+${config.sessionDays} days`)
  return id
}

export function destroySession(id: string): void {
  db.prepare('DELETE FROM sessions WHERE id = ?').run(id)
}

/**
 * Horodate la connexion d'un compte.
 *
 * Seule une authentification par mot de passe la met à jour : un endossement
 * administrateur ne doit pas laisser croire que le restaurateur s'est connecté
 * lui-même.
 */
export function touchLastLogin(userId: string): void {
  db.prepare("UPDATE users SET last_login_at = datetime('now') WHERE id = ?").run(userId)
}

/** Résout une session valide, en tenant compte d'un éventuel endossement. */
export function readSession(id: string | undefined): SessionContext | null {
  if (!id) return null
  const row = db
    .prepare<[string], { user_id: string; acting_as: string | null }>(
      "SELECT user_id, acting_as FROM sessions WHERE id = ? AND expires_at > datetime('now')",
    )
    .get(id)
  if (!row) return null

  const user = selectUser.get(row.user_id)
  if (!user) return null

  // Seul un administrateur peut agir au nom d'un autre compte.
  let acting = user
  let impersonating = false
  if (row.acting_as && user.role === 'admin') {
    const target = selectUser.get(row.acting_as)
    if (target) {
      acting = target
      impersonating = true
    }
  }

  return { session: id, user, acting, impersonating }
}

export function setImpersonation(sessionId: string, targetUserId: string | null): void {
  db.prepare('UPDATE sessions SET acting_as = ? WHERE id = ?').run(targetUserId, sessionId)
}

export function findUserByLogin(login: string): (UserRow & { password_hash: string; password_salt: string }) | undefined {
  return db
    .prepare<[string], UserRow & { password_hash: string; password_salt: string }>(
      `SELECT id, login, name, role, restaurant_id, password_hash, password_salt
       FROM users WHERE login = ? COLLATE NOCASE`,
    )
    .get(login.trim())
}

/** Le compte peut-il écrire sur ce restaurant ? */
export function canEditRestaurant(ctx: SessionContext, restaurantId: string): boolean {
  if (ctx.acting.role === 'admin') return true
  return ctx.acting.restaurant_id === restaurantId
}
