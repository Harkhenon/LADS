export const initialPlaylists = [
  {
    id: 'pl-1',
    name: 'Anniversaire Mamie',
    description: 'Chansons pour la fête de Mamie',
    karaoke: [
      {
        id: 'k-1',
        title: 'ABBA - Dancing Queen',
        duration: '3:51',
        format: 'mp4',
        resolution: '1080p',
        addedAt: '2025-01-12'
      },
      {
        id: 'k-2',
        title: 'Edith Piaf - Non, je ne regrette rien',
        duration: '2:21',
        format: 'mp3',
        resolution: 'audio',
        addedAt: '2025-02-03'
      }
    ]
  },
  {
    id: 'pl-2',
    name: 'Soirée karaoké',
    description: '',
    karaoke: [
      {
        id: 'k-3',
        title: 'Queen - Bohemian Rhapsody',
        duration: '5:55',
        format: 'mp4',
        resolution: '720p',
        addedAt: '2025-03-18'
      }
    ]
  }
]

export const initialSearchResults = [
  {
    id: 'yt-1',
    title: 'ABBA - Dancing Queen (Official Video)',
    channel: 'ABBA',
    duration: '3:51',
    thumbnail: '',
    url: 'https://www.youtube.com/watch?v=xy'
  },
  {
    id: 'yt-2',
    title: 'Queen - Bohemian Rhapsody (Official Video)',
    channel: 'Queen Official',
    duration: '5:55',
    thumbnail: '',
    url: 'https://www.youtube.com/watch?v=qq'
  },
  {
    id: 'yt-3',
    title: 'Edith Piaf - Non, je ne regrette rien',
    channel: 'Edith Piaf - Topic',
    duration: '2:21',
    thumbnail: '',
    url: 'https://www.youtube.com/watch?v=zz'
  },
  {
    id: 'yt-4',
    title: 'Les Enfoirés - La chanson du bénévole',
    channel: 'Les Enfoirés',
    duration: '4:02',
    thumbnail: '',
    url: 'https://www.youtube.com/watch?v=tt'
  },
  {
    id: 'yt-5',
    title: 'Céline Dion - My Heart Will Go On',
    channel: 'CelineDionVEVO',
    duration: '4:40',
    thumbnail: '',
    url: 'https://www.youtube.com/watch?v=rr'
  }
]

export const resolutionOptions = [
  { value: '2160p', label: '2160p (4K)' },
  { value: '1440p', label: '1440p (2K)' },
  { value: '1080p', label: '1080p (Full HD)' },
  { value: '720p', label: '720p (HD)' },
  { value: '480p', label: '480p' },
  { value: '360p', label: '360p' }
]

export const formatOptions = [
  { value: 'video', label: 'Vidéo (mp4)' },
  { value: 'audio', label: 'Audio uniquement (mp3)' }
]

export const downloadLocationOptions = [
  { value: 'documents', label: 'Dossier Documents / LADS' },
  { value: 'desktop', label: 'Bureau' },
  { value: 'music', label: 'Dossier Musique' },
  { value: 'custom', label: 'Emplacement personnalisé…' }
]
