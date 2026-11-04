#!/usr/bin/env node
// Assemble les fichiers d'une release à partir de out/app (voir `npm run build`).
//   dist/lads-app-<version>.zip  application
//   dist/lads-update.json        manifeste, à signer ensuite hors de la CI
//   dist/install.ps1             installation initiale, avec les empreintes de cette version
import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { zipSync } from 'fflate'
import { NODE_RUNTIME } from '../src/server/lib/toolPins.mjs'

const root = process.cwd()
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'))
const version = process.env.LADS_BUILD_VERSION ?? pkg.version
const feed = process.env.LADS_BUILD_FEED
const appDir = path.join(root, 'out', 'app')
const dist = path.join(root, 'dist')
const publicKeyFile = process.env.LADS_BUILD_PUBLIC_KEY_FILE ?? 'update-public-key.pem'

function fail(message) {
  console.error(`[package] ${message}`)
  process.exit(1)
}

// Sans clé publique, les postes ne pourraient jamais recevoir de mise à jour.
if (!fs.existsSync(publicKeyFile)) {
  fail(`${publicKeyFile} est absent : lancez d'abord « npm run release:keygen » (docs/RELEASE.md).`)
}
if (!fs.existsSync(path.join(appDir, 'server.mjs')) || !fs.existsSync(path.join(appDir, 'ui'))) {
  fail('Build introuvable : lancez d’abord « npm run build ».')
}

const files = {}
function addDirectory(dir, prefix) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      addDirectory(full, `${prefix}${entry.name}/`)
    } else {
      files[`${prefix}${entry.name}`] = fs.readFileSync(full)
    }
  }
}
files['server.mjs'] = fs.readFileSync(path.join(appDir, 'server.mjs'))
addDirectory(path.join(appDir, 'ui'), 'ui/')
files['launcher.mjs'] = fs.readFileSync(path.join(root, 'src', 'launcher', 'launcher.mjs'))
files['icon.ico'] = fs.readFileSync(path.join(root, 'resources', 'icon.ico'))

const archive = Buffer.from(zipSync(files, { level: 9, mtime: new Date('2020-01-01') }))
const sha256 = (buffer) => crypto.createHash('sha256').update(buffer).digest('hex')
const appFile = `lads-app-${version}.zip`
const nodeAsset = NODE_RUNTIME.assets['win32-x64']

const manifest = {
  version,
  app: { file: appFile, sha256: sha256(archive), size: archive.length },
  node: { version: NODE_RUNTIME.version, file: nodeAsset.name, sha256: nodeAsset.sha256 }
}

const template = fs.readFileSync(path.join(root, 'src', 'launcher', 'install.ps1'), 'utf8')
const installer = template
  .replaceAll('@@VERSION@@', version)
  .replaceAll(
    '@@APP_BASE_URL@@',
    feed ?? `https://github.com/Harkhenon/LADS/releases/download/v${version}`
  )
  .replaceAll('@@NODE_BASE_URL@@', NODE_RUNTIME.baseUrl)
  .replaceAll('@@APP_FILE@@', appFile)
  .replaceAll('@@APP_SHA256@@', manifest.app.sha256)
  .replaceAll('@@NODE_VERSION@@', NODE_RUNTIME.version)
  .replaceAll('@@NODE_FILE@@', nodeAsset.name)
  .replaceAll('@@NODE_SHA256@@', nodeAsset.sha256)
if ([...installer].some((character) => character.charCodeAt(0) > 127)) {
  fail('install.ps1 doit rester en ASCII : Windows PowerShell 5.1 lirait mal les accents.')
}
if (installer.includes('@@')) {
  fail('install.ps1 contient encore une valeur à remplir.')
}

fs.rmSync(dist, { recursive: true, force: true })
fs.mkdirSync(dist, { recursive: true })
fs.writeFileSync(path.join(dist, appFile), archive)
fs.writeFileSync(path.join(dist, 'lads-update.json'), JSON.stringify(manifest, null, 2))
fs.writeFileSync(path.join(dist, 'install.ps1'), installer.replaceAll('\n', '\r\n'))
console.log(
  `[package] ${appFile} (${(archive.length / 1024 / 1024).toFixed(1)} Mo), manifeste et install.ps1 prêts`
)
