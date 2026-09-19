import { Badge, Box, Button, Group, Progress, Stack, Text } from '@mantine/core'
import { notifications } from '@mantine/notifications'
import {
  IconCircleCheck,
  IconDownload,
  IconInfoCircle,
  IconRefresh,
  IconRocket
} from '@tabler/icons-react'
import { useEffect, useState } from 'react'
import PropTypes from 'prop-types'

const STATUS = {
  IDLE: 'idle',
  CHECKING: 'checking',
  AVAILABLE: 'available',
  NOT_AVAILABLE: 'not-available',
  DOWNLOADING: 'downloading',
  DOWNLOADED: 'downloaded',
  ERROR: 'error'
}

UpdatePanel.propTypes = {
  currentVersion: PropTypes.string.isRequired
}

export default function UpdatePanel({ currentVersion }) {
  const [status, setStatus] = useState(STATUS.IDLE)
  const [availableVersion, setAvailableVersion] = useState(null)
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    if (!window.updater) return undefined
    return window.updater.onUpdateEvent(({ event, args }) => {
      switch (event) {
        case 'checking-for-update':
          setStatus(STATUS.CHECKING)
          break
        case 'update-available':
          setAvailableVersion(args[0]?.version ?? null)
          setStatus(STATUS.AVAILABLE)
          break
        case 'update-not-available':
          setStatus(STATUS.NOT_AVAILABLE)
          break
        case 'download-progress':
          setProgress(Math.round(args[0]?.percent ?? 0))
          setStatus(STATUS.DOWNLOADING)
          break
        case 'update-downloaded':
          setStatus(STATUS.DOWNLOADED)
          break
        case 'error': {
          setStatus(STATUS.ERROR)
          const err = args.find((a) => a?.message)
          notifications.show({
            title: 'Erreur de mise à jour',
            message: err?.message ?? 'Erreur inconnue',
            color: 'rosePetal',
            icon: <IconInfoCircle />
          })
          break
        }
      }
    })
  }, [])

  const handleCheck = async () => {
    if (!window.updater) {
      console.log('[LADS test] Vérification des mises à jour')
      return
    }
    try {
      await window.updater.checkForUpdates()
    } catch (error) {
      setStatus(STATUS.ERROR)
      notifications.show({
        title: 'Erreur de mise à jour',
        message: String(error),
        color: 'rosePetal',
        icon: <IconInfoCircle />
      })
    }
  }

  const handleDownload = async () => {
    if (!window.updater) {
      console.log('[LADS test] Téléchargement de la mise à jour')
      return
    }
    setProgress(0)
    try {
      await window.updater.downloadUpdate()
    } catch (error) {
      setStatus(STATUS.ERROR)
      notifications.show({
        title: 'Erreur de téléchargement',
        message: String(error),
        color: 'rosePetal',
        icon: <IconInfoCircle />
      })
    }
  }

  const handleInstall = () => {
    if (!window.updater) {
      console.log('[LADS test] Redémarrage et installation')
      return
    }
    window.updater.quitAndInstall()
  }

  return (
    <Stack gap="xs" align="center" w="100%">
      <Group justify="center">
        <Badge size="lg" color="pastelBlue" leftSection={<IconInfoCircle size={14} />}>
          Version {currentVersion}
        </Badge>
        {availableVersion && status === STATUS.AVAILABLE && (
          <Badge size="lg" color="softSky" leftSection={<IconCircleCheck size={14} />}>
            {availableVersion} disponible
          </Badge>
        )}
      </Group>

      {status === STATUS.DOWNLOADING && (
        <Stack gap={4} w="100%" maw={360}>
          <Group justify="space-between">
            <Text size="sm" c="dimmed">
              Téléchargement en cours…
            </Text>
            <Text size="sm" c="pastelBlue">
              {progress}%
            </Text>
          </Group>
          <Progress value={progress} color="pastelBlue" radius="lg" size="sm" />
        </Stack>
      )}

      <Group justify="center">
        {status === STATUS.DOWNLOADED ? (
          <Button
            variant="light"
            color="pastelBlue"
            leftSection={<IconRocket size={16} />}
            onClick={handleInstall}
          >
            Redémarrer et installer
          </Button>
        ) : status === STATUS.AVAILABLE ? (
          <Button
            variant="light"
            color="pastelBlue"
            leftSection={<IconDownload size={16} />}
            onClick={handleDownload}
          >
            Télécharger la mise à jour
          </Button>
        ) : (
          <Button
            variant="light"
            color="pastelBlue"
            leftSection={<IconRefresh size={16} />}
            loading={status === STATUS.CHECKING}
            onClick={handleCheck}
          >
            Vérifier les mises à jour
          </Button>
        )}
      </Group>

      {status === STATUS.NOT_AVAILABLE && (
        <Box>
          <Text size="sm" c="dimmed">
            LADS est à jour.
          </Text>
        </Box>
      )}
    </Stack>
  )
}
