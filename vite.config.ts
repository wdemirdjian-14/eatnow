import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

/**
 * En production, nginx sert le client et relaie `/api` vers le service Node,
 * donc tout est de même origine. En développement, ce proxy reproduit cette
 * topologie : sans lui, le cookie de session `SameSite=Strict` ne serait pas
 * transmis et l'authentification échouerait sans raison apparente.
 */
const apiProxy = {
  '/api': { target: process.env.API_TARGET ?? 'http://127.0.0.1:3001', changeOrigin: false },
  '/uploads': { target: process.env.API_TARGET ?? 'http://127.0.0.1:3001', changeOrigin: false },
}

// `base` est surchargeable au build (GitHub Pages sert le site sous /<repo>/).
// ex: BASE_PATH=/eatnow/ npm run build
export default defineConfig({
  plugins: [react()],
  base: process.env.BASE_PATH ?? '/',
  build: { outDir: 'dist', sourcemap: false },
  server: { proxy: apiProxy },
  preview: { proxy: apiProxy },
})
