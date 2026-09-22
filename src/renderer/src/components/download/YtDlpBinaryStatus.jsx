import { Alert, Badge, Button, Group, Text } from '@mantine/core'
import { IconDownload, IconLoader2 } from '@tabler/icons-react'
import { useEffect, useState } from 'react'

export default function YtDlpBinaryStatus() {
  const [status, setStatus] = useState(null)
  const [runtimeBusy, setRuntimeBusy] = useState(false)

  useEffect(() => {
    window.ytdlp.getBinaryStatus().then(setStatus)
    const unsubscribe = window.ytdlp.onEvent((payload) => {
      if (payload.event === 'binary-downloading') {
        setStatus((s) => ({ ...s, state: 'downloading' }))
      }
      if (payload.event === 'binary-ready') {
        setStatus({ state: 'ready', version: payload.version })
      }
      if (payload.event === 'binary-error') {
        setStatus((s) => ({ ...s, state: 'missing' }))
      }
      if (payload.event === 'runtime-downloading') {
        setRuntimeBusy(true)
      }
      if (payload.event === 'runtime-ready' || payload.event === 'runtime-error') {
        setRuntimeBusy(false)
      }
    })
    return unsubscribe
  }, [])

  if (runtimeBusy) {
    return (
      <Alert icon={<IconLoader2 size={18} spin />} color="pastelBlue" variant="light">
        Préparation du moteur JavaScript (Deno/Node) — première fois uniquement…
      </Alert>
    )
  }

  if (!status || status.state === 'ready') {
    return null
  }

  if (status.state === 'downloading') {
    return (
      <Alert icon={<IconLoader2 size={18} spin />} color="pastelBlue" variant="light">
        Téléchargement du moteur yt-dlp en cours…
      </Alert>
    )
  }

  return (
    <Group justify="space-between" wrap="nowrap">
      <Group gap="xs" wrap="nowrap">
        <Badge color="orange" variant="light">
          yt-dlp requis
        </Badge>
        <Text size="sm" c="dimmed">
          Le moteur de téléchargement n&rsquo;est pas encore installé.
        </Text>
      </Group>
      <Button
        size="xs"
        variant="light"
        color="pastelBlue"
        leftSection={<IconDownload size={14} />}
        onClick={() => window.ytdlp.downloadBinary()}
      >
        Installer yt-dlp
      </Button>
    </Group>
  )
}
