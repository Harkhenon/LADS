import { spawn } from 'node:child_process'
import { existsSync } from 'node:fs'
import path from 'node:path'
import { log } from './log.mjs'
import { browserProfileDir } from './paths.mjs'

function browserCandidates() {
  const roots = [
    process.env['ProgramFiles(x86)'],
    process.env.ProgramFiles,
    process.env.LOCALAPPDATA
  ].filter(Boolean)
  const relative = [
    path.join('Microsoft', 'Edge', 'Application', 'msedge.exe'),
    path.join('Google', 'Chrome', 'Application', 'chrome.exe')
  ]
  return relative.flatMap((rel) => roots.map((root) => path.join(root, rel)))
}

// Un profil dédié garde l'allure d'une application : ni onglets, ni extensions, ni session partagée.
export function openAppWindow(url) {
  const browser = browserCandidates().find((candidate) => existsSync(candidate))
  if (browser) {
    const child = spawn(
      browser,
      [
        `--app=${url}`,
        `--user-data-dir=${browserProfileDir}`,
        '--no-first-run',
        '--no-default-browser-check',
        '--disable-features=Translate',
        '--autoplay-policy=no-user-gesture-required'
      ],
      { detached: true, stdio: 'ignore' }
    )
    child.on('error', (error) => {
      log('error', `lancement de ${browser} impossible :`, error)
      openDefaultBrowser(url)
    })
    child.unref()
    return
  }
  log('warn', 'ni Edge ni Chrome trouvés : ouverture dans le navigateur par défaut')
  openDefaultBrowser(url)
}

function openDefaultBrowser(url) {
  const rundll32 = path.join(process.env.SystemRoot ?? 'C:\\Windows', 'System32', 'rundll32.exe')
  spawn(rundll32, ['url.dll,FileProtocolHandler', url], { detached: true, stdio: 'ignore' }).unref()
}
