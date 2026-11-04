import crypto from 'node:crypto'
import { createReadStream } from 'node:fs'
import fs from 'node:fs/promises'
import { binDir } from './paths.mjs'

const DOWNLOAD_TIMEOUT_MS = 10 * 60 * 1000
const RENAME_ATTEMPTS = 5
const RENAME_RETRY_DELAY_MS = 400

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

async function fetchOk(url) {
  const response = await fetch(url, { signal: AbortSignal.timeout(DOWNLOAD_TIMEOUT_MS) })
  if (!response.ok) {
    throw new Error(`Téléchargement échoué (${response.status}) : ${url}`)
  }
  return response
}

export async function fetchText(url) {
  return (await fetchOk(url)).text()
}

export async function fetchBuffer(url) {
  return Buffer.from(await (await fetchOk(url)).arrayBuffer())
}

export async function fetchVerified(url, expectedSha256) {
  const buffer = await fetchBuffer(url)
  if (sha256(buffer) !== expectedSha256) {
    throw new Error(`Empreinte invalide pour ${url} : fichier refusé.`)
  }
  return buffer
}

// Sous Windows, un antivirus peut verrouiller brièvement un fichier qui vient d'être écrit.
export async function renameWithRetry(source, destination) {
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

// Écriture atomique : un arrêt en cours de route ne laisse jamais de fichier tronqué à destination.
export async function writeFileAtomic(destination, data, options) {
  const temporary = `${destination}.${crypto.randomUUID()}.tmp`
  try {
    await fs.writeFile(temporary, data, options)
    await renameWithRetry(temporary, destination)
  } catch (error) {
    await fs.rm(temporary, { force: true })
    throw error
  }
}

export async function installBinary(destination, buffer) {
  await fs.mkdir(binDir, { recursive: true })
  await writeFileAtomic(destination, buffer, { mode: 0o755 })
}
