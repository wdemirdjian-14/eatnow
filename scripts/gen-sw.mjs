// Estampille le service worker avec la version du paquet : un changement de
// version invalide les caches de la version précédente.
import { readFileSync, writeFileSync } from 'node:fs'

const { version } = JSON.parse(readFileSync('package.json', 'utf8'))
const sw = readFileSync('dist/sw.js', 'utf8')

if (!sw.includes('__APP_VERSION__')) {
  console.error('gen-sw: marqueur __APP_VERSION__ introuvable dans dist/sw.js')
  process.exit(1)
}

writeFileSync('dist/sw.js', sw.replaceAll('__APP_VERSION__', version))
console.log(`sw.js -> caches estampillés ${version}`)
