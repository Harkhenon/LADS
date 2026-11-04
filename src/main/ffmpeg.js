import { join } from 'node:path'
import { FFMPEG, platformKey } from './lib/toolPins.mjs'
import { binDir, fetchVerified, installBinary, sha256File } from './tools'

function ffmpegPath() {
  return join(binDir(), process.platform === 'win32' ? 'ffmpeg.exe' : 'ffmpeg')
}

// Contrôle l'empreinte à chaque session : détecte aussi un binaire tronqué par une ancienne version.
export async function ensureFfmpeg() {
  const asset = FFMPEG.assets[platformKey()]
  if (!asset) {
    throw new Error(`ffmpeg n'est pas disponible pour ${platformKey()}.`)
  }
  const path = ffmpegPath()
  if ((await sha256File(path)) !== asset.sha256) {
    const buffer = await fetchVerified(`${FFMPEG.baseUrl}/${asset.name}`, asset.sha256)
    await installBinary(path, buffer)
  }
  return path
}
