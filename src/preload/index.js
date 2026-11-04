import { contextBridge, ipcRenderer } from 'electron'

import packagejson from '../../package.json'

// Ce preload tourne dans le bac à sable : seul un jeu fermé de fonctions est exposé à l'interface,
// jamais ipcRenderer lui-même.

const UPDATE_CHANNELS = {
  event: 'lads:update-event',
  check: 'lads:check-for-updates',
  download: 'lads:download-update',
  install: 'lads:quit-and-install'
}

const PLAYLISTS_CHANNEL = {
  read: 'playlists:read',
  update: 'playlists:update'
}

const YOUTUBE_CHANNEL = {
  search: 'youtube:search'
}

const MEDIA_CHANNELS = {
  pickFiles: 'lads:media-pick-files'
}

const YT_DLP_CHANNELS = {
  event: 'lads:ytdlp-event',
  ensureTools: 'lads:ytdlp-ensure-tools',
  downloadStart: 'lads:ytdlp-download-start',
  downloadCancel: 'lads:ytdlp-download-cancel'
}

const youtube = {
  search: (texte) => ipcRenderer.invoke(YOUTUBE_CHANNEL.search, texte)
}

const media = {
  pickFiles: () => ipcRenderer.invoke(MEDIA_CHANNELS.pickFiles)
}

const ytdlp = {
  ensureTools: () => ipcRenderer.invoke(YT_DLP_CHANNELS.ensureTools),
  startDownload: (config) => ipcRenderer.invoke(YT_DLP_CHANNELS.downloadStart, config),
  cancelDownload: (id) => ipcRenderer.invoke(YT_DLP_CHANNELS.downloadCancel, id),
  onEvent: (callback) => {
    const listener = (_event, payload) => callback(payload)
    ipcRenderer.on(YT_DLP_CHANNELS.event, listener)
    return () => ipcRenderer.removeListener(YT_DLP_CHANNELS.event, listener)
  }
}

const playlists = {
  read: () => ipcRenderer.invoke(PLAYLISTS_CHANNEL.read),
  update: (playlists) => ipcRenderer.invoke(PLAYLISTS_CHANNEL.update, playlists)
}

const updater = {
  checkForUpdates: () => ipcRenderer.invoke(UPDATE_CHANNELS.check),
  downloadUpdate: () => ipcRenderer.invoke(UPDATE_CHANNELS.download),
  quitAndInstall: () => ipcRenderer.invoke(UPDATE_CHANNELS.install),
  onUpdateEvent: (callback) => {
    const listener = (_event, payload) => callback(payload)
    ipcRenderer.on(UPDATE_CHANNELS.event, listener)
    return () => ipcRenderer.removeListener(UPDATE_CHANNELS.event, listener)
  }
}

const base = {
  appVersion: () => packagejson.version,
  appInfos: () => ({
    name: packagejson.name,
    version: packagejson.version,
    description: packagejson.description,
    main: packagejson.main,
    author: packagejson.author,
    homepage: packagejson.homepage
  })
}

contextBridge.exposeInMainWorld('base', base)
contextBridge.exposeInMainWorld('updater', updater)
contextBridge.exposeInMainWorld('playlists', playlists)
contextBridge.exposeInMainWorld('youtube', youtube)
contextBridge.exposeInMainWorld('ytdlp', ytdlp)
contextBridge.exposeInMainWorld('media', media)
