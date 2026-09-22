import { useCallback, useEffect, useRef, useState } from 'react'
import { notifications } from '@mantine/notifications'

const initialItemState = {
  percent: 0,
  totalSize: null,
  speed: null,
  eta: null,
  status: 'downloading',
  error: null,
  filePath: null,
  config: null
}

const completedFields = (payload) => ({
  percent: 100,
  status: 'completed',
  filePath: payload.filePath ?? null
})

export default function useDownloads({ onCompleted } = {}) {
  const [downloads, setDownloads] = useState({})
  const notifiedRef = useRef(new Set())
  const configsRef = useRef({})
  const onCompletedRef = useRef(onCompleted)

  useEffect(() => {
    onCompletedRef.current = onCompleted
  }, [onCompleted])

  useEffect(() => {
    const unsubscribe = window.ytdlp.onEvent((payload) => {
      setDownloads((current) => {
        const item = current[payload.id]
        if (!item) {
          return current
        }
        const next = { ...current }

        switch (payload.event) {
          case 'download-progress':
            next[payload.id] = {
              ...item,
              percent: payload.percent ?? item.percent,
              totalSize: payload.totalSize,
              speed: payload.speed,
              eta: payload.eta
            }
            break
          case 'download-completed':
            next[payload.id] = { ...item, ...completedFields(payload) }
            break
          case 'download-cancelled':
            next[payload.id] = { ...item, status: 'cancelled' }
            break
          case 'download-error':
            next[payload.id] = { ...item, status: 'error', error: payload.message }
            break
          default:
            break
        }
        return next
      })

      if (payload.event === 'download-completed' || payload.event === 'download-error') {
        const key = `${payload.event}:${payload.id}`
        if (!notifiedRef.current.has(key)) {
          notifiedRef.current.add(key)
          const config = configsRef.current[payload.id]
          const title = config?.title ?? 'Téléchargement'
          notifications.show({
            message:
              payload.event === 'download-completed'
                ? `« ${title} » téléchargé.`
                : `Échec du téléchargement : ${payload.message ?? 'erreur inconnue'}`,
            color: payload.event === 'download-completed' ? 'teal' : 'red',
            autoClose: 3500
          })
        }
      }

      if (payload.event === 'download-completed' && onCompletedRef.current) {
        onCompletedRef.current({
          id: payload.id,
          filePath: payload.filePath ?? null,
          config: configsRef.current[payload.id] ?? null
        })
      }
    })
    return unsubscribe
  }, [])

  const startDownload = useCallback(async (config) => {
    const optimisticId = `${Date.now()}-${Math.random().toString(36).slice(2)}`
    setDownloads((current) => ({
      ...current,
      [optimisticId]: { ...initialItemState, title: config.title, config }
    }))
    configsRef.current[optimisticId] = config
    try {
      const { id } = await window.ytdlp.startDownload(config)
      configsRef.current[id] = config
      setDownloads((current) => {
        const next = { ...current }
        delete next[optimisticId]
        next[id] = { ...initialItemState, title: config.title, config }
        return next
      })
      delete configsRef.current[optimisticId]
      return id
    } catch (error) {
      setDownloads((current) => {
        const next = { ...current }
        delete next[optimisticId]
        return next
      })
      delete configsRef.current[optimisticId]
      throw error
    }
  }, [])

  const cancelDownload = useCallback((id) => {
    window.ytdlp.cancelDownload(id)
  }, [])

  const removeDownload = useCallback((id) => {
    notifiedRef.current.delete(`download-completed:${id}`)
    notifiedRef.current.delete(`download-error:${id}`)
    delete configsRef.current[id]
    setDownloads((current) => {
      const next = { ...current }
      delete next[id]
      return next
    })
  }, [])

  return { downloads, startDownload, cancelDownload, removeDownload }
}
