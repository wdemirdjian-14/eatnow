import { randomUUID } from 'node:crypto'
import { db } from '../db.js'
import { config } from '../config.js'
import { hashPassword } from '../auth.js'

/**
 * Crée le compte administrateur au premier démarrage si aucun n'existe.
 *
 * Le mot de passe vient de `EATNOW_ADMIN_PASSWORD`. Sans cette variable, aucun
 * compte n'est créé : mieux vaut un serveur sans administrateur qu'un
 * administrateur avec un mot de passe deviné d'avance.
 */
export async function ensureAdmin(): Promise<string | null> {
  const existing = db
    .prepare<[], { n: number }>("SELECT COUNT(*) AS n FROM users WHERE role = 'admin'")
    .get()
  if (existing && existing.n > 0) return null

  if (!config.adminPassword) {
    console.warn(
      '[eatnow] Aucun administrateur en base et EATNOW_ADMIN_PASSWORD non défini : ' +
      'aucun compte créé. Renseignez la variable puis redémarrez.',
    )
    return null
  }

  const { hash, salt } = await hashPassword(config.adminPassword)
  db.prepare(
    `INSERT INTO users (id, login, name, role, password_hash, password_salt)
     VALUES (?, ?, ?, 'admin', ?, ?)`,
  ).run(randomUUID(), config.adminLogin, config.adminLogin, hash, salt)
  return config.adminLogin
}
