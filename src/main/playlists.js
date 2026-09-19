import { app, ipcMain } from 'electron'
import fs from 'node:fs/promises'
import path from 'node:path'

const playlistJsonPath = `${path.join(app.getPath('appData'), 'lads/playlists.json')}`

export default function registerPlaylistsHandles() {
  ipcMain.handle('playlists:update', async (event, playlists) => {
    const stringifiedPlaylists = JSON.stringify(playlists, null, 2)
    try {
      await fs.writeFile(playlistJsonPath, stringifiedPlaylists)
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
    if (fs.access(playlistJsonPath)) {
      return JSON.parse(await fs.readFile(playlistJsonPath))
    }

    console.info("[LADS] Aucun fichier de playlist existant, création d'un nouveau")
    await fs.writeFile(playlistJsonPath, '[]')
    return JSON.parse(await fs.readFile(playlistJsonPath))
  })
}
