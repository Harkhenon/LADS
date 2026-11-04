export function toMediaUrl(filePath) {
  if (!filePath) {
    return null
  }
  return `/api/media?path=${encodeURIComponent(filePath)}`
}
