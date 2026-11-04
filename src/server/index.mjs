import crypto from 'node:crypto'
import { createReadStream } from 'node:fs'
import fs from 'node:fs/promises'
import http from 'node:http'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { addClient, clientCount, setClientListeners } from './events.mjs'
import {
  SESSION_COOKIE,
  isAllowedHost,
  isAllowedOrigin,
  readCookie,
  resolveStaticPath,
  safeEqual
} from './lib/httpGuards.mjs'
import { log } from './log.mjs'
import { pickMediaFiles, serveMedia } from './media.mjs'
import { dataDir, lockFile } from './paths.mjs'
import { readPlaylists, updatePlaylists } from './playlists.mjs'
import { writeFileAtomic } from './tools.mjs'
import { checkForUpdates, confirmHealthy, startUpdateLoop, updateStatus } from './updater.mjs'
import { openAppWindow } from './window.mjs'
import { searchYoutube } from './youtube.mjs'
import { cancelAllDownloads, cancelDownload, ensureTools, startDownload } from './ytdlp.mjs'

const DEV = Boolean(process.env.LADS_DEV)
const DEV_PORT = 5199
const DEV_ORIGINS = ['http://localhost:5173', 'http://127.0.0.1:5173']
const MAX_BODY_BYTES = 10 * 1024 * 1024
// Code de sortie compris par le lanceur : relancer l'application tout de suite.
const EXIT_RESTART = 75
// Le temps de recharger la page : au-delà, la fenêtre a été fermée et le serveur s'arrête.
const NO_CLIENT_GRACE_MS = 15000
const FIRST_CLIENT_TIMEOUT_MS = 120000

const uiDir = path.join(path.dirname(fileURLToPath(import.meta.url)), 'ui')
const token = DEV ? 'dev' : crypto.randomBytes(32).toString('hex')

// En-tête plutôt que balise <meta> : certains antivirus réécrivent le HTML et casseraient la politique.
const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: https://*.ytimg.com https://*.ggpht.com https://*.googleusercontent.com",
  "connect-src 'self'",
  'frame-src https://www.youtube.com',
  "media-src 'self'",
  "object-src 'none'",
  "base-uri 'none'",
  "form-action 'none'",
  "frame-ancestors 'none'"
].join('; ')

const STATIC_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.webp': 'image/webp',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
}

let port = DEV_PORT
let shutdownTimer = null
let shuttingDown = false

class HttpError extends Error {
  constructor(status, message) {
    super(message)
    this.status = status
  }
}

function sendJson(res, status, value) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' })
  res.end(JSON.stringify(value ?? null))
}

function readJsonBody(req) {
  if (!String(req.headers['content-type']).startsWith('application/json')) {
    // Un formulaire d'un autre site ne peut pas envoyer ce type de contenu sans passer par CORS.
    throw new HttpError(415, 'Type de contenu non pris en charge')
  }
  return new Promise((resolve, reject) => {
    const chunks = []
    let size = 0
    req.on('data', (chunk) => {
      size += chunk.length
      if (size > MAX_BODY_BYTES) {
        reject(new HttpError(413, 'Requête trop volumineuse'))
        req.destroy()
        return
      }
      chunks.push(chunk)
    })
    req.on('end', () => {
      try {
        resolve(chunks.length ? JSON.parse(Buffer.concat(chunks).toString('utf8')) : null)
      } catch {
        reject(new HttpError(400, 'JSON invalide'))
      }
    })
    req.on('error', reject)
  })
}

async function serveStatic(res, urlPath) {
  const requested = urlPath === '/' ? '/index.html' : urlPath
  const filePath = resolveStaticPath(uiDir, requested)
  if (!filePath) {
    throw new HttpError(403, 'Chemin refusé')
  }
  const stats = await fs.stat(filePath).catch(() => null)
  if (!stats?.isFile()) {
    throw new HttpError(404, 'Introuvable')
  }
  res.writeHead(200, {
    'Content-Type': STATIC_TYPES[path.extname(filePath)] ?? 'application/octet-stream',
    'Content-Length': String(stats.size),
    'Cache-Control':
      requested === '/index.html' ? 'no-store' : 'public, max-age=31536000, immutable'
  })
  createReadStream(filePath).pipe(res)
}

async function handleApi(req, res, url) {
  const route = `${req.method} ${url.pathname}`
  switch (route) {
    case 'GET /api/events':
      addClient(res)
      confirmHealthy()
      return
    case 'GET /api/status':
      return sendJson(res, 200, updateStatus())
    case 'GET /api/playlists':
      return sendJson(res, 200, await readPlaylists())
    case 'PUT /api/playlists':
      return sendJson(res, 200, await updatePlaylists(await readJsonBody(req)))
    case 'POST /api/youtube/search':
      return sendJson(res, 200, await searchYoutube((await readJsonBody(req))?.query))
    case 'POST /api/media/pick':
      return sendJson(res, 200, await pickMediaFiles())
    case 'GET /api/media':
      return serveMedia(req, res, url.searchParams.get('path'))
    case 'POST /api/tools/ensure':
      await ensureTools()
      return sendJson(res, 200, { ok: true })
    case 'POST /api/downloads':
      return sendJson(res, 200, await startDownload(await readJsonBody(req)))
    case 'POST /api/downloads/cancel':
      return sendJson(res, 200, { cancelled: cancelDownload((await readJsonBody(req))?.id) })
    case 'POST /api/update/check':
      await checkForUpdates()
      return sendJson(res, 200, updateStatus())
    case 'POST /api/update/restart':
      sendJson(res, 200, { ok: true })
      shutdown(EXIT_RESTART)
      return
    default:
      throw new HttpError(404, 'Introuvable')
  }
}

async function handleRequest(req, res) {
  const allowedOrigins = DEV ? DEV_ORIGINS : []
  const hostOk =
    isAllowedHost(req.headers.host, port) ||
    (DEV && DEV_ORIGINS.some((origin) => origin.endsWith(`//${req.headers.host}`)))
  if (!hostOk || !isAllowedOrigin(req.headers.origin, port, allowedOrigins)) {
    throw new HttpError(403, 'Accès refusé')
  }

  const url = new URL(req.url, `http://127.0.0.1:${port}`)
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.setHeader('Content-Security-Policy', CONTENT_SECURITY_POLICY)
  res.setHeader('X-Frame-Options', 'DENY')
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin')
  res.setHeader('Cross-Origin-Resource-Policy', 'same-origin')

  // Le jeton passe une fois par l'URL d'ouverture, puis uniquement par un cookie inaccessible au code.
  if (url.pathname === '/login') {
    if (!safeEqual(url.searchParams.get('t') ?? '', token)) {
      throw new HttpError(403, 'Accès refusé')
    }
    res.writeHead(302, {
      'Set-Cookie': `${SESSION_COOKIE}=${token}; HttpOnly; SameSite=Strict; Path=/`,
      Location: '/'
    })
    res.end()
    return
  }

  if (req.method === 'POST' && url.pathname === '/internal/open') {
    if (!safeEqual(req.headers['x-lads-token'] ?? '', token)) {
      throw new HttpError(403, 'Accès refusé')
    }
    openAppWindow(loginUrl())
    return sendJson(res, 200, { ok: true })
  }

  if (!safeEqual(readCookie(req.headers.cookie, SESSION_COOKIE) ?? '', token)) {
    throw new HttpError(403, 'Accès refusé')
  }

  if (url.pathname.startsWith('/api/')) {
    await handleApi(req, res, url)
    return
  }
  if (req.method !== 'GET') {
    throw new HttpError(405, 'Méthode non autorisée')
  }
  await serveStatic(res, url.pathname)
}

const loginUrl = () => `http://127.0.0.1:${port}/login?t=${token}`

function shutdown(code = 0) {
  if (shuttingDown) {
    return
  }
  shuttingDown = true
  // Sans cela, yt-dlp et ffmpeg continueraient de tourner une fois l'application fermée.
  cancelAllDownloads()
  fs.rm(lockFile, { force: true })
    .catch(() => {})
    .finally(() => process.exit(code))
}

function scheduleShutdownIfNoClient(delay) {
  clearTimeout(shutdownTimer)
  shutdownTimer = setTimeout(() => {
    if (clientCount() === 0) {
      log('info', 'fenêtre fermée : arrêt du serveur')
      shutdown(0)
    }
  }, delay)
}

// Une instance tourne déjà ? On lui demande d'ouvrir une fenêtre plutôt que d'en démarrer une autre,
// qui écrirait en même temps dans playlists.json.
async function focusExistingInstance() {
  let existing
  try {
    existing = JSON.parse(await fs.readFile(lockFile, 'utf8'))
  } catch {
    return false
  }
  try {
    const response = await fetch(`http://127.0.0.1:${existing.port}/internal/open`, {
      method: 'POST',
      headers: { 'x-lads-token': existing.token },
      signal: AbortSignal.timeout(3000)
    })
    return response.ok
  } catch {
    return false
  }
}

async function main() {
  await fs.mkdir(dataDir, { recursive: true })
  if (!DEV && (await focusExistingInstance())) {
    log('info', 'instance déjà active : fenêtre réouverte')
    process.exit(0)
  }

  const server = http.createServer((req, res) => {
    handleRequest(req, res).catch((error) => {
      const status = error instanceof HttpError ? error.status : 500
      if (status === 500) {
        log('error', `${req.method} ${req.url?.split('?')[0]} :`, error)
      }
      if (res.headersSent) {
        res.destroy()
      } else {
        sendJson(res, status, { error: String(error?.message ?? 'Erreur interne') })
      }
    })
  })

  // Uniquement la boucle locale : rien n'est accessible depuis le réseau.
  await new Promise((resolve, reject) => {
    server.once('error', reject)
    server.listen(DEV ? DEV_PORT : 0, '127.0.0.1', resolve)
  })
  port = server.address().port

  // Le jeton n'est écrit que dans le profil de l'utilisateur.
  await writeFileAtomic(lockFile, JSON.stringify({ port, token, pid: process.pid }), {
    encoding: 'utf8',
    mode: 0o600
  })
  log('info', `LADS ${updateStatus().version} démarré, Node ${process.version}, port ${port}`)

  if (!DEV) {
    setClientListeners({
      onFirstClient: () => clearTimeout(shutdownTimer),
      onEmpty: () => scheduleShutdownIfNoClient(NO_CLIENT_GRACE_MS)
    })
    scheduleShutdownIfNoClient(FIRST_CLIENT_TIMEOUT_MS)
    if (!process.env.LADS_NO_WINDOW) {
      openAppWindow(loginUrl())
    }
  }
  startUpdateLoop()
}

process.on('SIGINT', () => shutdown(0))
process.on('SIGTERM', () => shutdown(0))
process.on('uncaughtException', (error) => {
  log('error', 'erreur non gérée :', error.stack ?? error)
  shutdown(1)
})
process.on('unhandledRejection', (error) => log('error', 'promesse rejetée :', error))

main().catch((error) => {
  log('error', 'démarrage impossible :', error.stack ?? error)
  process.exit(1)
})
