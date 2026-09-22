import { ActionIcon, Card, Group, Progress, Stack, Text } from '@mantine/core'
import { IconCancel, IconTrash } from '@tabler/icons-react'
import PropTypes from 'prop-types'

const statusLabels = {
  downloading: 'Téléchargement en cours…',
  completed: 'Terminé',
  cancelled: 'Annulé',
  error: 'Erreur'
}

const statusColors = {
  downloading: 'pastelBlue',
  completed: 'teal',
  cancelled: 'gray',
  error: 'red'
}

const downloadItemShape = PropTypes.shape({
  title: PropTypes.string,
  percent: PropTypes.number,
  totalSize: PropTypes.string,
  speed: PropTypes.string,
  eta: PropTypes.string,
  status: PropTypes.oneOf(['downloading', 'completed', 'cancelled', 'error']),
  error: PropTypes.string
})

DownloadQueuePanel.propTypes = {
  downloads: PropTypes.objectOf(downloadItemShape).isRequired,
  onCancel: PropTypes.func.isRequired,
  onRemove: PropTypes.func.isRequired
}

export default function DownloadQueuePanel({ downloads, onCancel, onRemove }) {
  const entries = Object.entries(downloads)
  if (entries.length === 0) {
    return null
  }

  return (
    <Card className="glass-card" p="md">
      <Text fw={600} mb="sm">
        File de téléchargement ({entries.length})
      </Text>
      <Stack gap="sm">
        {entries.map(([id, item]) => (
          <DownloadQueueItem key={id} id={id} item={item} onCancel={onCancel} onRemove={onRemove} />
        ))}
      </Stack>
    </Card>
  )
}

DownloadQueueItem.propTypes = {
  id: PropTypes.string.isRequired,
  item: downloadItemShape.isRequired,
  onCancel: PropTypes.func.isRequired,
  onRemove: PropTypes.func.isRequired
}

function DownloadQueueItem({ id, item, onCancel, onRemove }) {
  const finished = item.status !== 'downloading'
  return (
    <Stack gap="xs">
      <Group justify="space-between" wrap="nowrap">
        <Text size="sm" fw={500} lineClamp={1} style={{ flex: 1 }}>
          {item.title}
        </Text>
        <Group gap={4}>
          {item.status === 'downloading' && (
            <ActionIcon
              variant="light"
              color="pastelBlue"
              size="sm"
              title="Annuler le téléchargement"
              onClick={() => onCancel(id)}
            >
              <IconCancel size={16} />
            </ActionIcon>
          )}
          {finished && (
            <ActionIcon
              variant="light"
              color="pastelBlue"
              size="sm"
              title="Retirer de la file"
              onClick={() => onRemove(id)}
            >
              <IconTrash size={16} />
            </ActionIcon>
          )}
        </Group>
      </Group>
      {item.status === 'error' ? (
        <Text size="xs" c="red" lineClamp={2}>
          {item.error}
        </Text>
      ) : (
        <Progress
          value={item.percent ?? 0}
          color={statusColors[item.status]}
          radius="xl"
          size="sm"
        />
      )}
      <Group justify="space-between">
        <Text size="xs" c="dimmed">
          {statusLabels[item.status]}
          {item.status === 'downloading' && item.speed ? ` · ${item.speed}` : ''}
          {item.status === 'downloading' && item.eta ? ` · ETA ${item.eta}` : ''}
        </Text>
        <Text size="xs" c="dimmed">
          {Math.round(item.percent ?? 0)}%
        </Text>
      </Group>
    </Stack>
  )
}
