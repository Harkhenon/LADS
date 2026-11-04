import { ipcMain } from 'electron'

const MAX_QUERY_LENGTH = 300
const MAX_RESULTS = 5

let sessionPromise = null

// Session créée à la première recherche : démarrer sans réseau ne doit rien casser.
// retrieve_player: false, car la recherche n'a pas besoin du lecteur JavaScript de YouTube.
function getSession() {
  if (!sessionPromise) {
    sessionPromise = import('youtubei.js')
      .then(({ Innertube }) => Innertube.create({ retrieve_player: false }))
      .catch((error) => {
        sessionPromise = null
        throw error
      })
  }
  return sessionPromise
}

// Vidéo en direct, avant-première… : YouTube omet certains champs selon le type de résultat.
function extractVideoData(video) {
  return {
    id: video.video_id,
    title: video.title?.text ?? 'Sans titre',
    author: {
      id: video.author?.id ?? null,
      name: video.author?.name ?? 'Auteur inconnu'
    },
    url: `https://www.youtube.com/embed/${video.video_id}`,
    thumbnails: video.thumbnails?.map((t) => t.url) ?? [],
    duration: video.length_text?.text ?? '',
    published: video.published?.text ?? ''
  }
}

async function search(texte) {
  const session = await getSession()
  try {
    return await session.search(texte)
  } catch {
    // Session expirée : on en recrée une et on retente une seule fois.
    sessionPromise = null
    return (await getSession()).search(texte)
  }
}

export default function youtube() {
  ipcMain.handle('youtube:search', async (_event, texte) => {
    const query = typeof texte === 'string' ? texte.trim().slice(0, MAX_QUERY_LENGTH) : ''
    if (!query) {
      return []
    }
    const results = await search(query)
    return results.videos.slice(0, MAX_RESULTS).map(extractVideoData)
  })
}
