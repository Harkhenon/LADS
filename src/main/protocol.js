import { protocol } from 'electron'
import { createReadStream, statSync, existsSync } from 'node:fs'
import { Readable } from 'node:stream'

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

function contentTypeFor(filePath) {
  const dot = filePath.lastIndexOf('.')
  const ext = dot >= 0 ? filePath.slice(dot).toLowerCase() : ''
  return MIME_TYPES[ext] ?? 'application/octet-stream'
}

function errorResponse(status, message) {
  return new Response(message, { status, headers: { 'Content-Type': 'text/plain' } })
}

export function registerMediaProtocol() {
  protocol.handle(MEDIA_SCHEME, (request) => {
    const filePath = decodeURIComponent(request.url.slice(SCHEME_PREFIX.length))
    if (!existsSync(filePath)) {
      return errorResponse(404, 'Fichier introuvable')
    }

    const stats = statSync(filePath)
    const contentType = contentTypeFor(filePath)
    const rangeHeader = request.headers.get('range')

    if (rangeHeader) {
      const match = /bytes=(\d+)-(\d*)/.exec(rangeHeader)
      if (!match) {
        return errorResponse(416, 'Plage invalide')
      }
      const start = Number(match[1])
      const end = match[2] ? Math.min(Number(match[2]), stats.size - 1) : stats.size - 1
      if (start >= stats.size || start > end) {
        return new Response(null, {
          status: 416,
          headers: { 'Content-Range': `bytes */${stats.size}` }
        })
      }
      const stream = createReadStream(filePath, { start, end })
      return new Response(Readable.toWeb(stream), {
        status: 206,
        headers: {
          'Content-Type': contentType,
          'Content-Length': String(end - start + 1),
          'Content-Range': `bytes ${start}-${end}/${stats.size}`,
          'Accept-Ranges': 'bytes'
        }
      })
    }

    const stream = createReadStream(filePath)
    return new Response(Readable.toWeb(stream), {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Length': String(stats.size),
        'Accept-Ranges': 'bytes'
      }
    })
  })
}
