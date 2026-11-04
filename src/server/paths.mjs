import os from 'node:os'
import path from 'node:path'

// Même dossier que la version Electron : les playlists existantes sont reprises telles quelles.
export const dataDir =
  process.env.LADS_DATA_DIR ?? path.join(process.env.APPDATA ?? os.homedir(), 'lads')

export const binDir = path.join(dataDir, 'bin')
export const lockFile = path.join(dataDir, 'server.json')
export const logFile = path.join(dataDir, 'lads.log')
export const browserProfileDir = path.join(dataDir, 'browser-profile')

// Défini par le lanceur. Absent en développement : les mises à jour sont alors désactivées.
export const installDir = process.env.LADS_INSTALL_DIR ?? null

export function knownFolder(name) {
  const home = os.homedir()
  const folders = {
    documents: path.join(home, 'Documents'),
    desktop: path.join(home, 'Desktop'),
    music: path.join(home, 'Music')
  }
  return folders[name]
}
