import { spawn, spawnSync } from 'node:child_process'
import crypto from 'node:crypto'
import { existsSync, mkdirSync, readdirSync, statSync } from 'node:fs'
import fs from 'node:fs/promises'
import os from 'node:os'
import { extname, join } from 'node:path'
import { createInterface } from 'node:readline'
import { broadcast } from './events.mjs'
import { FFMPEG, YT_DLP, platformKey } from './lib/toolPins.mjs'
import {
  findChecksum,
  parseYtDlpProgress,
  summarizeYtDlpError,
  validateDownloadConfig
} from './lib/validation.mjs'
import { log } from './log.mjs'
import { binDir, knownFolder } from './paths.mjs'
import { fetchText, fetchVerified, installBinary, sha256File } from './tools.mjs'

const RESOLUTION_HEIGHTS = {
  '2160p': 2160,
  '1440p': 1440,
  '1080p': 1080,
  '720p': 720,
  '480p': 480,
  '360p': 360
}

const MAX_STDERR_LENGTH = 16 * 1024

let binaryChecked = false
let ffmpegLocation = null
let ensureToolsPromise = null
const downloads = new Map()

const binaryPath = () => join(binDir, 'yt-dlp.exe')
const ffmpegPath = () => join(binDir, 'ffmpeg.exe')

function broadcastEvent(event, payload) {
  broadcast('ytdlp', { event, ...payload })
}

function resolveOutputDir(config) {
  if (config.location === 'custom') {
    return config.customLocation
  }
  if (config.location === 'desktop' || config.location === 'music') {
    return knownFolder(config.location)
  }
  return join(knownFolder('documents'), 'LADS')
}

function buildArgs(config, outputDir, resultFile) {
  // --ignore-config et --no-plugin-dirs : un fichier de configuration ou un plugin yt-dlp présent
  // sur le poste (qui peut contenir --exec) ne doit pas influencer l'application.
  const args = ['--ignore-config', '--no-plugin-dirs', '--no-playlist', '--newline', '--no-mtime']
  // Le Node qui exécute LADS résout aussi les défis JavaScript de YouTube : rien d'autre à installer.
  args.push('--js-runtimes', `node:${process.execPath}`)
  if (ffmpegLocation) {
    args.push('--ffmpeg-location', ffmpegLocation)
  }
  if (config.format === 'audio') {
    if (ffmpegLocation) {
      args.push('-f', 'ba/b', '-x', '--audio-format', 'mp3')
    } else {
      args.push('-f', 'ba[ext=m4a]/ba[ext=webm]/ba')
    }
  } else {
    const height = RESOLUTION_HEIGHTS[config.resolution] ?? 1080
    if (ffmpegLocation) {
      args.push('-f', `bv*[height<=${height}]+ba/b[height<=${height}]/b`)
      args.push('--merge-output-format', 'mp4')
    } else {
      args.push('-f', `b[ext=mp4][height<=${height}]/b[height<=${height}]/b`)
    }
  }
  // -P n'interprète pas les « % » d'un nom de dossier, contrairement à -o.
  args.push('-P', outputDir, '-o', '%(title)s.%(ext)s')
  // yt-dlp indique lui-même le fichier final : rien à deviner, même avec plusieurs téléchargements.
  args.push('--print-to-file', 'after_move:filepath', resultFile)
  args.push('--', `https://www.youtube.com/watch?v=${config.videoId}`)
  return args
}

async function readResultFile(resultFile) {
  try {
    const lines = (await fs.readFile(resultFile, 'utf8')).split(/\r?\n/).filter(Boolean)
    return lines.at(-1) ?? null
  } catch {
    return null
  } finally {
    await fs.rm(resultFile, { force: true }).catch(() => {})
  }
}

// Solution de repli si yt-dlp n'a rien écrit dans le fichier de résultat.
function findOutputFile(outputDir, startedAt, format) {
  const extensions =
    format === 'audio' ? ['.mp3', '.m4a', '.webm', '.opus'] : ['.mp4', '.mkv', '.webm']
  let best = null
  let bestMtime = 0
  try {
    for (const name of readdirSync(outputDir)) {
      const filePath = join(outputDir, name)
      try {
        const stats = statSync(filePath)
        const ext = extname(name).toLowerCase()
        if (stats.isFile() && stats.mtimeMs >= startedAt && extensions.includes(ext)) {
          if (stats.mtimeMs > bestMtime) {
            best = filePath
            bestMtime = stats.mtimeMs
          }
        }
      } catch {
        // fichier inaccessible, on l'ignore
      }
    }
  } catch {
    return null
  }
  return best
}

// Télécharge yt-dlp ou le met à jour : YouTube casse régulièrement les anciennes versions.
// Sans réseau, ou si la mise à jour échoue, on garde la version déjà installée.
async function ensureBinary() {
  const assetName = YT_DLP.assets[platformKey()]
  if (!assetName) {
    throw new Error(`yt-dlp n'est pas disponible pour ${platformKey()}.`)
  }
  const path = binaryPath()
  const alreadyInstalled = existsSync(path)
  try {
    const sums = await fetchText(`${YT_DLP.baseUrl}/${YT_DLP.sumsFile}`)
    const expected = findChecksum(sums, assetName)
    if (!expected) {
      throw new Error(`Empreinte de ${assetName} introuvable.`)
    }
    if ((await sha256File(path)) === expected) {
      return
    }
    broadcastEvent('binary-downloading')
    await installBinary(path, await fetchVerified(`${YT_DLP.baseUrl}/${assetName}`, expected))
    broadcastEvent('binary-ready')
  } catch (error) {
    if (!alreadyInstalled) {
      throw error
    }
    log('warn', 'yt-dlp : mise à jour impossible, version installée conservée :', error)
  }
}

// Contrôle l'empreinte à chaque session : détecte aussi un binaire tronqué par une ancienne version.
async function ensureFfmpeg() {
  const asset = FFMPEG.assets[platformKey()]
  if (!asset) {
    throw new Error(`ffmpeg n'est pas disponible pour ${platformKey()}.`)
  }
  const path = ffmpegPath()
  if ((await sha256File(path)) !== asset.sha256) {
    await installBinary(path, await fetchVerified(`${FFMPEG.baseUrl}/${asset.name}`, asset.sha256))
  }
  return path
}

async function ensureToolsSteps() {
  if (!binaryChecked) {
    try {
      await ensureBinary()
      binaryChecked = true
    } catch (error) {
      const message = String(error?.message ?? error)
      broadcastEvent('binary-error', { message })
      throw new Error(`Installation automatique de yt-dlp échouée : ${message}`, { cause: error })
    }
  }
  broadcastEvent('runtime-ready')
  if (!ffmpegLocation) {
    broadcastEvent('ffmpeg-downloading')
    try {
      ffmpegLocation = await ensureFfmpeg()
      broadcastEvent('ffmpeg-ready')
    } catch (error) {
      // Non bloquant : sans ffmpeg, yt-dlp se rabat sur les formats sans conversion.
      // ffmpegLocation reste vide : une nouvelle tentative aura lieu au prochain téléchargement.
      broadcastEvent('ffmpeg-error', { message: String(error?.message ?? error) })
    }
  }
  broadcastEvent('tools-ready')
}

export function ensureTools() {
  if (binaryChecked && ffmpegLocation) {
    return Promise.resolve()
  }
  if (!ensureToolsPromise) {
    ensureToolsPromise = ensureToolsSteps().finally(() => {
      ensureToolsPromise = null
    })
  }
  return ensureToolsPromise
}

export async function startDownload(config) {
  const invalid = validateDownloadConfig(config)
  if (invalid) {
    throw new Error(invalid)
  }
  await ensureTools()

  const id = crypto.randomUUID()
  const outputDir = resolveOutputDir(config)
  mkdirSync(outputDir, { recursive: true })
  const startedAt = Date.now()
  const resultFile = join(os.tmpdir(), `lads-${id}.txt`)

  // Pas de shell : les arguments arrivent tels quels à yt-dlp, sans interprétation.
  const child = spawn(binaryPath(), buildArgs(config, outputDir, resultFile), {
    windowsHide: true,
    cwd: binDir,
    stdio: ['ignore', 'pipe', 'pipe']
  })
  downloads.set(id, { process: child, cancelled: false })

  createInterface({ input: child.stdout }).on('line', (line) => {
    const progress = parseYtDlpProgress(line)
    if (progress) {
      broadcastEvent('download-progress', { id, ...progress })
    }
  })

  let stderrTail = ''
  child.stderr.on('data', (chunk) => {
    stderrTail = `${stderrTail}${chunk}`.slice(-MAX_STDERR_LENGTH)
  })

  // 'error' (lancement impossible) et 'close' peuvent se suivre : un seul résultat est annoncé.
  const finish = async (exitCode, failure) => {
    const entry = downloads.get(id)
    if (!entry) {
      return
    }
    downloads.delete(id)
    const reported = await readResultFile(resultFile)
    if (entry.cancelled) {
      broadcastEvent('download-cancelled', { id })
    } else if (exitCode === 0) {
      broadcastEvent('download-completed', {
        id,
        filePath: reported ?? findOutputFile(outputDir, startedAt, config.format)
      })
    } else {
      // Smart App Control peut refuser yt-dlp ou l'un de ses composants : garder la trace pour vous.
      log('error', 'téléchargement échoué :', failure ?? stderrTail)
      broadcastEvent('download-error', {
        id,
        message: summarizeYtDlpError(failure?.message ?? stderrTail)
      })
    }
  }
  child.on('error', (error) => finish(null, error))
  child.on('close', (code) => finish(code))

  return { id }
}

// Sous Windows, yt-dlp.exe lance un processus enfant (et ffmpeg) : tuer le parent ne suffit pas.
function killProcessTree(child) {
  if (process.platform === 'win32' && child.pid) {
    const taskkill = join(process.env.SystemRoot ?? 'C:\\Windows', 'System32', 'taskkill.exe')
    spawnSync(taskkill, ['/PID', String(child.pid), '/T', '/F'], { windowsHide: true })
  } else {
    child.kill()
  }
}

export function cancelDownload(id) {
  const entry = downloads.get(id)
  if (!entry) {
    return false
  }
  entry.cancelled = true
  killProcessTree(entry.process)
  return true
}

export function cancelAllDownloads() {
  for (const id of [...downloads.keys()]) {
    cancelDownload(id)
  }
}

export function activeDownloadCount() {
  return downloads.size
}
