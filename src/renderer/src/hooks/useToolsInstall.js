import { useCallback, useEffect, useRef, useState } from 'react'

const TOOL_EVENTS = {
  'binary-downloading': { tool: 'binary', state: 'busy' },
  'binary-ready': { tool: 'binary', state: 'ready' },
  'binary-error': { tool: 'binary', state: 'error' },
  'runtime-downloading': { tool: 'runtime', state: 'busy' },
  'runtime-ready': { tool: 'runtime', state: 'ready' },
  'runtime-error': { tool: 'runtime', state: 'error' },
  'ffmpeg-downloading': { tool: 'ffmpeg', state: 'busy' },
  'ffmpeg-ready': { tool: 'ffmpeg', state: 'ready' },
  'ffmpeg-error': { tool: 'ffmpeg', state: 'error' },
  'tools-ready': { tool: 'all', state: 'ready' }
}

const initialTools = { binary: 'pending', runtime: 'pending', ffmpeg: 'pending' }

export default function useToolsInstall(enabled = true) {
  const [tools, setTools] = useState(initialTools)
  const [error, setError] = useState(null)
  const [installed, setInstalled] = useState(false)
  const startedRef = useRef(false)

  const runInstall = useCallback(async () => {
    setError(null)
    setTools(initialTools)
    try {
      await window.ytdlp.ensureTools()
      setInstalled(true)
    } catch (e) {
      setError(String(e?.message ?? e))
    }
  }, [])

  // L'installation (téléchargement de plus de 100 Mo) attend la première visite de l'onglet.
  useEffect(() => {
    if (enabled && !startedRef.current) {
      startedRef.current = true
      window.ytdlp
        .ensureTools()
        .then(() => setInstalled(true))
        .catch((e) => setError(String(e?.message ?? e)))
    }
  }, [enabled])

  useEffect(() => {
    let cancelled = false

    const unsubscribe = window.ytdlp.onEvent((payload) => {
      if (cancelled) {
        return
      }
      const info = TOOL_EVENTS[payload.event]
      if (!info) {
        return
      }
      if (info.state === 'error') {
        setError(payload.message ?? 'Erreur inconnue')
      }
      if (info.tool === 'all') {
        setInstalled(true)
        return
      }
      setTools((current) => {
        if (current[info.tool] === info.state) {
          return current
        }
        return { ...current, [info.tool]: info.state }
      })
    })

    return () => {
      cancelled = true
      unsubscribe()
    }
  }, [])

  return { tools, error, installed, retry: runInstall }
}
