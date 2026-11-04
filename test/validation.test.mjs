import assert from 'node:assert/strict'
import path from 'node:path'
import { test } from 'node:test'
import {
  findChecksum,
  isMediaFilePath,
  isSafeExternalUrl,
  isValidVideoId,
  normalizePlaylists,
  parseRangeHeader,
  parseYtDlpProgress,
  summarizeYtDlpError,
  validateDownloadConfig
} from '../src/main/lib/validation.mjs'
import { DENO, FFMPEG, YT_DLP } from '../src/main/lib/toolPins.mjs'

const absolute = (name) => path.resolve(name)

test('isSafeExternalUrl : seuls http et https passent', () => {
  assert.equal(isSafeExternalUrl('https://youtube.com/watch?v=abc'), true)
  assert.equal(isSafeExternalUrl('http://example.com'), true)
  for (const url of [
    'file:///C:/Windows/System32/calc.exe',
    'ms-msdt:/id',
    'javascript:alert(1)',
    'smb://server/share',
    'pas une url',
    undefined
  ]) {
    assert.equal(isSafeExternalUrl(url), false, String(url))
  }
})

test('isValidVideoId : format YouTube uniquement', () => {
  assert.equal(isValidVideoId('dQw4w9WgXcQ'), true)
  assert.equal(isValidVideoId('--exec=calc'), false)
  assert.equal(isValidVideoId('dQw4w9WgXcQ&list=PL'), false)
  assert.equal(isValidVideoId(null), false)
})

test('isMediaFilePath : médias absolus uniquement', () => {
  assert.equal(isMediaFilePath(absolute('chanson.MP3')), true)
  assert.equal(isMediaFilePath(absolute('video.mp4')), true)
  assert.equal(isMediaFilePath('relatif/video.mp4'), false)
  assert.equal(isMediaFilePath(absolute('secrets.txt')), false)
  assert.equal(isMediaFilePath(absolute('.ssh/id_rsa')), false)
  assert.equal(isMediaFilePath(null), false)
})

test('validateDownloadConfig', () => {
  const valid = { videoId: 'dQw4w9WgXcQ', format: 'video', location: 'documents' }
  assert.equal(validateDownloadConfig(valid), null)
  assert.ok(validateDownloadConfig(null))
  assert.ok(validateDownloadConfig({ ...valid, videoId: '-x' }))
  assert.ok(validateDownloadConfig({ ...valid, format: 'exe' }))
  assert.ok(validateDownloadConfig({ ...valid, location: '../..' }))
  assert.ok(validateDownloadConfig({ ...valid, location: 'custom', customLocation: '' }))
  assert.ok(validateDownloadConfig({ ...valid, location: 'custom', customLocation: 'relatif' }))
  assert.equal(
    validateDownloadConfig({ ...valid, location: 'custom', customLocation: absolute('dossier') }),
    null
  )
})

test('parseRangeHeader', () => {
  assert.deepEqual(parseRangeHeader('bytes=0-', 100), { start: 0, end: 99 })
  assert.deepEqual(parseRangeHeader('bytes=10-19', 100), { start: 10, end: 19 })
  assert.deepEqual(parseRangeHeader('bytes=90-500', 100), { start: 90, end: 99 })
  assert.deepEqual(parseRangeHeader('bytes=-10', 100), { start: 90, end: 99 })
  assert.deepEqual(parseRangeHeader('bytes=-500', 100), { start: 0, end: 99 })
  assert.equal(parseRangeHeader('bytes=100-', 100), null)
  assert.equal(parseRangeHeader('bytes=20-10', 100), null)
  assert.equal(parseRangeHeader('bytes=-', 100), null)
  assert.equal(parseRangeHeader('bytes=0-', 0), null)
  assert.equal(parseRangeHeader('items=0-5', 100), null)
})

test('findChecksum : nom exact uniquement', () => {
  const hash = 'A'.repeat(64)
  const other = 'b'.repeat(64)
  const sums = `${other}  yt-dlp\r\n${hash}  yt-dlp.exe\n${other} *yt-dlp_x86.exe\n`
  assert.equal(findChecksum(sums, 'yt-dlp.exe'), 'a'.repeat(64))
  assert.equal(findChecksum(sums, 'yt-dlp_x86.exe'), other)
  assert.equal(findChecksum(sums, 'yt-dlp_linux'), null)
})

test('normalizePlaylists', () => {
  assert.equal(normalizePlaylists('[]'), null)
  assert.equal(normalizePlaylists(null), null)
  assert.deepEqual(normalizePlaylists([]), [])
  assert.deepEqual(
    normalizePlaylists([
      { id: 'a', name: 'A' },
      { id: 'b', name: 'B', karaoke: [{ id: 'k', title: 'T' }, null, { id: 1 }] },
      { name: 'sans id' },
      null
    ]),
    [
      { id: 'a', name: 'A', karaoke: [] },
      { id: 'b', name: 'B', karaoke: [{ id: 'k', title: 'T' }] }
    ]
  )
})

test('summarizeYtDlpError garde la dernière ligne ERROR', () => {
  const message = 'Error code: 1\n\nStderr:\nWARNING: x\nERROR: [youtube] abc: Video unavailable\n'
  assert.equal(summarizeYtDlpError(message), '[youtube] abc: Video unavailable')
  assert.equal(summarizeYtDlpError('autre'), 'autre')
})

test('toolPins : empreintes complètes et bien formées', () => {
  for (const tool of [DENO, FFMPEG]) {
    assert.ok(tool.baseUrl.startsWith('https://github.com/'))
    assert.ok(tool.baseUrl.includes(tool.version))
    for (const [key, asset] of Object.entries(tool.assets)) {
      assert.match(asset.sha256, /^[a-f0-9]{64}$/, key)
    }
  }
  assert.ok(YT_DLP.assets['win32-x64'])
})

test('parseYtDlpProgress', () => {
  assert.deepEqual(
    parseYtDlpProgress('[download]  12.3% of   10.00MiB at    1.50MiB/s ETA 00:10'),
    {
      percent: 12.3,
      totalSize: '10.00MiB',
      speed: '1.50MiB/s',
      eta: '00:10'
    }
  )
  assert.deepEqual(
    parseYtDlpProgress('[download]   1.0% of ~  5.00MiB at  Unknown B/s ETA Unknown'),
    {
      percent: 1,
      totalSize: '5.00MiB',
      speed: 'Unknown B/s',
      eta: 'Unknown'
    }
  )
  assert.deepEqual(
    parseYtDlpProgress('[download] 100% of    3.00MiB in 00:00:02 at 1.40MiB/s').percent,
    100
  )
  assert.equal(parseYtDlpProgress('[download] Destination: chanson.mp4'), null)
  assert.equal(parseYtDlpProgress('[youtube] Extracting URL'), null)
})
