// Contrôles d'accès du serveur local, en fonctions pures pour être testés.
//
// Un site ouvert dans n'importe quel navigateur du poste peut envoyer des requêtes vers 127.0.0.1.
// Sans ces contrôles, il pourrait lire des fichiers ou lancer des téléchargements.
import crypto from 'node:crypto'
import path from 'node:path'

export const SESSION_COOKIE = 'lads_session'

export function safeEqual(a, b) {
  const left = Buffer.from(String(a))
  const right = Buffer.from(String(b))
  return left.length === right.length && crypto.timingSafeEqual(left, right)
}

// Bloque le « DNS rebinding » : un domaine qui se résout vers 127.0.0.1 garde son propre Host.
export function isAllowedHost(hostHeader, port) {
  return hostHeader === `127.0.0.1:${port}`
}

export function isAllowedOrigin(originHeader, port, extraOrigins = []) {
  return (
    originHeader === undefined ||
    originHeader === `http://127.0.0.1:${port}` ||
    extraOrigins.includes(originHeader)
  )
}

export function readCookie(cookieHeader, name) {
  for (const part of String(cookieHeader ?? '').split(';')) {
    const separator = part.indexOf('=')
    if (separator > 0 && part.slice(0, separator).trim() === name) {
      return part.slice(separator + 1).trim()
    }
  }
  return null
}

// Résout un chemin d'URL dans le dossier de l'interface, ou renvoie null s'il en sort.
export function resolveStaticPath(rootDir, urlPath) {
  let decoded
  try {
    decoded = decodeURIComponent(urlPath)
  } catch {
    return null
  }
  if (decoded.includes('\0')) {
    return null
  }
  const root = path.resolve(rootDir)
  const target = path.resolve(root, `.${decoded.replaceAll('\\', '/')}`)
  return target === root || target.startsWith(root + path.sep) ? target : null
}
