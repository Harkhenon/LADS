import { ipcMain, dialog } from 'electron'
import { readdirSync, statSync } from 'node:fs'
import { join, basename, extname } from 'node:path'

const MEDIA_CHANNELS = {
  pickFolder: 'lads:media-pick-folder',
  listFiles: 'lads:media-list-files'
}

const AUDIO_EXTENSIONS = ['.mp3', '.wav', '.flac', '.ogg', '.m4a']
const VIDEO_EXTENSIONS = ['.mp4', '.mkv', '.webm', '.avi']
const MEDIA_EXTENSIONS = [...AUDIO_EXTENSIONS, ...VIDEO_EXTENSIONS]

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

function listMediaFiles(dirPath) {
  const files = []
  try {
    for (const name of readdirSync(dirPath)) {
      const filePath = join(dirPath, name)
      try {
        const stats = statSync(filePath)
        if (stats.isFile() && MEDIA_EXTENSIONS.includes(extname(name).toLowerCase())) {
          const media = toMediaFile(filePath, dirPath)
          media.size = stats.size
          files.push(media)
        }
      } catch {
        // fichier inaccessible, on l'ignore
      }
    }
  } catch {
    return []
  }
  return files
}

function registerMediaIpc() {
  ipcMain.handle(MEDIA_CHANNELS.pickFolder, async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openDirectory', 'createDirectory']
    })
    return result.canceled ? null : result.filePaths[0]
  })

  ipcMain.handle(MEDIA_CHANNELS.listFiles, (_event, dirPath) =>
    typeof dirPath === 'string' && dirPath ? listMediaFiles(dirPath) : []
  )
}

export default function media() {
  registerMediaIpc()
}

export { MEDIA_CHANNELS }
