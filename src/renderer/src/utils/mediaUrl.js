const MEDIA_SCHEME = 'lads-media'

export function toMediaUrl(filePath) {
  if (!filePath) {
    return null
  }
  return `${MEDIA_SCHEME}://${encodeURIComponent(filePath)}`
}
