import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// se publica en https://juancito33.github.io/catalogo/ (GitHub Pages lee la carpeta docs)
export default defineConfig({
  plugins: [react()],
  base: '/catalogo/',
  build: { outDir: 'docs', emptyOutDir: true },
})
