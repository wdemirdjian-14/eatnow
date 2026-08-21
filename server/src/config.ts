import { resolve } from 'node:path'

/**
 * Configuration du serveur, entièrement pilotée par l'environnement pour que
 * le même binaire tourne en développement et en production.
 */
export const config = {
  port: Number(process.env.PORT ?? 3001),
  host: process.env.HOST ?? '127.0.0.1',

  /** Fichier SQLite. Un seul fichier : sauvegarde et restauration triviales. */
  dbFile: resolve(process.env.EATNOW_DB ?? './data/eatnow.db'),

  /** Dossier des photos de plats, servi par nginx en production. */
  uploadDir: resolve(process.env.EATNOW_UPLOADS ?? './data/uploads'),

  /** Durée de validité d'une session, en jours. */
  sessionDays: Number(process.env.EATNOW_SESSION_DAYS ?? 30),

  /** `Secure` sur le cookie : à désactiver seulement en HTTP local. */
  secureCookies: process.env.EATNOW_SECURE_COOKIES !== 'false',

  /** Origines autorisées, séparées par des virgules. Vide = même origine. */
  allowedOrigins: (process.env.EATNOW_ORIGINS ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),

  /** Mot de passe du compte administrateur créé au premier démarrage. */
  adminLogin: process.env.EATNOW_ADMIN_LOGIN ?? 'warren',
  adminPassword: process.env.EATNOW_ADMIN_PASSWORD ?? '',

  /** Taille maximale d'une photo de plat reçue, en octets. */
  maxPhotoBytes: Number(process.env.EATNOW_MAX_PHOTO ?? 3_000_000),
} as const
