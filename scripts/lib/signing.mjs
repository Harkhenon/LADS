// Accès à la clé de signature des mises à jour, conservée hors du dépôt et hors de GitHub.
import crypto from 'node:crypto'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import readline from 'node:readline'

export const privateKeyPath =
  process.env.LADS_SIGNING_KEY ?? path.join(os.homedir(), '.lads', 'update-signing-key.pem')

export function askHidden(question) {
  if (process.env.LADS_KEY_PASSPHRASE) {
    return Promise.resolve(process.env.LADS_KEY_PASSPHRASE)
  }
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      terminal: true
    })
    rl._writeToOutput = (text) => {
      if (text.includes(question)) {
        process.stdout.write(text)
      }
    }
    rl.question(question, (answer) => {
      rl.close()
      process.stdout.write('\n')
      resolve(answer)
    })
  })
}

export async function loadPrivateKey() {
  if (!fs.existsSync(privateKeyPath)) {
    throw new Error(`Clé de signature introuvable : ${privateKeyPath}`)
  }
  const passphrase = await askHidden('Phrase secrète de la clé de signature : ')
  return crypto.createPrivateKey({ key: fs.readFileSync(privateKeyPath), passphrase })
}

export function signBytes(bytes, privateKey) {
  return crypto.sign(null, bytes, privateKey).toString('base64')
}
