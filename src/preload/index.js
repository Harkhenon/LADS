import { contextBridge } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

import packagejson from '../../package.json'

const nonceArg = process.argv.find((arg) => arg.startsWith('--csp-nonce='))
const nonceValue = nonceArg ? nonceArg.split('=')[1] : ''

// Custom APIs for renderer
const api = {}

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
  } catch (error) {
    console.error(error)
  }
} else {
  window.electron = electronAPI
  window.api = api
  window.base = base
}
