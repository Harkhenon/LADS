// Fonctions pures (sans dépendance à Electron) pour pouvoir être testées avec `node --test`.
import path from 'node:path'

export const AUDIO_EXTENSIONS = ['.mp3', '.wav', '.flac', '.ogg', '.opus', '.m4a', '.aac']
export const VIDEO_EXTENSIONS = ['.mp4', '.m4v', '.mkv', '.webm', '.avi']
export const MEDIA_EXTENSIONS = [...AUDIO_EXTENSIONS, ...VIDEO_EXTENSIONS]

const DOWNLOAD_LOCATIONS = ['documents', 'desktop', 'music', 'custom']
const DOWNLOAD_FORMATS = ['video', 'audio']

// Seuls http(s) peuvent partir vers le système : file:, ms-msdt:, etc. permettent d'exécuter du code.
export function isSafeExternalUrl(url) {
  try {
    const { protocol } = new URL(url)
    return protocol === 'https:' || protocol === 'http:'
  } catch {
    return false
  }
}

export function isValidVideoId(videoId) {
  return typeof videoId === 'string' && /^[A-Za-z0-9_-]{11}$/.test(videoId)
}

export function isMediaFilePath(filePath) {
  return (
    typeof filePath === 'string' &&
    path.isAbsolute(filePath) &&
    MEDIA_EXTENSIONS.includes(path.extname(filePath).toLowerCase())
  )
}

// Renvoie un message d'erreur, ou null si la configuration est valide.
export function validateDownloadConfig(config) {
  if (!config || typeof config !== 'object') {
    return 'Configuration de téléchargement invalide.'
  }
  if (!isValidVideoId(config.videoId)) {
    return 'Aucune vidéo valide sélectionnée.'
  }
  if (!DOWNLOAD_FORMATS.includes(config.format)) {
    return 'Format de téléchargement invalide.'
  }
  if (!DOWNLOAD_LOCATIONS.includes(config.location)) {
    return 'Emplacement de téléchargement invalide.'
  }
  if (
    config.location === 'custom' &&
    (typeof config.customLocation !== 'string' || !path.isAbsolute(config.customLocation))
  ) {
    return 'Le dossier personnalisé doit être un chemin absolu.'
  }
  return null
}

// Renvoie { start, end } (inclus), ou null si la plage n'est pas satisfaisable.
export function parseRangeHeader(header, size) {
  const match = /^bytes=(\d*)-(\d*)$/.exec(String(header).trim())
  if (!match || (match[1] === '' && match[2] === '') || size === 0) {
    return null
  }
  if (match[1] === '') {
    const suffix = Number(match[2])
    return suffix === 0 ? null : { start: Math.max(0, size - suffix), end: size - 1 }
  }
  const start = Number(match[1])
  const end = match[2] === '' ? size - 1 : Math.min(Number(match[2]), size - 1)
  return start >= size || start > end ? null : { start, end }
}

// Lit un fichier au format `sha256sum` : "<hash>  <nom>" ou "<hash> *<nom>".
export function findChecksum(sumsText, fileName) {
  for (const line of String(sumsText).split(/\r?\n/)) {
    const match = /^([a-fA-F0-9]{64})\s+\*?(.+?)\s*$/.exec(line)
    if (match && match[2] === fileName) {
      return match[1].toLowerCase()
    }
  }
  return null
}

// Écarte ce qui ferait planter l'interface (fichier édité à la main, ancienne version, etc.).
export function normalizePlaylists(value) {
  if (!Array.isArray(value)) {
    return null
  }
  return value
    .filter((p) => p && typeof p.id === 'string' && typeof p.name === 'string')
    .map((p) => ({
      ...p,
      karaoke: Array.isArray(p.karaoke)
        ? p.karaoke.filter((k) => k && typeof k.id === 'string' && typeof k.title === 'string')
        : []
    }))
}

// Extrait la cause lisible d'une erreur yt-dlp (la sortie d'erreur complète est très verbeuse).
export function summarizeYtDlpError(message) {
  const lines = String(message).split(/\r?\n/)
  const errorLine = lines.reverse().find((line) => line.startsWith('ERROR:'))
  return errorLine ? errorLine.replace(/^ERROR:\s*/, '') : String(message).slice(0, 300)
}

// Lit une ligne « [download]  12.3% of ~10.00MiB at 1.50MiB/s ETA 00:10 ».
export function parseYtDlpProgress(line) {
  const match =
    /^\[download\]\s+([\d.]+)%\s+of\s+~?\s*(\S+)(?:\s+in\s+\S+)?(?:\s+at\s+(.+?))?(?:\s+ETA\s+(\S+))?(?:\s+\(frag.*\))?\s*$/.exec(
      line
    )
  if (!match) {
    return null
  }
  return {
    percent: Number(match[1]),
    totalSize: match[2],
    speed: match[3] ?? null,
    eta: match[4] ?? null
  }
}
