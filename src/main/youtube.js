import { ipcMain } from 'electron'

let Youtube = null

async function initYoutube() {
  const { Innertube } = await import('youtubei.js')
  Youtube = await Innertube.create()
}

// Fonction pour extraire les données utiles d'une vidéo
function extractVideoData(video) {
  return {
    id: video.video_id,
    title: video.title.text,
    author: {
      id: video.author.id,
      name: video.author.name
    },
    url: `https://youtube.com/embed/${video.video_id}`,
    thumbnails: video.thumbnails?.map((t) => t.url),
    duration: video.length_text.text,
    published: video.published.text
  }
}

export default function youtube() {
  initYoutube().then(() => {
    ipcMain.handle('youtube:search', async (event, texte) => {
      const results = await Youtube.search(texte)
      const resultats = results.videos.slice(0, 5)

      return await resultats.map((r) => extractVideoData(r))
    })
  })
}
