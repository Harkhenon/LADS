#!/usr/bin/env node
// Crée la clé qui signe les mises à jour. À lancer une seule fois, sur votre PC.
//   - clé privée, chiffrée par une phrase secrète : ~/.lads/update-signing-key.pem (hors du dépôt)
//   - clé publique, à commiter : update-public-key.pem (intégrée à l'application)
import crypto from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { askHidden, privateKeyPath } from './lib/signing.mjs'

const MIN_PASSPHRASE_LENGTH = 12
const publicKeyFile = process.env.LADS_BUILD_PUBLIC_KEY_FILE ?? 'update-public-key.pem'

if (fs.existsSync(privateKeyPath)) {
  console.error(`Une clé existe déjà : ${privateKeyPath}`)
  console.error('La remplacer couperait les mises à jour des postes installés : opération annulée.')
  process.exit(1)
}

const passphrase = await askHidden('Choisissez une phrase secrète (12 caractères minimum) : ')
if (passphrase.length < MIN_PASSPHRASE_LENGTH) {
  console.error('Phrase secrète trop courte : aucune clé créée.')
  process.exit(1)
}
if (!process.env.LADS_KEY_PASSPHRASE) {
  const again = await askHidden('Confirmez la phrase secrète : ')
  if (again !== passphrase) {
    console.error('Les deux saisies diffèrent : aucune clé créée.')
    process.exit(1)
  }
}

const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519', {
  publicKeyEncoding: { type: 'spki', format: 'pem' },
  privateKeyEncoding: {
    type: 'pkcs8',
    format: 'pem',
    cipher: 'aes-256-cbc',
    passphrase
  }
})

fs.mkdirSync(path.dirname(privateKeyPath), { recursive: true })
fs.writeFileSync(privateKeyPath, privateKey, { mode: 0o600, flag: 'wx' })
fs.writeFileSync(publicKeyFile, publicKey)

console.log(`Clé privée : ${privateKeyPath}`)
console.log(`Clé publique : ${publicKeyFile} (à commiter)`)
console.log(
  'Sauvegardez la clé privée et sa phrase secrète hors de ce PC : sans elles, plus de mise à jour.'
)
