const MEDIA_SCHEME = 'lads-media'

export function toMediaUrl(filePath) {
  if (!filePath) {
    return null
  }
  if (filePath.startsWith('http://') || filePath.startsWith('https://')) {
    return filePath
  }
  return `${MEDIA_SCHEME}://${encodeURIComponent(filePath)}`
}
