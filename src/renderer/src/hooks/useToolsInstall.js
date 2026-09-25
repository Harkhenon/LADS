import { useCallback, useEffect, useState } from 'react'

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

export default function useToolsInstall() {
  const [tools, setTools] = useState(initialTools)
  const [error, setError] = useState(null)
  const [installed, setInstalled] = useState(false)

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

    if (!cancelled) {
      window.ytdlp.ensureTools().catch(() => {})
    }

    return () => {
      cancelled = true
      unsubscribe()
    }
  }, [])

  return { tools, error, installed, retry: runInstall }
}
