import { app } from 'electron'
import { chmodSync, existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { spawnSync } from 'node:child_process'
import zlib from 'node:zlib'

const NODE_MIN_VERSION = [22, 0, 0]
const DENO_MIN_VERSION = [2, 3, 0]

function binDir() {
  return join(app.getPath('userData'), 'bin')
}

function denoPath() {
  return join(binDir(), process.platform === 'win32' ? 'deno.exe' : 'deno')
}

function parseVersionNumbers(text) {
  const match = text.match(/(\d+)\.(\d+)\.(\d+)/)
  if (!match) {
    return null
  }
  return [Number(match[1]), Number(match[2]), Number(match[3])]
}

function versionAtLeast(version, min) {
  for (let i = 0; i < min.length; i++) {
    if (version[i] !== min[i]) {
      return version[i] > min[i]
    }
  }
  return true
}

function detectCommand(command, args) {
  try {
    const result = spawnSync(command, args, {
      encoding: 'utf8',
      timeout: 5000,
      windowsHide: true,
      shell: process.platform === 'win32'
    })
    if (result.error || result.status !== 0) {
      return null
    }
    return parseVersionNumbers(`${result.stdout}${result.stderr}`)
  } catch {
    return null
  }
}

export function detectSystemRuntime() {
  const nodeVersion = detectCommand('node', ['--version'])
  if (nodeVersion && versionAtLeast(nodeVersion, NODE_MIN_VERSION)) {
    return { spec: 'node' }
  }
  const denoVersion = detectCommand('deno', ['--version'])
  if (denoVersion && versionAtLeast(denoVersion, DENO_MIN_VERSION)) {
    return { spec: 'deno' }
  }
  return null
}

function findEndOfCentralDirectory(buffer) {
  const minOffset = Math.max(0, buffer.length - 22 - 65536)
  for (let i = buffer.length - 22; i >= minOffset; i--) {
    if (buffer.readUInt32LE(i) === 0x06054b50) {
      return i
    }
  }
  return -1
}

function readZipEntries(buffer, eocdOffset) {
  const entries = []
  const count = buffer.readUInt16LE(eocdOffset + 10)
  let offset = buffer.readUInt32LE(eocdOffset + 16)
  for (let index = 0; index < count; index++) {
    if (buffer.readUInt32LE(offset) !== 0x02014b50) {
      break
    }
    const entry = {
      compression: buffer.readUInt16LE(offset + 10),
      compressedSize: buffer.readUInt32LE(offset + 20),
      nameLength: buffer.readUInt16LE(offset + 28),
      extraLength: buffer.readUInt16LE(offset + 30),
      commentLength: buffer.readUInt16LE(offset + 32),
      localOffset: buffer.readUInt32LE(offset + 42)
    }
    entry.name = buffer.toString('utf8', offset + 46, offset + 46 + entry.nameLength)
    entries.push(entry)
    offset += 46 + entry.nameLength + entry.extraLength + entry.commentLength
  }
  return entries
}

function extractZipEntry(buffer, entry) {
  const nameLength = buffer.readUInt16LE(entry.localOffset + 26)
  const extraLength = buffer.readUInt16LE(entry.localOffset + 28)
  const dataOffset = entry.localOffset + 30 + nameLength + extraLength
  const data = buffer.subarray(dataOffset, dataOffset + entry.compressedSize)
  if (entry.compression === 0) {
    return Buffer.from(data)
  }
  if (entry.compression === 8) {
    return zlib.inflateRawSync(data)
  }
  throw new Error(`Compression zip non prise en charge (${entry.compression})`)
}

function extractDenoFromZip(zipBuffer) {
  const eocdOffset = findEndOfCentralDirectory(zipBuffer)
  if (eocdOffset < 0) {
    throw new Error('Archive deno invalide')
  }
  const wanted = process.platform === 'win32' ? 'deno.exe' : 'deno'
  for (const entry of readZipEntries(zipBuffer, eocdOffset)) {
    const parts = entry.name.split('/')
    if (parts[parts.length - 1] === wanted) {
      return extractZipEntry(zipBuffer, entry)
    }
  }
  throw new Error('Binaire deno introuvable dans l\u2019archive')
}

function denoAssetName() {
  const arch = process.arch === 'arm64' ? 'aarch64' : 'x86_64'
  if (process.platform === 'win32') {
    return `deno-${arch}-pc-windows-msvc.zip`
  }
  if (process.platform === 'darwin') {
    return `deno-${arch}-apple-darwin.zip`
  }
  return `deno-${arch}-unknown-linux-gnu.zip`
}

async function downloadDeno() {
  const response = await fetch('https://api.github.com/repos/denoland/deno/releases/latest', {
    headers: { 'User-Agent': 'LADS' }
  })
  if (!response.ok) {
    throw new Error(`API GitHub injoignable (${response.status})`)
  }
  const release = await response.json()
  const asset = release.assets.find((a) => a.name === denoAssetName())
  if (!asset) {
    throw new Error(`Asset deno introuvable (${denoAssetName()})`)
  }
  const zipResponse = await fetch(asset.browser_download_url)
  if (!zipResponse.ok) {
    throw new Error(`Téléchargement de deno échoué (${zipResponse.status})`)
  }
  const zipBuffer = Buffer.from(await zipResponse.arrayBuffer())
  const denoBinary = extractDenoFromZip(zipBuffer)
  mkdirSync(binDir(), { recursive: true })
  writeFileSync(denoPath(), denoBinary)
  if (process.platform !== 'win32') {
    chmodSync(denoPath(), 0o755)
  }
  return denoPath()
}

export async function ensureJsRuntime(listeners = {}) {
  const system = detectSystemRuntime()
  if (system) {
    return system
  }
  if (existsSync(denoPath())) {
    return { spec: `deno:${denoPath()}` }
  }
  listeners.onDownloadStart?.()
  const path = await downloadDeno()
  listeners.onReady?.()
  return { spec: `deno:${path}` }
}

export { denoPath }
