import { ipcMain, dialog } from 'electron'
import { statSync } from 'node:fs'
import { basename, extname } from 'node:path'
import { AUDIO_EXTENSIONS, MEDIA_EXTENSIONS } from './lib/validation.mjs'

const MEDIA_CHANNELS = {
  pickFiles: 'lads:media-pick-files'
}

function toMediaFile(filePath, folder) {
  const ext = extname(filePath).toLowerCase()
  return {
    id: `f-${Buffer.from(filePath).toString('base64url')}`,
    name: basename(filePath),
    path: filePath,
    folder,
    format: AUDIO_EXTENSIONS.includes(ext) ? 'mp3' : 'mp4',
    extension: ext.slice(1),
    size: null
  }
}

function registerMediaIpc() {
  ipcMain.handle(MEDIA_CHANNELS.pickFiles, async () => {
    const result = await dialog.showOpenDialog({
      title: 'Ajouter des fichiers à la playlist',
      properties: ['openFile', 'multiSelections'],
      filters: [
        {
          name: 'Audio et vidéo',
          extensions: MEDIA_EXTENSIONS.map((ext) => ext.slice(1))
        }
      ]
    })
    if (result.canceled) {
      return null
    }
    return result.filePaths.map((filePath) => {
      const media = toMediaFile(filePath)
      try {
        media.size = statSync(filePath).size
      } catch {
        media.size = null
      }
      return media
    })
  })
}

export default function media() {
  registerMediaIpc()
}

export { MEDIA_CHANNELS }
