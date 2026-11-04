import { Badge, Button, Group, Stack, Text } from '@mantine/core'
import { notifications } from '@mantine/notifications'
import { IconCircleCheck, IconInfoCircle, IconRefresh, IconRocket } from '@tabler/icons-react'
import { useEffect, useState } from 'react'
import PropTypes from 'prop-types'

const STATUS = {
  IDLE: 'idle',
  CHECKING: 'checking',
  DOWNLOADING: 'downloading',
  NOT_AVAILABLE: 'not-available',
  READY: 'ready'
}

UpdatePanel.propTypes = {
  currentVersion: PropTypes.string.isRequired
}

// Les mises à jour se téléchargent seules et s'appliquent au prochain lancement.
// Rien n'est demandé à l'utilisateur : ce panneau ne fait qu'informer.
export default function UpdatePanel({ currentVersion }) {
  const [status, setStatus] = useState(STATUS.IDLE)
  const [availableVersion, setAvailableVersion] = useState(null)

  useEffect(() => {
    window.updater
      .status()
      .then(({ readyVersion }) => {
        if (readyVersion) {
          setAvailableVersion(readyVersion)
          setStatus(STATUS.READY)
        }
      })
      .catch(() => {})

    return window.updater.onUpdateEvent(({ event, args }) => {
      switch (event) {
        case 'checking-for-update':
          setStatus((current) => (current === STATUS.READY ? current : STATUS.CHECKING))
          break
        case 'update-available':
          setAvailableVersion(args[0]?.version ?? null)
          setStatus(STATUS.DOWNLOADING)
          break
        case 'update-not-available':
          setStatus(STATUS.NOT_AVAILABLE)
          break
        case 'update-downloaded':
          setAvailableVersion(args[0]?.version ?? null)
          setStatus(STATUS.READY)
          break
        case 'update-idle':
          setStatus(STATUS.IDLE)
          break
        case 'error':
          setStatus(STATUS.IDLE)
          notifications.show({
            title: 'Erreur de mise à jour',
            message: args[0]?.message ?? 'Erreur inconnue',
            color: 'rosePetal',
            icon: <IconInfoCircle />
          })
          break
      }
    })
  }, [])

  const handleCheck = () => {
    window.updater.checkForUpdates().catch(() => setStatus(STATUS.IDLE))
  }

  return (
    <Stack gap="xs" align="center" w="100%">
      <Group justify="center">
        <Badge size="lg" color="pastelBlue" leftSection={<IconInfoCircle size={14} />}>
          Version {currentVersion}
        </Badge>
        {status === STATUS.READY && (
          <Badge size="lg" color="softSky" leftSection={<IconCircleCheck size={14} />}>
            {availableVersion} prête
          </Badge>
        )}
      </Group>

      <Group justify="center">
        {status === STATUS.READY ? (
          <Button
            variant="light"
            color="pastelBlue"
            leftSection={<IconRocket size={16} />}
            onClick={() => window.updater.restart()}
          >
            Redémarrer maintenant
          </Button>
        ) : (
          <Button
            variant="light"
            color="pastelBlue"
            leftSection={<IconRefresh size={16} />}
            loading={status === STATUS.CHECKING || status === STATUS.DOWNLOADING}
            onClick={handleCheck}
          >
            Vérifier les mises à jour
          </Button>
        )}
      </Group>

      {status === STATUS.READY && (
        <Text size="sm" c="dimmed">
          La nouvelle version s&apos;installera toute seule au prochain lancement de LADS.
        </Text>
      )}
      {status === STATUS.DOWNLOADING && (
        <Text size="sm" c="dimmed">
          Préparation de la version {availableVersion}…
        </Text>
      )}
      {status === STATUS.NOT_AVAILABLE && (
        <Text size="sm" c="dimmed">
          LADS est à jour.
        </Text>
      )}
    </Stack>
  )
}
