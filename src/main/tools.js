import { app, net } from 'electron'
import crypto from 'node:crypto'
import { createReadStream } from 'node:fs'
import fs from 'node:fs/promises'
import { join } from 'node:path'

const DOWNLOAD_TIMEOUT_MS = 10 * 60 * 1000
const RENAME_ATTEMPTS = 5
const RENAME_RETRY_DELAY_MS = 400

export function binDir() {
  return join(app.getPath('userData'), 'bin')
}

export function sha256(buffer) {
  return crypto.createHash('sha256').update(buffer).digest('hex')
}

// Renvoie null si le fichier est absent ou illisible.
export function sha256File(filePath) {
  return new Promise((resolve) => {
    const hash = crypto.createHash('sha256')
    createReadStream(filePath)
      .on('data', (chunk) => hash.update(chunk))
      .on('end', () => resolve(hash.digest('hex')))
      .on('error', () => resolve(null))
  })
}

// net.fetch passe par la pile réseau de Chromium : il respecte le proxy et les certificats du système.
async function fetchOk(url) {
  const response = await net.fetch(url, { signal: AbortSignal.timeout(DOWNLOAD_TIMEOUT_MS) })
  if (!response.ok) {
    throw new Error(`Téléchargement échoué (${response.status}) : ${url}`)
  }
  return response
}

export async function fetchText(url) {
  return (await fetchOk(url)).text()
}

export async function fetchVerified(url, expectedSha256) {
  const buffer = Buffer.from(await (await fetchOk(url)).arrayBuffer())
  const actual = sha256(buffer)
  if (actual !== expectedSha256) {
    throw new Error(`Empreinte invalide pour ${url} : fichier refusé.`)
  }
  return buffer
}

// Sous Windows, un antivirus peut verrouiller brièvement un exécutable qui vient d'être écrit.
async function renameWithRetry(source, destination) {
  for (let attempt = 1; ; attempt++) {
    try {
      await fs.rename(source, destination)
      return
    } catch (error) {
      if (attempt >= RENAME_ATTEMPTS) {
        throw error
      }
      await new Promise((resolve) => setTimeout(resolve, RENAME_RETRY_DELAY_MS * attempt))
    }
  }
}

// Écriture atomique : un arrêt en cours de route ne laisse jamais de binaire tronqué à destination.
export async function installBinary(destination, buffer) {
  await fs.mkdir(binDir(), { recursive: true })
  const temporary = `${destination}.${crypto.randomUUID()}.tmp`
  try {
    await fs.writeFile(temporary, buffer, { mode: 0o755 })
    await renameWithRetry(temporary, destination)
  } catch (error) {
    await fs.rm(temporary, { force: true })
    throw error
  }
}

export { renameWithRetry }
