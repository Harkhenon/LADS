export function mediaFileToKaraoke(file) {
  return {
    id: `k-${crypto.randomUUID()}`,
    title: file.name.replace(/\.[^.]+$/, ''),
    format: file.format,
    resolution: file.format === 'mp3' ? 'audio' : '',
    duration: '',
    addedAt: new Date().toISOString().slice(0, 10),
    filePath: file.path
  }
}
