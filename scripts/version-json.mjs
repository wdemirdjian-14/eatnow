// Écrit dist/version.json : permet de savoir quelle version tourne réellement
// en ligne (https://eatnow.walautao.fr/version.json).
import { execSync } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'

const pkg = JSON.parse(readFileSync('package.json', 'utf8'))
let commit = 'unknown'
try {
  commit = execSync('git rev-parse --short HEAD', { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim()
} catch { /* hors dépôt git */ }

writeFileSync(
  'dist/version.json',
  JSON.stringify({ version: pkg.version, builtAt: new Date().toISOString(), commit }, null, 2) + '\n',
)
console.log(`version.json -> ${pkg.version} (${commit})`)
