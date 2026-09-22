import { app, BrowserWindow, ipcMain } from 'electron'
import { is } from '@electron-toolkit/utils'
import { mkdirSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import crypto from 'node:crypto'
import YTDlpWrapModule from 'yt-dlp-wrap'

const YTDlpWrap = YTDlpWrapModule.default ?? YTDlpWrapModule

const YT_DLP_CHANNELS = {
  event: 'lads:ytdlp-event',
  binaryStatus: 'lads:ytdlp-binary-status',
  binaryDownload: 'lads:ytdlp-binary-download',
  downloadStart: 'lads:ytdlp-download-start',
  downloadCancel: 'lads:ytdlp-download-cancel'
}

const RESOLUTION_HEIGHTS = {
  '2160p': 2160,
  '1440p': 1440,
  '1080p': 1080,
  '720p': 720,
  '480p': 480,
  '360p': 360
}

const DOWNLOAD_LOCATIONS = ['documents', 'desktop', 'music', 'custom']

let ytDlpWrap = null
const downloads = new Map()

function binaryPath() {
  const fileName = process.platform === 'win32' ? 'yt-dlp.exe' : 'yt-dlp'
  return join(app.getPath('userData'), 'bin', fileName)
}

function getBinaryStatus() {
  return {
    state: existsSync(binaryPath()) ? 'ready' : 'missing',
    path: binaryPath(),
    version: null
  }
}

function broadcastEvent(event, payload) {
  for (const win of BrowserWindow.getAllWindows()) {
    win.webContents.send(YT_DLP_CHANNELS.event, { event, ...payload })
  }
}

function resolveOutputDir(config) {
  if (config.location === 'custom' && config.customLocation) {
    return config.customLocation
  }
  if (config.location === 'desktop') {
    return app.getPath('desktop')
  }
  if (config.location === 'music') {
    return app.getPath('music')
  }
  return join(app.getPath('documents'), 'LADS')
}

function buildArgs(config) {
  const args = [`https://www.youtube.com/watch?v=${config.videoId}`]
  if (config.format === 'audio') {
    args.push('-x', '--audio-format', 'mp3')
  } else {
    const height = RESOLUTION_HEIGHTS[config.resolution] ?? 1080
    args.push('-f', `bv*[height<=${height}]+ba/b[height<=${height}]`)
    args.push('--merge-output-format', 'mp4')
  }
  args.push('--newline')
  args.push('-o', join(resolveOutputDir(config), '%(title)s.%(ext)s'))
  return args
}

function sanitizeProgress(progress) {
  const percent = Number.isFinite(progress.percent) ? progress.percent : null
  return {
    percent,
    totalSize: progress.totalSize ?? null,
    speed: progress.currentSpeed ?? null,
    eta: progress.eta ?? null
  }
}

async function downloadBinary() {
  const status = getBinaryStatus()
  if (status.state === 'ready') {
    return status
  }
  broadcastEvent('binary-downloading')
  mkdirSync(join(app.getPath('userData'), 'bin'), { recursive: true })
  try {
    const version = await YTDlpWrap.getGithubReleases(1, 1).then((releases) => releases[0].tag_name)
    await YTDlpWrap.downloadFromGithub(binaryPath(), version)
    const ready = { ...getBinaryStatus(), version }
    broadcastEvent('binary-ready', ready)
    return ready
  } catch (error) {
    broadcastEvent('binary-error', { message: String(error?.message ?? error) })
    throw error
  }
}

async function startDownload(config) {
  const status = getBinaryStatus()
  if (status.state !== 'ready') {
    throw new Error(
      "Le binaire yt-dlp est introuvable. Installez-le depuis l'onglet Téléchargement."
    )
  }
  if (!config.videoId) {
    throw new Error('Aucune vidéo sélectionnée.')
  }
  if (!DOWNLOAD_LOCATIONS.includes(config.location)) {
    throw new Error('Emplacement de téléchargement invalide.')
  }

  const id = crypto.randomUUID()
  mkdirSync(resolveOutputDir(config), { recursive: true })

  const emitter = ytDlpWrap.exec(buildArgs(config))
  downloads.set(id, { process: emitter.ytDlpProcess, cancelled: false })

  emitter.on('progress', (progress) => {
    broadcastEvent('download-progress', { id, ...sanitizeProgress(progress) })
  })
  emitter.on('close', () => {
    const entry = downloads.get(id)
    broadcastEvent(entry?.cancelled ? 'download-cancelled' : 'download-completed', { id })
    downloads.delete(id)
  })
  emitter.on('error', (error) => {
    broadcastEvent('download-error', { id, message: String(error?.message ?? error) })
    downloads.delete(id)
  })

  return { id }
}

function cancelDownload(id) {
  const entry = downloads.get(id)
  if (!entry) {
    return false
  }
  entry.cancelled = true
  entry.process.kill()
  return true
}

function downloadBinaryInDev() {
  console.log('[LADS test] Téléchargement du binaire yt-dlp (dev)')
  broadcastEvent('binary-downloading')
  setTimeout(() => {
    broadcastEvent('binary-ready', { state: 'ready', version: '2025.01.01-mock' })
  }, 1200)
}

function startDownloadInDev(config) {
  console.log('[LADS test] Lancement téléchargement', config)
  const id = crypto.randomUUID()
  let percent = 0
  const timer = setInterval(() => {
    percent = Math.min(100, percent + 12)
    broadcastEvent('download-progress', {
      id,
      percent,
      totalSize: '~12.4MiB',
      speed: `${(Math.random() * 4 + 1).toFixed(2)}MiB/s`,
      eta: `${Math.ceil((100 - percent) / 12)}s`
    })
    if (percent >= 100) {
      clearInterval(timer)
      broadcastEvent('download-completed', { id })
    }
  }, 300)
  downloads.set(id, { timer, cancelled: false })
  return { id }
}

function cancelDownloadInDev(id) {
  const entry = downloads.get(id)
  if (!entry) {
    return false
  }
  clearInterval(entry.timer)
  broadcastEvent('download-cancelled', { id })
  downloads.delete(id)
  return true
}

export default function ytdlp() {
  ytDlpWrap = new YTDlpWrap(binaryPath())

  ipcMain.handle(YT_DLP_CHANNELS.binaryStatus, () => getBinaryStatus())
  ipcMain.handle(YT_DLP_CHANNELS.downloadStart, (_event, config) =>
    is.dev ? startDownloadInDev(config) : startDownload(config)
  )
  ipcMain.handle(YT_DLP_CHANNELS.downloadCancel, (_event, id) =>
    is.dev ? cancelDownloadInDev(id) : cancelDownload(id)
  )
  ipcMain.handle(YT_DLP_CHANNELS.binaryDownload, () =>
    is.dev ? downloadBinaryInDev() : downloadBinary()
  )
}

export { YT_DLP_CHANNELS }
