#!/usr/bin/env node
// Signe le brouillon de release construit par la CI, puis le publie.
//   npm run release:sign -- v1.2.3
// À relancer tel quel si la publication a été interrompue.
import { execFileSync } from 'node:child_process'
import crypto from 'node:crypto'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { parseManifest, verifySignature } from '../src/server/lib/updateManifest.mjs'
import { loadPrivateKey, signBytes } from './lib/signing.mjs'

const REPO = 'Harkhenon/LADS'
const tag = process.argv[2]

function fail(message) {
  console.error(`\n[sign] ${message}`)
  process.exit(1)
}
const gh = (...args) => execFileSync('gh', args, { encoding: 'utf8' }).trim()

if (!/^v\d+\.\d+\.\d+(-[0-9A-Za-z.]+)?$/.test(tag ?? '')) {
  fail('Usage : npm run release:sign -- v1.2.3')
}

const work = fs.mkdtempSync(path.join(os.tmpdir(), 'lads-sign-'))
try {
  gh(
    'release',
    'download',
    tag,
    '-R',
    REPO,
    '-p',
    'lads-update.json',
    '-p',
    'lads-app-*.zip',
    '-D',
    work
  )
  const manifestPath = path.join(work, 'lads-update.json')
  const bytes = fs.readFileSync(manifestPath)
  const manifest = parseManifest(bytes)
  if (!manifest) {
    fail('Manifeste invalide : rien n’est signé.')
  }
  if (`v${manifest.version}` !== tag) {
    fail(`Le manifeste annonce ${manifest.version}, différent de ${tag} : rien n'est signé.`)
  }
  // La signature engage votre clé : contrôler ce que la CI a réellement produit.
  const archive = fs.readFileSync(path.join(work, manifest.app.file))
  if (crypto.createHash('sha256').update(archive).digest('hex') !== manifest.app.sha256) {
    fail('L’archive ne correspond pas au manifeste : rien n’est signé.')
  }

  console.log(`Version     : ${manifest.version}`)
  console.log(`Application : ${manifest.app.file} (${manifest.app.sha256})`)
  console.log(`Node.js     : ${manifest.node.version}`)

  const signature = signBytes(bytes, await loadPrivateKey())
  const publicKey = fs.readFileSync('update-public-key.pem', 'utf8')
  if (!verifySignature(bytes, signature, publicKey)) {
    fail('Cette clé ne correspond pas à update-public-key.pem : rien n’est publié.')
  }

  const signatureFile = `${manifestPath}.sig`
  fs.writeFileSync(signatureFile, signature)
  gh('release', 'upload', tag, signatureFile, '-R', REPO, '--clobber')
  const prerelease = tag.includes('-')
  gh(
    'release',
    'edit',
    tag,
    '-R',
    REPO,
    '--draft=false',
    ...(prerelease ? ['--prerelease'] : ['--latest'])
  )
  console.log(`\n[sign] ${tag} signée et publiée.`)
} finally {
  fs.rmSync(work, { recursive: true, force: true })
}
