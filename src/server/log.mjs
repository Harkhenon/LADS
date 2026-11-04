import fs from 'node:fs'
import path from 'node:path'
import { logFile } from './paths.mjs'

const MAX_LOG_BYTES = 1024 * 1024

// Sans fenêtre de console, ce fichier est le seul moyen de comprendre une panne à distance.
export function log(level, ...parts) {
  const message = parts.map((p) => (p instanceof Error ? p.message : String(p))).join(' ')
  const line = `${new Date().toISOString()} [${level}] ${message}\n`
  try {
    fs.mkdirSync(path.dirname(logFile), { recursive: true })
    if (fs.existsSync(logFile) && fs.statSync(logFile).size > MAX_LOG_BYTES) {
      fs.renameSync(logFile, `${logFile}.old`)
    }
    fs.appendFileSync(logFile, line)
  } catch {
    // Un journal inaccessible ne doit jamais empêcher l'application de fonctionner.
  }
  if (process.env.LADS_DEV) {
    console.log(line.trimEnd())
  }
}
