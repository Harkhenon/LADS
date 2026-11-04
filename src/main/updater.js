import { autoUpdater } from 'electron-updater'
import { BrowserWindow, ipcMain } from 'electron'
import { is } from '@electron-toolkit/utils'

const UPDATE_CHANNELS = {
  event: 'lads:update-event',
  check: 'lads:check-for-updates',
  download: 'lads:download-update',
  install: 'lads:quit-and-install'
}

const UPDATE_EVENTS = [
  'checking-for-update',
  'update-available',
  'update-not-available',
  'download-progress',
  'update-downloaded',
  'error'
]

const STARTUP_CHECK_DELAY_MS = 3000

// Vrai pendant la vérification automatique : sans réseau (animation hors ligne), pas d'alerte.
let silentCheck = false

function broadcastEvent(event, args = []) {
  const payload = { event, args }
  for (const win of BrowserWindow.getAllWindows()) {
    win.webContents.send(UPDATE_CHANNELS.event, payload)
  }
}

function serializeArg(arg) {
  if (arg instanceof Error) {
    return { message: arg.message }
  }
  return JSON.parse(JSON.stringify(arg ?? null))
}

function configureAutoUpdater() {
  autoUpdater.autoDownload = false
  autoUpdater.autoInstallOnAppQuit = true
  for (const name of UPDATE_EVENTS) {
    autoUpdater.on(name, (...args) => {
      if (name === 'error' && silentCheck) {
        console.warn('[updater] vérification automatique échouée :', args[0]?.message)
        return
      }
      broadcastEvent(name, args.map(serializeArg))
    })
  }
}

function registerUpdaterIpc() {
  ipcMain.handle(UPDATE_CHANNELS.check, async () => {
    silentCheck = false
    await autoUpdater.checkForUpdates()
  })
  ipcMain.handle(UPDATE_CHANNELS.download, async () => {
    await autoUpdater.downloadUpdate()
  })
  ipcMain.handle(UPDATE_CHANNELS.install, () => autoUpdater.quitAndInstall())
}

function checkForUpdatesInDev() {
  console.log('[LADS test] Vérification des mises à jour (dev)')
  broadcastEvent('checking-for-update')
  setTimeout(() => {
    const fakeUpdate = { version: '0.0.2-mock', files: [], path: '', releaseName: 'Mock release' }
    broadcastEvent('update-available', [fakeUpdate])
  }, 800)
}

function downloadUpdateInDev() {
  console.log('[LADS test] Téléchargement de la mise à jour (dev)')
  let percent = 0
  const timer = setInterval(() => {
    percent = Math.min(100, percent + 20)
    broadcastEvent('download-progress', [{ percent, transferred: percent, total: 100 }])
    if (percent >= 100) {
      clearInterval(timer)
      broadcastEvent('update-downloaded')
    }
  }, 400)
}

export function initUpdater() {
  configureAutoUpdater()
  if (is.dev) {
    ipcMain.handle(UPDATE_CHANNELS.check, () => checkForUpdatesInDev())
    ipcMain.handle(UPDATE_CHANNELS.download, () => downloadUpdateInDev())
    ipcMain.handle(UPDATE_CHANNELS.install, () => {
      console.log('[LADS test] Redémarrage et installation (dev)')
    })
  } else {
    registerUpdaterIpc()
  }
}

// À appeler une fois l'interface chargée : avant, l'événement « mise à jour disponible » serait perdu.
export function scheduleStartupUpdateCheck() {
  if (is.dev) {
    return
  }
  setTimeout(() => {
    silentCheck = true
    autoUpdater
      .checkForUpdates()
      .catch(() => {})
      .finally(() => {
        silentCheck = false
      })
  }, STARTUP_CHECK_DELAY_MS)
}

export { UPDATE_CHANNELS }
