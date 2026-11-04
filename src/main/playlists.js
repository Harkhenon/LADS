import { app, ipcMain } from 'electron'
import fs from 'node:fs/promises'
import path from 'node:path'

const playlistsDir = path.join(app.getPath('userData'))
const playlistJsonPath = path.join(playlistsDir, 'playlists.json')

async function ensurePlaylistsFile() {
  await fs.mkdir(playlistsDir, { recursive: true })
  try {
    await fs.access(playlistJsonPath)
  } catch {
    await fs.writeFile(playlistJsonPath, '[]', 'utf-8')
  }
}

export default function registerPlaylistsHandles() {
  ipcMain.handle('playlists:update', async (event, playlists) => {
    const safePlaylists = Array.isArray(playlists) ? playlists : []
    const stringifiedPlaylists = JSON.stringify(safePlaylists, null, 2)
    try {
      await ensurePlaylistsFile()
      await fs.writeFile(playlistJsonPath, stringifiedPlaylists, 'utf-8')
      return {
        message: 'Playlist mise à jour',
        state: 1
      }
    } catch (e) {
      console.error(e.message)
      return {
        message: 'Erreur de création',
        state: 0
      }
    }
  })

  ipcMain.handle('playlists:read', async () => {
    await ensurePlaylistsFile()
    return JSON.parse(await fs.readFile(playlistJsonPath, 'utf-8'))
  })
}
