import assert from 'node:assert/strict'
import crypto from 'node:crypto'
import path from 'node:path'
import { test } from 'node:test'
import {
  SESSION_COOKIE,
  isAllowedHost,
  isAllowedOrigin,
  readCookie,
  resolveStaticPath,
  safeEqual
} from '../src/server/lib/httpGuards.mjs'
import {
  compareVersions,
  parseManifest,
  safeEntryPath,
  verifySignature
} from '../src/server/lib/updateManifest.mjs'

const validManifest = {
  version: '1.2.3',
  app: { file: 'lads-app-1.2.3.zip', sha256: 'a'.repeat(64), size: 10 },
  node: { version: '24.22.2', file: 'node-v24.22.2-win-x64.zip', sha256: 'b'.repeat(64) }
}
const bytesOf = (value) => Buffer.from(JSON.stringify(value))

test('compareVersions : ordre numérique, préversions refusées', () => {
  assert.equal(compareVersions('0.10.0', '0.9.9'), 1)
  assert.equal(compareVersions('1.0.0', '1.0.0'), 0)
  assert.equal(compareVersions('0.4.1', '0.5.0'), -1)
  assert.equal(compareVersions('1.0.0-beta.1', '0.9.0'), null)
  assert.equal(compareVersions('abc', '1.0.0'), null)
  assert.equal(compareVersions(undefined, '1.0.0'), null)
})

test('verifySignature : seule la bonne clé sur le bon contenu passe', () => {
  const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519')
  const other = crypto.generateKeyPairSync('ed25519')
  const pem = publicKey.export({ type: 'spki', format: 'pem' })
  const bytes = bytesOf(validManifest)
  const signature = crypto.sign(null, bytes, privateKey).toString('base64')

  assert.equal(verifySignature(bytes, signature, pem), true)
  assert.equal(verifySignature(bytes, `${signature}\n`, pem), true)
  assert.equal(
    verifySignature(bytesOf({ ...validManifest, version: '9.9.9' }), signature, pem),
    false
  )
  assert.equal(
    verifySignature(bytes, crypto.sign(null, bytes, other.privateKey).toString('base64'), pem),
    false
  )
  assert.equal(verifySignature(bytes, 'pas une signature', pem), false)
  assert.equal(verifySignature(bytes, signature, ''), false)
  assert.equal(verifySignature(bytes, '', pem), false)
})

test('parseManifest refuse tout manifeste incomplet ou dangereux', () => {
  assert.deepEqual(parseManifest(bytesOf(validManifest)), validManifest)
  assert.equal(parseManifest(Buffer.from('{pas du json')), null)
  assert.equal(parseManifest(bytesOf({ ...validManifest, version: '1.2.3-beta' })), null)
  assert.equal(parseManifest(bytesOf({ ...validManifest, app: undefined })), null)
  assert.equal(
    parseManifest(
      bytesOf({ ...validManifest, app: { ...validManifest.app, file: '../evil.zip' } })
    ),
    null
  )
  assert.equal(
    parseManifest(bytesOf({ ...validManifest, app: { ...validManifest.app, sha256: 'court' } })),
    null
  )
  assert.equal(
    parseManifest(bytesOf({ ...validManifest, node: { ...validManifest.node, file: 'a/b.zip' } })),
    null
  )
})

test('safeEntryPath bloque toute sortie du dossier cible', () => {
  const root = path.resolve('dossier')
  assert.equal(safeEntryPath(root, 'server.mjs'), path.join(root, 'server.mjs'))
  assert.equal(safeEntryPath(root, 'ui/assets/a.js'), path.join(root, 'ui', 'assets', 'a.js'))
  for (const name of [
    '../evil.js',
    'ui/../../evil.js',
    '..\\evil.js',
    '/etc/passwd',
    'C:\\Windows\\evil.exe',
    'C:evil.exe',
    '',
    'a\0b'
  ]) {
    assert.equal(safeEntryPath(root, name), null, name)
  }
})

test('isAllowedHost et isAllowedOrigin : uniquement cette instance', () => {
  assert.equal(isAllowedHost('127.0.0.1:4000', 4000), true)
  assert.equal(isAllowedHost('localhost:4000', 4000), false)
  assert.equal(isAllowedHost('evil.example:4000', 4000), false)
  assert.equal(isAllowedHost('127.0.0.1:4001', 4000), false)
  assert.equal(isAllowedHost(undefined, 4000), false)

  assert.equal(isAllowedOrigin(undefined, 4000), true)
  assert.equal(isAllowedOrigin('http://127.0.0.1:4000', 4000), true)
  assert.equal(isAllowedOrigin('https://evil.example', 4000), false)
  assert.equal(isAllowedOrigin('null', 4000), false)
  assert.equal(isAllowedOrigin('http://localhost:5173', 4000), false)
  assert.equal(isAllowedOrigin('http://localhost:5173', 4000, ['http://localhost:5173']), true)
})

test('readCookie et safeEqual', () => {
  assert.equal(readCookie(`a=1; ${SESSION_COOKIE}=abc; b=2`, SESSION_COOKIE), 'abc')
  assert.equal(readCookie('a=1', SESSION_COOKIE), null)
  assert.equal(readCookie(undefined, SESSION_COOKIE), null)
  assert.equal(safeEqual('abc', 'abc'), true)
  assert.equal(safeEqual('abc', 'abd'), false)
  assert.equal(safeEqual('abc', 'abcd'), false)
  assert.equal(safeEqual('', 'abc'), false)
})

test('resolveStaticPath reste dans le dossier de l\u2019interface', () => {
  const root = path.resolve('ui')
  assert.equal(resolveStaticPath(root, '/index.html'), path.join(root, 'index.html'))
  assert.equal(resolveStaticPath(root, '/assets/a.js'), path.join(root, 'assets', 'a.js'))
  for (const attempt of [
    '/../secret',
    '/..%2f..%2fsecret',
    '/..%5c..%5csecret',
    '/%00',
    '/%E0%A4%A'
  ]) {
    assert.equal(resolveStaticPath(root, attempt), null, attempt)
  }
})
