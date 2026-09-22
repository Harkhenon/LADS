import { useCallback, useEffect, useRef, useState } from 'react'
import { notifications } from '@mantine/notifications'

const initialItemState = {
  percent: 0,
  totalSize: null,
  speed: null,
  eta: null,
  status: 'downloading',
  error: null
}

export default function useDownloads() {
  const [downloads, setDownloads] = useState({})
  const notifiedRef = useRef(new Set())

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
            next[payload.id] = { ...item, percent: 100, status: 'completed' }
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
          const title = downloads[payload.id]?.title ?? 'Téléchargement'
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
    })
    return unsubscribe
  }, [downloads])

  const startDownload = useCallback(async (config) => {
    const optimisticId = `${Date.now()}-${Math.random().toString(36).slice(2)}`
    setDownloads((current) => ({
      ...current,
      [optimisticId]: { ...initialItemState, title: config.title }
    }))
    try {
      const { id } = await window.ytdlp.startDownload(config)
      setDownloads((current) => {
        const next = { ...current }
        delete next[optimisticId]
        next[id] = { ...initialItemState, title: config.title }
        return next
      })
      return id
    } catch (error) {
      setDownloads((current) => {
        const next = { ...current }
        delete next[optimisticId]
        return next
      })
      throw error
    }
  }, [])

  const cancelDownload = useCallback((id) => {
    window.ytdlp.cancelDownload(id)
  }, [])

  const removeDownload = useCallback((id) => {
    notifiedRef.current.delete(`download-completed:${id}`)
    notifiedRef.current.delete(`download-error:${id}`)
    setDownloads((current) => {
      const next = { ...current }
      delete next[id]
      return next
    })
  }, [])

  return { downloads, startDownload, cancelDownload, removeDownload }
}
