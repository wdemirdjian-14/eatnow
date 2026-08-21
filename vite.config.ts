import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// `base` est surchargeable au build (GitHub Pages sert le site sous /<repo>/).
// ex: BASE_PATH=/Jemsly/ npm run build
export default defineConfig({
  plugins: [react()],
  base: process.env.BASE_PATH ?? '/',
  build: { outDir: 'dist', sourcemap: false },
})
