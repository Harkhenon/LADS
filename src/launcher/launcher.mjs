// Point d'entrée de LADS, lancé par le raccourci du Bureau.
//
// Ce fichier n'est jamais remplacé par une mise à jour : il doit rester simple et sans dépendance.
// Il applique la version préparée par le serveur et revient à la précédente si elle ne démarre pas.
import { spawn } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const installDir = path.dirname(fileURLToPath(import.meta.url))
const statePath = path.join(installDir, 'state.json')
const logPath = path.join(
  process.env.LADS_DATA_DIR ?? path.join(process.env.APPDATA ?? '', 'lads'),
  'lads.log'
)
const EXIT_RESTART = 75
// Si l'interface ne s'est pas affichée dans ce délai, la nouvelle version est considérée en échec.
const CONFIRM_TIMEOUT_MS = Number(process.env.LADS_CONFIRM_TIMEOUT_MS ?? 90000)

function log(message) {
  try {
    fs.mkdirSync(path.dirname(logPath), { recursive: true })
    fs.appendFileSync(logPath, `${new Date().toISOString()} [launcher] ${message}\n`)
  } catch {
    // Un journal inaccessible ne doit jamais empêcher le démarrage.
  }
}

function readState() {
  return JSON.parse(fs.readFileSync(statePath, 'utf8'))
}

function writeState(state) {
  const temporary = `${statePath}.${process.pid}.tmp`
  fs.writeFileSync(temporary, JSON.stringify(state, null, 2))
  fs.renameSync(temporary, statePath)
}

function applyPendingUpdate(state) {
  if (!state.next) {
    return state
  }
  log(`passage de ${state.version} à ${state.next}`)
  const updated = {
    ...state,
    previous: state.version,
    previousRuntime: state.runtime,
    version: state.next,
    runtime: state.nextRuntime ?? state.runtime,
    next: null,
    nextRuntime: null,
    pendingConfirm: true
  }
  writeState(updated)
  return updated
}

function rollback(state, reason) {
  log(`retour de ${state.version} à ${state.previous} : ${reason}`)
  const restored = {
    ...state,
    version: state.previous,
    runtime: state.previousRuntime ?? state.runtime,
    badVersions: [...new Set([...(state.badVersions ?? []), state.version])],
    previous: null,
    previousRuntime: null,
    pendingConfirm: false
  }
  writeState(restored)
  return restored
}

function runtimePath(state) {
  return state.runtime && fs.existsSync(state.runtime) ? state.runtime : process.execPath
}

function startServer(state) {
  const server = path.join(installDir, 'versions', state.version, 'server.mjs')
  return spawn(runtimePath(state), [server], {
    stdio: 'ignore',
    windowsHide: true,
    env: { ...process.env, LADS_INSTALL_DIR: installDir }
  })
}

// LADS tourne déjà : rouvrir sa fenêtre, sans toucher aux versions pendant qu'il s'exécute.
async function focusExistingInstance() {
  try {
    const lock = JSON.parse(
      fs.readFileSync(path.join(path.dirname(logPath), 'server.json'), 'utf8')
    )
    const response = await fetch(`http://127.0.0.1:${lock.port}/internal/open`, {
      method: 'POST',
      headers: { 'x-lads-token': lock.token },
      signal: AbortSignal.timeout(3000)
    })
    return response.ok
  } catch {
    return false
  }
}

function supervise() {
  let state = applyPendingUpdate(readState())
  const child = startServer(state)
  log(`démarrage de la version ${state.version}`)

  let timedOut = false
  const confirmTimer = state.pendingConfirm
    ? setTimeout(() => {
        if (readState().pendingConfirm) {
          timedOut = true
          log('la nouvelle version ne s’est pas confirmée à temps')
          child.kill()
        }
      }, CONFIRM_TIMEOUT_MS)
    : null

  const onEnd = (code) => {
    clearTimeout(confirmTimer)
    state = readState()
    if (state.pendingConfirm && state.previous && code !== 0) {
      rollback(state, timedOut ? 'délai dépassé' : `arrêt anticipé (code ${code})`)
      supervise()
      return
    }
    if (code === EXIT_RESTART) {
      supervise()
      return
    }
    process.exit(code === 0 ? 0 : 1)
  }
  child.on('error', (error) => {
    log(`lancement impossible : ${error.message}`)
    onEnd(1)
  })
  child.on('exit', onEnd)
}

if (process.argv.includes('--supervise')) {
  if (await focusExistingInstance()) {
    log('instance déjà active : fenêtre réouverte')
    process.exit(0)
  }
  supervise()
} else {
  // Se relance en arrière-plan : la fenêtre de console disparaît aussitôt.
  spawn(process.execPath, [fileURLToPath(import.meta.url), '--supervise'], {
    detached: true,
    stdio: 'ignore',
    windowsHide: true,
    cwd: installDir
  }).unref()
}
