import { app } from 'electron'
import { chmodSync, existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

function binDir() {
  return join(app.getPath('userData'), 'bin')
}

function ffmpegPath() {
  return join(binDir(), process.platform === 'win32' ? 'ffmpeg.exe' : 'ffmpeg')
}

function ffmpegAssetName() {
  const arch = process.arch === 'arm64' ? 'arm64' : process.arch === 'arm' ? 'arm' : 'x64'
  if (process.platform === 'win32') {
    return `ffmpeg-win32-${arch}`
  }
  if (process.platform === 'darwin') {
    return `ffmpeg-darwin-${arch}`
  }
  return `ffmpeg-linux-${arch}`
}

async function downloadFfmpeg() {
  const response = await fetch(
    'https://api.github.com/repos/eugeneware/ffmpeg-static/releases/latest',
    {
      headers: { 'User-Agent': 'LADS' }
    }
  )
  if (!response.ok) {
    throw new Error(`API GitHub injoignable (${response.status})`)
  }
  const release = await response.json()
  const asset = release.assets.find((a) => a.name === ffmpegAssetName())
  if (!asset) {
    throw new Error(`Asset ffmpeg introuvable (${ffmpegAssetName()})`)
  }
  const binaryResponse = await fetch(asset.browser_download_url)
  if (!binaryResponse.ok) {
    throw new Error(`Téléchargement de ffmpeg échoué (${binaryResponse.status})`)
  }
  const buffer = Buffer.from(await binaryResponse.arrayBuffer())
  mkdirSync(binDir(), { recursive: true })
  writeFileSync(ffmpegPath(), buffer)
  if (process.platform !== 'win32') {
    chmodSync(ffmpegPath(), 0o755)
  }
  return ffmpegPath()
}

export async function ensureFfmpeg() {
  if (existsSync(ffmpegPath())) {
    return ffmpegPath()
  }
  const path = await downloadFfmpeg()
  return path
}

export function isFfmpegReady() {
  return existsSync(ffmpegPath())
}

export { ffmpegPath }
