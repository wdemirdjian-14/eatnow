import { buildApp } from './app.js'
import { config } from './config.js'
import { purgeExpiredSessions } from './db.js'
import { ensureAdmin } from './cli/bootstrap.js'

// Les migrations sont appliquées à l'import de ./db.js.
const purged = purgeExpiredSessions()

const app = buildApp()

const created = await ensureAdmin()
if (created) app.log.info(`Compte administrateur « ${created} » créé au premier démarrage.`)
if (purged) app.log.info(`${purged} session(s) expirée(s) purgée(s).`)

try {
  await app.listen({ port: config.port, host: config.host })
  app.log.info(`Base : ${config.dbFile}`)
  app.log.info(`Photos : ${config.uploadDir}`)
} catch (err) {
  app.log.error(err)
  process.exit(1)
}

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, async () => {
    app.log.info(`${signal} reçu, arrêt en cours…`)
    await app.close()
    process.exit(0)
  })
}
