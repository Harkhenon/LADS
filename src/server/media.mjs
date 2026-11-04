import { execFile } from 'node:child_process'
import { createReadStream } from 'node:fs'
import { stat } from 'node:fs/promises'
import { basename, extname, join } from 'node:path'
import {
  AUDIO_EXTENSIONS,
  MEDIA_EXTENSIONS,
  isMediaFilePath,
  parseRangeHeader
} from './lib/validation.mjs'

const MIME_TYPES = {
  '.mp4': 'video/mp4',
  '.m4v': 'video/mp4',
  '.mkv': 'video/x-matroska',
  '.webm': 'video/webm',
  '.avi': 'video/x-msvideo',
  '.mp3': 'audio/mpeg',
  '.m4a': 'audio/mp4',
  '.aac': 'audio/aac',
  '.wav': 'audio/wav',
  '.flac': 'audio/flac',
  '.ogg': 'audio/ogg',
  '.opus': 'audio/opus'
}

function plainError(res, status, message) {
  res.writeHead(status, { 'Content-Type': 'text/plain; charset=utf-8' })
  res.end(message)
}

export async function serveMedia(req, res, filePath) {
  // Seuls des médias sont servis : cette route ne doit pas pouvoir lire d'autres fichiers du poste.
  if (!isMediaFilePath(filePath)) {
    plainError(res, 403, 'Type de fichier non autorisé')
    return
  }
  let stats
  try {
    stats = await stat(filePath)
  } catch {
    plainError(res, 404, 'Fichier introuvable')
    return
  }
  if (!stats.isFile()) {
    plainError(res, 404, 'Fichier introuvable')
    return
  }

  const contentType = MIME_TYPES[extname(filePath).toLowerCase()] ?? 'application/octet-stream'
  const headers = { 'Content-Type': contentType, 'Accept-Ranges': 'bytes' }
  let streamOptions
  if (req.headers.range) {
    const range = parseRangeHeader(req.headers.range, stats.size)
    if (!range) {
      res.writeHead(416, { 'Content-Range': `bytes */${stats.size}` })
      res.end()
      return
    }
    streamOptions = range
    res.writeHead(206, {
      ...headers,
      'Content-Length': String(range.end - range.start + 1),
      'Content-Range': `bytes ${range.start}-${range.end}/${stats.size}`
    })
  } else {
    res.writeHead(200, { ...headers, 'Content-Length': String(stats.size) })
  }

  const stream = createReadStream(filePath, streamOptions)
  stream.on('error', () => res.destroy())
  res.on('close', () => stream.destroy())
  stream.pipe(res)
}

function toMediaFile(filePath, size) {
  const ext = extname(filePath).toLowerCase()
  return {
    id: `f-${Buffer.from(filePath).toString('base64url')}`,
    name: basename(filePath),
    path: filePath,
    format: AUDIO_EXTENSIONS.includes(ext) ? 'mp3' : 'mp4',
    extension: ext.slice(1),
    size
  }
}

// Un navigateur ne donne jamais le chemin d'un fichier choisi, alors que le lecteur en a besoin
// même après un redémarrage : d'où le sélecteur de Windows, ouvert au premier plan.
function openWindowsDialog() {
  const patterns = MEDIA_EXTENSIONS.map((ext) => `*${ext}`).join(';')
  const script = `
    Add-Type -AssemblyName System.Windows.Forms
    [Console]::OutputEncoding = [Text.Encoding]::UTF8
    $owner = New-Object System.Windows.Forms.Form -Property @{ TopMost = $true; ShowInTaskbar = $false; Opacity = 0 }
    $owner.Show()
    $owner.Activate()
    $dialog = New-Object System.Windows.Forms.OpenFileDialog
    $dialog.Title = 'Ajouter des fichiers à la playlist'
    $dialog.Multiselect = $true
    $dialog.Filter = 'Audio et vidéo|${patterns}'
    if ($dialog.ShowDialog($owner) -eq 'OK') { ConvertTo-Json -Compress @($dialog.FileNames) }
    $owner.Close()
  `
  const encoded = Buffer.from(script, 'utf16le').toString('base64')
  const powershell = join(
    process.env.SystemRoot ?? 'C:\\Windows',
    'System32',
    'WindowsPowerShell',
    'v1.0',
    'powershell.exe'
  )
  return new Promise((resolve, reject) => {
    execFile(
      powershell,
      ['-NoProfile', '-NonInteractive', '-STA', '-EncodedCommand', encoded],
      { windowsHide: true, encoding: 'utf8', maxBuffer: 4 * 1024 * 1024 },
      (error, stdout) => (error ? reject(error) : resolve(stdout.trim()))
    )
  })
}

export async function pickMediaFiles() {
  const output = await openWindowsDialog()
  if (!output) {
    return null
  }
  const paths = JSON.parse(output)
  return Promise.all(
    paths.map(async (filePath) => {
      const size = await stat(filePath).then(
        (s) => s.size,
        () => null
      )
      return toMediaFile(filePath, size)
    })
  )
}
