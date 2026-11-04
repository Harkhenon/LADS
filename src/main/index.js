import { app, shell, BrowserWindow, Menu, session, screen } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import { initUpdater, scheduleStartupUpdateCheck } from './updater'
import registerPlaylistsHandles from './playlists'
import youtube from './youtube'
import ytdlp, { cancelAllDownloads } from './ytdlp'
import media from './media'
import { registerMediaProtocol } from './protocol'
import { isSafeExternalUrl } from './lib/validation.mjs'

// Identique à l'appId d'electron-builder.yml, repris par les raccourcis créés à l'installation.
const APP_USER_MODEL_ID = 'com.electron.app'

// Seul le plein écran du lecteur a besoin d'une permission (ni caméra, ni micro, ni géolocalisation…).
const ALLOWED_PERMISSIONS = ['fullscreen']

// Le lecteur intégré de YouTube exige un Referer identifiant l'application (sinon : erreur 153),
// or une page chargée depuis file:// n'en envoie pas.
const YOUTUBE_EMBED_FILTER = { urls: ['https://www.youtube.com/embed/*'] }
const YOUTUBE_REFERER = 'https://harkhenon.dev/'

let splashWindow = null
let mainWindow = null

function createSplashWindow() {
  const splash = new BrowserWindow({
    width: 340,
    height: 260,
    frame: false,
    resizable: false,
    minimizable: false,
    maximizable: false,
    center: true,
    show: true,
    alwaysOnTop: true,
    backgroundColor: '#0e1a30',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: true
    }
  })
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    splash.loadURL(`${process.env['ELECTRON_RENDERER_URL']}/splash.html`)
  } else {
    splash.loadFile(join(__dirname, '../renderer/splash.html'))
  }
  return splash
}

function closeSplash() {
  if (splashWindow && !splashWindow.isDestroyed()) {
    splashWindow.close()
  }
  splashWindow = null
}

function hardenWebContents(contents) {
  contents.setWindowOpenHandler(({ url }) => {
    if (isSafeExternalUrl(url)) {
      shell.openExternal(url)
    }
    return { action: 'deny' }
  })

  // La fenêtre principale ne doit jamais quitter l'interface de l'application.
  contents.on('will-navigate', (event, url) => {
    if (url !== contents.getURL()) {
      event.preventDefault()
      if (isSafeExternalUrl(url)) {
        shell.openExternal(url)
      }
    }
  })
}

function createWindow() {
  const { width: screenWidth, height: screenHeight } = screen.getPrimaryDisplay().workArea

  const window = new BrowserWindow({
    width: Math.round(screenWidth / 2),
    height: Math.round((screenHeight * 3) / 4),
    center: true,
    show: false,
    icon,
    autoHideMenuBar: true,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true
    }
  })

  window.once('ready-to-show', () => {
    closeSplash()
    window.show()
  })

  window.webContents.once('did-finish-load', scheduleStartupUpdateCheck)

  // Si l'interface ne charge pas, la fenêtre resterait masquée derrière le splash, sans issue.
  window.webContents.once('did-fail-load', (_event, _code, description) => {
    console.error('[main] échec du chargement de l’interface :', description)
    closeSplash()
    window.show()
  })

  window.on('closed', () => {
    mainWindow = null
    closeSplash()
  })

  hardenWebContents(window.webContents)

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    window.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    window.loadFile(join(__dirname, '../renderer/index.html'))
  }
  return window
}

function startApp() {
  app.whenReady().then(() => {
    electronApp.setAppUserModelId(APP_USER_MODEL_ID)

    // Retire le menu par défaut, qui donne accès aux DevTools en production.
    if (!is.dev && process.platform !== 'darwin') {
      Menu.setApplicationMenu(null)
    }

    session.defaultSession.setPermissionRequestHandler((_contents, permission, callback) => {
      callback(ALLOWED_PERMISSIONS.includes(permission))
    })

    session.defaultSession.webRequest.onBeforeSendHeaders(
      YOUTUBE_EMBED_FILTER,
      ({ requestHeaders }, callback) => {
        callback({ requestHeaders: { ...requestHeaders, Referer: YOUTUBE_REFERER } })
      }
    )

    // Default open or close DevTools by F12 in development
    // and ignore CommandOrControl + R in production.
    // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
    app.on('browser-window-created', (_, window) => {
      optimizer.watchWindowShortcuts(window)
    })

    registerMediaProtocol()

    initUpdater()
    registerPlaylistsHandles()
    youtube()
    ytdlp()
    media()

    splashWindow = createSplashWindow()
    mainWindow = createWindow()

    app.on('activate', function () {
      // On macOS it's common to re-create a window in the app when the
      // dock icon is clicked and there are no other windows open.
      if (BrowserWindow.getAllWindows().length === 0) {
        mainWindow = createWindow()
      }
    })
  })

  // Quit when all windows are closed, except on macOS. There, it's common
  // for applications and their menu bar to stay active until the user quits
  // explicitly with Cmd + Q.
  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
      app.quit()
    }
  })

  // Sans cela, yt-dlp et ffmpeg continueraient de tourner une fois l'application fermée.
  app.on('before-quit', cancelAllDownloads)

  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) {
        mainWindow.restore()
      }
      mainWindow.show()
      mainWindow.focus()
    }
  })
}

// Deux instances écriraient en même temps dans playlists.json et dans le dossier des outils.
if (app.requestSingleInstanceLock()) {
  startApp()
} else {
  app.quit()
}
