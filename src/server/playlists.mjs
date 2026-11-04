import fs from 'node:fs/promises'
import path from 'node:path'
import { normalizePlaylists } from './lib/validation.mjs'
import { log } from './log.mjs'
import { dataDir } from './paths.mjs'
import { writeFileAtomic } from './tools.mjs'

const playlistJsonPath = path.join(dataDir, 'playlists.json')
const backupPath = `${playlistJsonPath}.bak`

// Les écritures s'exécutent l'une après l'autre : la dernière demandée reste celle sur disque.
let writeQueue = Promise.resolve()

async function writePlaylists(playlists) {
  await fs.mkdir(dataDir, { recursive: true })
  await fs.copyFile(playlistJsonPath, backupPath).catch((error) => {
    if (error.code !== 'ENOENT') {
      throw error
    }
  })
  await writeFileAtomic(playlistJsonPath, JSON.stringify(playlists, null, 2), 'utf-8')
}

async function readFileIfValid(filePath) {
  const raw = await fs.readFile(filePath, 'utf-8')
  const playlists = normalizePlaylists(JSON.parse(raw))
  if (!playlists) {
    throw new SyntaxError(`${filePath} ne contient pas une liste de playlists`)
  }
  return playlists
}

export async function readPlaylists() {
  try {
    return await readFileIfValid(playlistJsonPath)
  } catch (error) {
    if (error.code === 'ENOENT') {
      return []
    }
    if (!(error instanceof SyntaxError)) {
      throw error
    }
  }
  // Fichier corrompu : on le met de côté (jamais supprimé) et on repart de la dernière sauvegarde.
  log('error', 'playlists.json corrompu, restauration de la sauvegarde')
  await fs.copyFile(playlistJsonPath, `${playlistJsonPath}.corrupt-${Date.now()}`)
  try {
    return await readFileIfValid(backupPath)
  } catch {
    return []
  }
}

export async function updatePlaylists(playlists) {
  // Une valeur invalide ne doit surtout pas écraser les playlists existantes.
  const safePlaylists = normalizePlaylists(playlists)
  if (!safePlaylists) {
    return { message: 'Données de playlists invalides', state: 0 }
  }
  const write = writeQueue.then(() => writePlaylists(safePlaylists))
  writeQueue = write.catch(() => {})
  try {
    await write
    return { message: 'Playlist mise à jour', state: 1 }
  } catch (error) {
    log('error', 'playlists :', error)
    return { message: 'Erreur de création', state: 0 }
  }
}
