import { protocol } from 'electron'
import { createReadStream } from 'node:fs'
import { stat } from 'node:fs/promises'
import { extname } from 'node:path'
import { Readable } from 'node:stream'
import { isMediaFilePath, parseRangeHeader } from './lib/validation.mjs'

const MEDIA_SCHEME = 'lads-media'
const SCHEME_PREFIX = `${MEDIA_SCHEME}://`

protocol.registerSchemesAsPrivileged([{ scheme: MEDIA_SCHEME, privileges: { stream: true } }])

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

function errorResponse(status, message) {
  return new Response(message, { status, headers: { 'Content-Type': 'text/plain' } })
}

function decodeFilePath(url) {
  try {
    return decodeURIComponent(url.slice(SCHEME_PREFIX.length))
  } catch {
    return null
  }
}

async function handleMediaRequest(request) {
  const filePath = decodeFilePath(request.url)
  // Seuls des médias sont servis : ce protocole ne doit pas pouvoir lire d'autres fichiers du poste.
  if (!isMediaFilePath(filePath)) {
    return errorResponse(403, 'Type de fichier non autorisé')
  }

  let stats
  try {
    stats = await stat(filePath)
  } catch {
    return errorResponse(404, 'Fichier introuvable')
  }
  if (!stats.isFile()) {
    return errorResponse(404, 'Fichier introuvable')
  }

  const contentType = MIME_TYPES[extname(filePath).toLowerCase()] ?? 'application/octet-stream'
  const rangeHeader = request.headers.get('range')

  if (rangeHeader) {
    const range = parseRangeHeader(rangeHeader, stats.size)
    if (!range) {
      return new Response(null, {
        status: 416,
        headers: { 'Content-Range': `bytes */${stats.size}` }
      })
    }
    const stream = createReadStream(filePath, range)
    return new Response(Readable.toWeb(stream), {
      status: 206,
      headers: {
        'Content-Type': contentType,
        'Content-Length': String(range.end - range.start + 1),
        'Content-Range': `bytes ${range.start}-${range.end}/${stats.size}`,
        'Accept-Ranges': 'bytes'
      }
    })
  }

  return new Response(Readable.toWeb(createReadStream(filePath)), {
    status: 200,
    headers: {
      'Content-Type': contentType,
      'Content-Length': String(stats.size),
      'Accept-Ranges': 'bytes'
    }
  })
}

export function registerMediaProtocol() {
  protocol.handle(MEDIA_SCHEME, handleMediaRequest)
}
