// Mises à jour silencieuses : tout est préparé en arrière-plan, puis appliqué au prochain lancement.
// Jamais de redémarrage pendant une animation.
//
// Chaque manifeste est signé par une clé conservée hors de GitHub : un compte GitHub compromis ne
// peut donc pas déployer de code sur les postes. Le manifeste signé fixe à son tour les empreintes
// de l'application et du runtime Node.
import { unzipSync } from 'fflate'
import fs from 'node:fs/promises'
import path from 'node:path'
import { broadcast } from './events.mjs'
import {
  compareVersions,
  parseManifest,
  safeEntryPath,
  verifySignature
} from './lib/updateManifest.mjs'
import { log } from './log.mjs'
import { installDir } from './paths.mjs'
import { fetchBuffer, fetchVerified, renameWithRetry, writeFileAtomic } from './tools.mjs'

/* global __APP_VERSION__, __UPDATE_FEED__, __UPDATE_PUBLIC_KEY__ */
const CURRENT_VERSION = __APP_VERSION__
const FEED = __UPDATE_FEED__
const PUBLIC_KEY = __UPDATE_PUBLIC_KEY__

const CHECK_INTERVAL_MS = 6 * 60 * 60 * 1000
const FIRST_CHECK_DELAY_MS = 5000

const statePath = () => path.join(installDir, 'state.json')
const versionDir = (version) => path.join(installDir, 'versions', version)

let checking = null
let readyVersion = null

const emit = (event, ...args) => broadcast('update', { event, args })

async function readState() {
  return JSON.parse(await fs.readFile(statePath(), 'utf8'))
}

async function writeState(state) {
  await writeFileAtomic(statePath(), JSON.stringify(state, null, 2), 'utf8')
}

async function exists(target) {
  return fs.access(target).then(
    () => true,
    () => false
  )
}

async function fetchSignedManifest() {
  const bytes = await fetchBuffer(`${FEED}/lads-update.json`)
  const signature = (await fetchBuffer(`${FEED}/lads-update.json.sig`)).toString('utf8')
  if (!verifySignature(bytes, signature, PUBLIC_KEY)) {
    throw new Error('Signature de mise à jour invalide : mise à jour refusée.')
  }
  const manifest = parseManifest(bytes)
  if (!manifest) {
    throw new Error('Manifeste de mise à jour invalide : mise à jour refusée.')
  }
  return manifest
}

async function stageVersion(manifest) {
  const target = versionDir(manifest.version)
  if (await exists(path.join(target, 'server.mjs'))) {
    return
  }
  const archive = await fetchVerified(`${FEED}/${manifest.app.file}`, manifest.app.sha256)
  const staging = `${target}.staging-${process.pid}`
  await fs.rm(staging, { recursive: true, force: true })
  try {
    for (const [name, content] of Object.entries(unzipSync(archive))) {
      if (name.endsWith('/')) {
        continue
      }
      const entry = safeEntryPath(staging, name)
      if (!entry) {
        throw new Error(`Chemin refusé dans l'archive : ${name}`)
      }
      await fs.mkdir(path.dirname(entry), { recursive: true })
      await fs.writeFile(entry, content)
    }
    if (!(await exists(path.join(staging, 'server.mjs')))) {
      throw new Error('Archive de mise à jour incomplète.')
    }
    await fs.rm(target, { recursive: true, force: true })
    await renameWithRetry(staging, target)
  } catch (error) {
    await fs.rm(staging, { recursive: true, force: true })
    throw error
  }
}

// Le lanceur démarre l'application avec ce Node : son correctif de sécurité arrive aussi tout seul.
async function stageRuntime(node) {
  const target = path.join(installDir, 'runtimes', node.version, 'node.exe')
  if (await exists(target)) {
    return target
  }
  const url = `https://nodejs.org/dist/v${node.version}/${node.file}`
  const archive = await fetchVerified(url, node.sha256)
  const executable = Object.entries(
    unzipSync(archive, { filter: (file) => file.name.endsWith('/node.exe') })
  )[0]?.[1]
  if (!executable) {
    throw new Error('node.exe introuvable dans l’archive du runtime.')
  }
  await fs.mkdir(path.dirname(target), { recursive: true })
  await writeFileAtomic(target, executable)
  return target
}

async function cleanOldVersions(state) {
  const keep = new Set([state.version, state.previous, state.next].filter(Boolean))
  const root = path.join(installDir, 'versions')
  for (const name of await fs.readdir(root).catch(() => [])) {
    if (!keep.has(name)) {
      await fs.rm(path.join(root, name), { recursive: true, force: true }).catch(() => {})
    }
  }
}

async function runCheck({ silent }) {
  emit('checking-for-update')
  try {
    const manifest = await fetchSignedManifest()
    const state = await readState()
    const refused = (state.badVersions ?? []).includes(manifest.version)
    // Refuser tout retour en arrière : une ancienne version vulnérable mais bien signée ne repasse pas.
    if (compareVersions(manifest.version, CURRENT_VERSION) !== 1 || refused) {
      emit('update-not-available', { version: manifest.version })
      return
    }
    emit('update-available', { version: manifest.version })
    if (state.next !== manifest.version) {
      await stageVersion(manifest)
      const runtime = await stageRuntime(manifest.node)
      const latest = await readState()
      latest.next = manifest.version
      latest.nextRuntime = runtime
      await writeState(latest)
      await cleanOldVersions(latest)
    }
    readyVersion = manifest.version
    log('info', `mise à jour ${manifest.version} prête pour le prochain lancement`)
    emit('update-downloaded', { version: manifest.version })
  } catch (error) {
    log('warn', 'mise à jour :', error)
    if (silent) {
      // Sans réseau (animation hors ligne), pas d'alerte : l'application continue normalement.
      emit('update-idle')
    } else {
      emit('error', { message: String(error?.message ?? error) })
    }
  }
}

export function checkForUpdates({ silent = false } = {}) {
  if (!installDir || !PUBLIC_KEY) {
    emit('update-not-available', { version: CURRENT_VERSION })
    return Promise.resolve()
  }
  if (!checking) {
    checking = runCheck({ silent }).finally(() => {
      checking = null
    })
  }
  return checking
}

export function startUpdateLoop() {
  if (!installDir || !PUBLIC_KEY) {
    log('info', 'mises à jour automatiques désactivées (développement ou clé absente)')
    return
  }
  setTimeout(() => checkForUpdates({ silent: true }), FIRST_CHECK_DELAY_MS).unref()
  setInterval(() => checkForUpdates({ silent: true }), CHECK_INTERVAL_MS).unref()
}

// L'interface s'est affichée : le lanceur n'a pas à revenir à la version précédente.
export async function confirmHealthy() {
  if (!installDir) {
    return
  }
  try {
    const state = await readState()
    if (state.pendingConfirm) {
      state.pendingConfirm = false
      await writeState(state)
      log('info', `version ${CURRENT_VERSION} confirmée`)
    }
  } catch (error) {
    log('warn', 'confirmation de version :', error)
  }
}

export function updateStatus() {
  return { version: CURRENT_VERSION, readyVersion }
}
