const fs = require('node:fs')
const path = require('node:path')

const root = path.join(__dirname, '..')
const source = path.join(root, 'resources', 'icon.png')
const target = path.join(root, 'build', 'icon.png')

if (!fs.existsSync(source)) {
  console.error(`[sync-icons] source introuvable : ${source}`)
  process.exit(1)
}

fs.mkdirSync(path.dirname(target), { recursive: true })
fs.copyFileSync(source, target)
console.log('[sync-icons] build/icon.png synchronisé depuis resources/icon.png')
