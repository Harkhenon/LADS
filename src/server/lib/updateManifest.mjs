// Fonctions pures de vérification des mises à jour, testées avec `node --test`.
import crypto from 'node:crypto'
import path from 'node:path'

// Compare deux versions x.y.z. Renvoie null si l'une n'est pas une version stable valide.
export function compareVersions(a, b) {
  const parse = (v) => (/^\d+\.\d+\.\d+$/.test(String(v)) ? String(v).split('.').map(Number) : null)
  const left = parse(a)
  const right = parse(b)
  if (!left || !right) {
    return null
  }
  for (let i = 0; i < 3; i++) {
    if (left[i] !== right[i]) {
      return left[i] > right[i] ? 1 : -1
    }
  }
  return 0
}

export function verifySignature(bytes, signatureBase64, publicKeyPem) {
  try {
    return crypto.verify(
      null,
      bytes,
      crypto.createPublicKey(publicKeyPem),
      Buffer.from(String(signatureBase64).trim(), 'base64')
    )
  } catch {
    return false
  }
}

const SHA256 = /^[a-f0-9]{64}$/
const SAFE_FILE = /^[A-Za-z0-9._-]+$/

// Renvoie le manifeste s'il est complet et bien formé, sinon null. À n'appeler qu'après la signature.
export function parseManifest(bytes) {
  let manifest
  try {
    manifest = JSON.parse(Buffer.from(bytes).toString('utf8'))
  } catch {
    return null
  }
  const { version, app, node } = manifest ?? {}
  const appOk = app && SAFE_FILE.test(app.file ?? '') && SHA256.test(app.sha256 ?? '')
  const nodeOk =
    node &&
    /^\d+\.\d+\.\d+$/.test(node.version ?? '') &&
    SAFE_FILE.test(node.file ?? '') &&
    SHA256.test(node.sha256 ?? '')
  if (compareVersions(version, '0.0.0') === null || !appOk || !nodeOk) {
    return null
  }
  return manifest
}

// Protège de l'écriture hors du dossier cible quand une archive est extraite.
export function safeEntryPath(rootDir, entryName) {
  const normalized = String(entryName).replaceAll('\\', '/')
  if (
    !normalized ||
    normalized.includes('\0') ||
    normalized.startsWith('/') ||
    /^[A-Za-z]:/.test(normalized) ||
    normalized.split('/').includes('..')
  ) {
    return null
  }
  const root = path.resolve(rootDir)
  const target = path.resolve(root, normalized)
  return target.startsWith(root + path.sep) ? target : null
}
