// Relie l'interface au serveur local, avec les mêmes fonctions que les composants utilisaient déjà.
/* global __APP_INFO__ */

async function request(method, url, body) {
  const response = await fetch(url, {
    method,
    headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body)
  })
  const data = await response.json().catch(() => null)
  if (!response.ok) {
    throw new Error(data?.error ?? `Erreur ${response.status}`)
  }
  return data
}

const listeners = { ytdlp: new Set(), update: new Set() }
let source = null

function connectEvents() {
  if (source) {
    return
  }
  source = new EventSource('/api/events')
  source.onmessage = (message) => {
    const { channel, payload } = JSON.parse(message.data)
    for (const callback of listeners[channel] ?? []) {
      callback(payload)
    }
  }
}

function subscribe(channel, callback) {
  listeners[channel].add(callback)
  return () => listeners[channel].delete(callback)
}

// La connexion indique aussi au serveur que la fenêtre est ouverte : elle ne dépend d'aucun onglet.
connectEvents()

window.base = {
  appVersion: () => __APP_INFO__.version,
  appInfos: () => __APP_INFO__
}

window.playlists = {
  read: () => request('GET', '/api/playlists'),
  update: (playlists) => request('PUT', '/api/playlists', playlists)
}

window.youtube = {
  search: (query) => request('POST', '/api/youtube/search', { query })
}

window.media = {
  pickFiles: () => request('POST', '/api/media/pick')
}

window.ytdlp = {
  ensureTools: () => request('POST', '/api/tools/ensure'),
  startDownload: (config) => request('POST', '/api/downloads', config),
  cancelDownload: (id) => request('POST', '/api/downloads/cancel', { id }),
  onEvent: (callback) => subscribe('ytdlp', callback)
}

window.updater = {
  checkForUpdates: () => request('POST', '/api/update/check'),
  restart: () => request('POST', '/api/update/restart'),
  status: () => request('GET', '/api/status'),
  onUpdateEvent: (callback) => subscribe('update', callback)
}
