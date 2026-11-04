import { app, ipcMain } from 'electron'
import crypto from 'node:crypto'
import fs from 'node:fs/promises'
import path from 'node:path'
import { normalizePlaylists } from './lib/validation.mjs'
import { renameWithRetry } from './tools'

const playlistsDir = app.getPath('userData')
const playlistJsonPath = path.join(playlistsDir, 'playlists.json')
const backupPath = `${playlistJsonPath}.bak`

// Les écritures s'exécutent l'une après l'autre : la dernière demandée reste celle sur disque.
let writeQueue = Promise.resolve()

async function writePlaylists(playlists) {
  const temporary = `${playlistJsonPath}.${crypto.randomUUID()}.tmp`
  await fs.mkdir(playlistsDir, { recursive: true })
  try {
    // Écriture atomique : une coupure en cours de route ne corrompt jamais le fichier principal.
    await fs.writeFile(temporary, JSON.stringify(playlists, null, 2), 'utf-8')
    await fs.copyFile(playlistJsonPath, backupPath).catch((error) => {
      if (error.code !== 'ENOENT') {
        throw error
      }
    })
    await renameWithRetry(temporary, playlistJsonPath)
  } catch (error) {
    await fs.rm(temporary, { force: true })
    throw error
  }
}

async function readFileIfValid(filePath) {
  const raw = await fs.readFile(filePath, 'utf-8')
  const playlists = normalizePlaylists(JSON.parse(raw))
  if (!playlists) {
    throw new SyntaxError(`${filePath} ne contient pas une liste de playlists`)
  }
  return playlists
}

async function readPlaylists() {
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
  console.error('[playlists] playlists.json corrompu, restauration de la sauvegarde')
  await fs.copyFile(playlistJsonPath, `${playlistJsonPath}.corrupt-${Date.now()}`)
  try {
    return await readFileIfValid(backupPath)
  } catch {
    return []
  }
}

export default function registerPlaylistsHandles() {
  ipcMain.handle('playlists:update', async (_event, playlists) => {
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
      console.error('[playlists]', error.message)
      return { message: 'Erreur de création', state: 0 }
    }
  })

  ipcMain.handle('playlists:read', () => readPlaylists())
}
