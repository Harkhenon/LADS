#!/usr/bin/env node
// Développement : serveur local (recompilé à chaque modification) et interface avec rechargement à chaud.
// Les téléchargements et la recherche sont réels. Les mises à jour automatiques sont désactivées.
import { execFileSync, spawn } from 'node:child_process'

const isWindows = process.platform === 'win32'
const npx = (args, options = {}) =>
  spawn('npx', args, { stdio: 'inherit', shell: isWindows, ...options })

execFileSync('npx', ['vite', 'build', '-c', 'vite.server.config.mjs'], {
  stdio: 'inherit',
  shell: isWindows
})

const children = [
  npx(['vite', 'build', '-c', 'vite.server.config.mjs', '--watch']),
  spawn(process.execPath, ['--watch', 'out/app/server.mjs'], {
    stdio: 'inherit',
    env: { ...process.env, LADS_DEV: '1' }
  }),
  npx(['vite'])
]

const stop = () => {
  for (const child of children) {
    child.kill()
  }
  process.exit(0)
}
process.on('SIGINT', stop)
process.on('SIGTERM', stop)
