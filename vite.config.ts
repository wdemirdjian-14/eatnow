import { execSync } from 'node:child_process'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

/**
 * Empreinte du build, affichée en pied de page.
 *
 * Le numéro de version seul ne suffit pas à savoir ce qu'un téléphone exécute
 * réellement : plusieurs déploiements se succèdent sous la même version, et
 * une application installée peut servir un ancien cache. Le commit tranche.
 */
function buildId(): string {
  try {
    const sha = execSync('git rev-parse --short HEAD', { encoding: 'utf8' }).trim()
    return `${sha} · ${new Date().toISOString().slice(0, 16).replace('T', ' ')}`
  } catch {
    return 'dev'
  }
}

/**
 * En production, nginx sert le client et relaie `/api` vers le service Node,
 * donc tout est de même origine. En développement, ce proxy reproduit cette
 * topologie : sans lui, le cookie de session `SameSite=Strict` ne serait pas
 * transmis et l'authentification échouerait sans raison apparente.
 */
const apiProxy = {
  '/api': { target: process.env.API_TARGET ?? 'http://127.0.0.1:3011', changeOrigin: false },
  '/uploads': { target: process.env.API_TARGET ?? 'http://127.0.0.1:3011', changeOrigin: false },
}

// `base` est surchargeable au build (GitHub Pages sert le site sous /<repo>/).
// ex: BASE_PATH=/eatnow/ npm run build
export default defineConfig({
  plugins: [react()],
  define: { __BUILD_ID__: JSON.stringify(buildId()) },
  base: process.env.BASE_PATH ?? '/',
  build: { outDir: 'dist', sourcemap: false },
  server: { proxy: apiProxy },
  preview: { proxy: apiProxy },
})
