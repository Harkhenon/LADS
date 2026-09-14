import {
  Avatar,
  Badge,
  Box,
  Button,
  Card,
  Group,
  SimpleGrid,
  Stack,
  Text,
  Title
} from '@mantine/core'
import { notifications } from '@mantine/notifications'
import { IconHeart, IconHome, IconMusic, IconPlaylist, IconInfoCircle } from '@tabler/icons-react'
import { useState, useEffect } from 'react'
import PropTypes from 'prop-types'

AccueilPage.propTypes = {
  onNavigate: PropTypes.func
}

export default function AccueilPage({ onNavigate }) {
  const [infos] = useState(() => window.base?.appInfos?.() ?? null)
  const [update, setUpdate] = useState(null)

  const name = infos?.name ?? 'LADS'
  const version = infos?.version ?? '0.0.0'
  const description = infos?.description ?? ''
  const author = infos?.author ?? ''
  const homepage = infos?.homepage ?? '#'

  useEffect(() => {
    fetch('https://api.harkhenon.dev/api/lads/version')
      .then((data) => {
        return data.json()
      })
      .then((data) => {
        setUpdate(data)
      })
      .catch((error) => {
        console.error(error)
      })
  }, [])

  const handleUpdate = () => {
    if (version !== update?.version) {
      notifications.show({
        title: `Une mise à jour est disponible (${version})`,
        message: `Le logiciel va se mettre à jour`,
        icon: <IconInfoCircle />
      })
    } else {
      notifications.show({
        title: `Aucune mise à jour disponible`,
        icon: <IconInfoCircle />
      })
    }
  }

  return (
    <Stack gap="lg" align="center" justify="center" h="100%" style={{ overflowY: 'auto' }}>
      <Card
        className="glass-card"
        shadow="xl"
        radius="lg"
        p="xl"
        w="100%"
        maw={640}
        style={{ textAlign: 'center' }}
      >
        <Stack gap="md" align="center">
          <Avatar color="pastelBlue" radius="xl" size={72} variant="light">
            <IconMusic size={36} />
          </Avatar>

          <Box>
            <Title order={2}>
              {name}{' '}
              <Text span c="pastelBlue" inherit>
                ♥
              </Text>
            </Title>
            <Text size="sm" c="dimmed">
              Les Animations De Sybille
            </Text>
          </Box>

          {description && (
            <Text size="md" c="dimmed" maw={480}>
              {description}
            </Text>
          )}

          <Group justify="center">
            <Badge
              size="lg"
              variant="light"
              color="pastelBlue"
              leftSection={<IconHome size={14} />}
            >
              Version {version}
            </Badge>
          </Group>

          <Button variant="light" color="pastelBlue" onClick={handleUpdate}>
            Vérifier les mises à jour
          </Button>
        </Stack>
      </Card>

      <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md" w="100%" maw={640}>
        <Card
          className="glass-card"
          radius="md"
          p="lg"
          onClick={() => onNavigate?.('playlists')}
          style={{ cursor: onNavigate ? 'pointer' : 'default' }}
        >
          <Group gap="md" align="flex-start">
            <ActionIconCircle color="pastelBlue" icon={<IconPlaylist size={22} />} />
            <Stack gap={2}>
              <Text fw={600}>Playlists</Text>
              <Text size="sm" c="dimmed">
                Gérez vos playlists et les karaokés associés.
              </Text>
            </Stack>
          </Group>
        </Card>

        <Card
          className="glass-card"
          radius="md"
          p="lg"
          onClick={() => onNavigate?.('telechargement')}
          style={{ cursor: onNavigate ? 'pointer' : 'default' }}
        >
          <Group gap="md" align="flex-start">
            <ActionIconCircle color="pastelBlue" icon={<IconMusic size={22} />} />
            <Stack gap={2}>
              <Text fw={600}>Téléchargement</Text>
              <Text size="sm" c="dimmed">
                Recherchez et téléchargez vos vidéos YouTube.
              </Text>
            </Stack>
          </Group>
        </Card>
      </SimpleGrid>

      <Group gap="xs" c="dimmed">
        <IconHeart size={14} />
        <Text size="xs">
          Réalisé par {author}
          {homepage !== '#' && (
            <>
              {' — '}
              <a href={homepage} target="_blank" rel="noreferrer" style={{ color: 'inherit' }}>
                {homepage}
              </a>
            </>
          )}
        </Text>
      </Group>
    </Stack>
  )
}

function ActionIconCircle({ color, icon }) {
  return (
    <Box
      style={{
        width: 44,
        height: 44,
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: `var(--mantine-color-${color}-light)`,
        color: `var(--mantine-color-${color}-6)`,
        flexShrink: 0
      }}
    >
      {icon}
    </Box>
  )
}

ActionIconCircle.propTypes = {
  color: PropTypes.string.isRequired,
  icon: PropTypes.node.isRequired
}
