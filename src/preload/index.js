import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

import packagejson from '../../package.json'

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
  pickFolder: 'lads:media-pick-folder',
  listFiles: 'lads:media-list-files'
}

const YT_DLP_CHANNELS = {
  event: 'lads:ytdlp-event',
  binaryStatus: 'lads:ytdlp-binary-status',
  binaryDownload: 'lads:ytdlp-binary-download',
  downloadStart: 'lads:ytdlp-download-start',
  downloadCancel: 'lads:ytdlp-download-cancel'
}

const nonceArg = process.argv.find((arg) => arg.startsWith('--csp-nonce='))
const nonceValue = nonceArg ? nonceArg.split('=')[1] : ''

const youtube = {
  search: (texte) => ipcRenderer.invoke(YOUTUBE_CHANNEL.search, texte)
}

// Media APIs for renderer
const media = {
  pickFolder: () => ipcRenderer.invoke(MEDIA_CHANNELS.pickFolder),
  listFiles: (folder) => ipcRenderer.invoke(MEDIA_CHANNELS.listFiles, folder)
}

// yt-dlp APIs for renderer
const ytdlp = {
  getBinaryStatus: () => ipcRenderer.invoke(YT_DLP_CHANNELS.binaryStatus),
  downloadBinary: () => ipcRenderer.invoke(YT_DLP_CHANNELS.binaryDownload),
  startDownload: (config) => ipcRenderer.invoke(YT_DLP_CHANNELS.downloadStart, config),
  cancelDownload: (id) => ipcRenderer.invoke(YT_DLP_CHANNELS.downloadCancel, id),
  onEvent: (callback) => {
    const listener = (_event, payload) => callback(payload)
    ipcRenderer.on(YT_DLP_CHANNELS.event, listener)
    return () => ipcRenderer.removeListener(YT_DLP_CHANNELS.event, listener)
  }
}

// Playlists APIs for renderer

const playlists = {
  read: () => ipcRenderer.invoke(PLAYLISTS_CHANNEL.read),
  update: (playlists) => ipcRenderer.invoke(PLAYLISTS_CHANNEL.update, playlists)
}

// Custom APIs for renderer
const api = {}

// Update APIs for renderer
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
  }),
  nonce: nonceValue
}

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
    contextBridge.exposeInMainWorld('base', base)
    contextBridge.exposeInMainWorld('updater', updater)
    contextBridge.exposeInMainWorld('playlists', playlists)
    contextBridge.exposeInMainWorld('youtube', youtube)
    contextBridge.exposeInMainWorld('ytdlp', ytdlp)
    contextBridge.exposeInMainWorld('media', media)
  } catch (error) {
    console.error(error)
  }
} else {
  window.electron = electronAPI
  window.api = api
  window.ytdlp = ytdlp
  window.media = media
  window.base = base
  window.updater = updater
}
