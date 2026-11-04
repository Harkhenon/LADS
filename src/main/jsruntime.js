import { app } from 'electron'
import { execFile } from 'node:child_process'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import zlib from 'node:zlib'
import { DENO, platformKey } from './lib/toolPins.mjs'
import { binDir, fetchVerified, installBinary } from './tools'

const NODE_MIN_VERSION = [22, 0, 0]
const DENO_MIN_VERSION = [2, 3, 0]

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

// Sans shell, et depuis un dossier maîtrisé : un `node.exe` déposé dans le dossier courant
// ne peut pas être exécuté à la place de celui du PATH.
function detectVersion(command, args) {
  return new Promise((resolve) => {
    execFile(
      command,
      args,
      { encoding: 'utf8', timeout: 5000, windowsHide: true, cwd: app.getPath('userData') },
      (error, stdout, stderr) => resolve(error ? null : parseVersionNumbers(`${stdout}${stderr}`))
    )
  })
}

async function isVersionAtLeast(command, min) {
  const version = await detectVersion(command, ['--version'])
  return version !== null && versionAtLeast(version, min)
}

async function detectSystemRuntime() {
  if (await isVersionAtLeast('node', NODE_MIN_VERSION)) {
    return { spec: 'node' }
  }
  if (await isVersionAtLeast('deno', DENO_MIN_VERSION)) {
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
  throw new Error('Binaire deno introuvable dans l’archive')
}

async function downloadDeno() {
  const asset = DENO.assets[platformKey()]
  if (!asset) {
    throw new Error(`deno n'est pas disponible pour ${platformKey()}.`)
  }
  const zipBuffer = await fetchVerified(`${DENO.baseUrl}/${asset.name}`, asset.sha256)
  await installBinary(denoPath(), extractDenoFromZip(zipBuffer))
  return denoPath()
}

export async function ensureJsRuntime() {
  const system = await detectSystemRuntime()
  if (system) {
    return system
  }
  const path = denoPath()
  // Lancer le binaire écarte aussi un fichier tronqué laissé par une ancienne version.
  if (existsSync(path) && (await isVersionAtLeast(path, DENO_MIN_VERSION))) {
    return { spec: `deno:${path}` }
  }
  return { spec: `deno:${await downloadDeno()}` }
}
