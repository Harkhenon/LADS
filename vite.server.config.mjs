import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { defineConfig } from 'vite'

const pkg = JSON.parse(readFileSync('package.json', 'utf8'))

const DEFAULT_FEED = 'https://github.com/Harkhenon/LADS/releases/latest/download'
const publicKeyFile = process.env.LADS_BUILD_PUBLIC_KEY_FILE ?? 'update-public-key.pem'

// Fixés à la compilation, jamais lus à l'exécution : une variable d'environnement posée sur le poste
// ne peut donc pas rediriger les mises à jour ni changer la clé de vérification.
const publicKey = existsSync(publicKeyFile) ? readFileSync(publicKeyFile, 'utf8') : ''

// Serveur local, regroupé en un seul fichier sans node_modules.
export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(process.env.LADS_BUILD_VERSION ?? pkg.version),
    __UPDATE_FEED__: JSON.stringify(process.env.LADS_BUILD_FEED ?? DEFAULT_FEED),
    __UPDATE_PUBLIC_KEY__: JSON.stringify(publicKey)
  },
  ssr: {
    noExternal: true,
    target: 'node'
  },
  build: {
    ssr: resolve('src/server/index.mjs'),
    outDir: resolve('out/app'),
    emptyOutDir: false,
    target: 'node24',
    minify: false,
    rollupOptions: {
      output: { entryFileNames: 'server.mjs' }
    }
  }
})
