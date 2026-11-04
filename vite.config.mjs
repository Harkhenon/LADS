import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

const pkg = JSON.parse(readFileSync('package.json', 'utf8'))

// Interface React, servie par le serveur local depuis out/app/ui.
export default defineConfig({
  root: resolve('src/renderer'),
  base: '/',
  define: {
    __APP_INFO__: JSON.stringify({
      name: pkg.name,
      version: pkg.version,
      description: pkg.description,
      author: pkg.author,
      homepage: pkg.homepage
    })
  },
  resolve: {
    alias: {
      '@renderer': resolve('src/renderer/src')
    }
  },
  build: {
    outDir: resolve('out/app/ui'),
    emptyOutDir: true,
    chunkSizeWarningLimit: 2000
  },
  server: {
    proxy: {
      // En développement, le serveur attend le jeton fixe « dev » (voir scripts/dev.mjs).
      '/api': {
        target: 'http://127.0.0.1:5199',
        changeOrigin: true,
        headers: { Cookie: 'lads_session=dev' }
      }
    }
  },
  plugins: [react()]
})
