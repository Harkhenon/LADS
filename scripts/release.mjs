#!/usr/bin/env node
// Publie une version : contrôles, montée de version, tag, build par la CI, signature locale, publication.
//
//   npm run release -- patch            (ou minor, major, ou un numéro : 1.2.3, 1.2.3-beta.1)
//   npm run release -- patch --dry-run  (contrôles seuls, rien n'est modifié)
//
// À lancer dans un terminal : la phrase secrète de la clé de signature est demandée à la fin.
import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { setTimeout as sleep } from 'node:timers/promises'

const RELEASE_BRANCH = 'main'
const REPO = 'Harkhenon/LADS'
const args = process.argv.slice(2)
const dryRun = args.includes('--dry-run')
const bump = args.find((arg) => !arg.startsWith('--'))

function fail(message) {
  console.error(`\n[release] ${message}`)
  process.exit(1)
}

function git(...gitArgs) {
  return execFileSync('git', gitArgs, { encoding: 'utf8' }).trim()
}

const gh = (...ghArgs) => execFileSync('gh', ghArgs, { encoding: 'utf8' }).trim()

// shell: true est nécessaire pour npm.cmd sous Windows ; les arguments passés ici sont validés.
function npm(...npmArgs) {
  execFileSync('npm', npmArgs, { stdio: 'inherit', shell: process.platform === 'win32' })
}

if (!bump || !/^(patch|minor|major|\d+\.\d+\.\d+(-[0-9A-Za-z.]+)?)$/.test(bump)) {
  fail('Usage : npm run release -- <patch|minor|major|x.y.z> [--dry-run]')
}
if (!existsSync('update-public-key.pem')) {
  fail('update-public-key.pem est absent : lancez d’abord « npm run release:keygen ».')
}

const branch = git('rev-parse', '--abbrev-ref', 'HEAD')
if (branch !== RELEASE_BRANCH && !dryRun) {
  fail(`Une release se lance depuis ${RELEASE_BRANCH} (branche actuelle : ${branch}).`)
}
if (git('status', '--porcelain') && !dryRun) {
  fail('Le dépôt contient des modifications non commitées.')
}

git('fetch', 'origin', RELEASE_BRANCH, '--tags')
if (git('rev-list', '--count', `HEAD..origin/${RELEASE_BRANCH}`) !== '0') {
  fail(`Votre branche est en retard sur origin/${RELEASE_BRANCH} : mettez-la à jour d'abord.`)
}

npm('run', 'check')
npm('run', 'build')
npm('run', 'package')
npm('audit', '--omit=dev', '--audit-level=high')

if (dryRun) {
  console.log('\n[release] Contrôles réussis. --dry-run : rien n’a été modifié.')
  process.exit(0)
}

npm('version', bump, '--no-git-tag-version')
const { version } = JSON.parse(readFileSync('package.json', 'utf8'))
const tag = `v${version}`
git('add', 'package.json', 'package-lock.json')
git('commit', '-m', `chore(release): ${tag}`)
git('tag', '-a', tag, '-m', tag)
git('push', '--atomic', 'origin', RELEASE_BRANCH, tag)
console.log(`\n[release] ${tag} poussé, build en cours sur GitHub Actions...`)

let runId = ''
for (let attempt = 0; attempt < 30 && !runId; attempt++) {
  await sleep(4000)
  runId = gh(
    'run',
    'list',
    '-R',
    REPO,
    '--workflow=release.yaml',
    '--branch',
    tag,
    '--limit',
    '1',
    '--json',
    'databaseId',
    '--jq',
    '.[0].databaseId // ""'
  )
}
if (!runId) {
  fail(`Build introuvable. Une fois terminé : npm run release:sign -- ${tag}`)
}
try {
  execFileSync('gh', ['run', 'watch', runId, '-R', REPO, '--exit-status', '--interval', '20'], {
    stdio: 'ignore'
  })
} catch {
  fail(`Le build a échoué : gh run view ${runId} -R ${REPO} --log-failed. Rien n'est publié.`)
}

execFileSync(process.execPath, ['scripts/sign-release.mjs', tag], { stdio: 'inherit' })
