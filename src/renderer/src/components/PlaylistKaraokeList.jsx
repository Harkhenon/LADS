import { ActionIcon, Badge, Group, Menu, Stack, Text } from '@mantine/core'
import { IconDots, IconEdit, IconMusic, IconTrash } from '@tabler/icons-react'
import { useState } from 'react'
import PropTypes from 'prop-types'
import KaraokeEditModal from './KaraokeEditModal'

const karaokeShape = PropTypes.shape({
  id: PropTypes.string,
  title: PropTypes.string,
  format: PropTypes.string,
  resolution: PropTypes.string,
  duration: PropTypes.string,
  addedAt: PropTypes.string
})

PlaylistKaraokeList.propTypes = {
  playlist: PropTypes.shape({
    id: PropTypes.string,
    name: PropTypes.string,
    description: PropTypes.string,
    karaoke: PropTypes.arrayOf(karaokeShape)
  }),
  onUpdateKaraoke: PropTypes.func.isRequired,
  onDeleteKaraoke: PropTypes.func.isRequired
}

export default function PlaylistKaraokeList({ playlist, onUpdateKaraoke, onDeleteKaraoke }) {
  const [editing, setEditing] = useState(null)

  if (!playlist || playlist.karaoke.length === 0) {
    return (
      <Text c="dimmed" size="sm" ta="center" mt="md">
        Aucun karaoké dans cette playlist pour le moment.
      </Text>
    )
  }

  return (
    <>
      <Stack gap="xs" mt="md">
        {playlist.karaoke.map((kara) => (
          <Group key={kara.id} wrap="nowrap" justify="space-between">
            <Group gap="sm" wrap="nowrap">
              <IconMusic size={18} />
              <Stack gap={2}>
                <Text size="sm" fw={500} lineClamp={1}>
                  {kara.title}
                </Text>
                <Group gap="xs">
                  <Badge size="xs" variant="light" color="pastelBlue">
                    {kara.format}
                  </Badge>
                  <Badge size="xs" variant="light" color="gray">
                    {kara.resolution}
                  </Badge>
                  <Text size="xs" c="dimmed">
                    {kara.duration}
                  </Text>
                </Group>
              </Stack>
            </Group>
            <Menu position="bottom-end" shadow="md" width={180}>
              <Menu.Target>
                <ActionIcon variant="subtle" color="gray">
                  <IconDots size={16} />
                </ActionIcon>
              </Menu.Target>
              <Menu.Dropdown>
                <Menu.Item leftSection={<IconEdit size={14} />} onClick={() => setEditing(kara)}>
                  Modifier
                </Menu.Item>
                <Menu.Item
                  color="red"
                  leftSection={<IconTrash size={14} />}
                  onClick={() => onDeleteKaraoke(kara.id)}
                >
                  Supprimer
                </Menu.Item>
              </Menu.Dropdown>
            </Menu>
          </Group>
        ))}
      </Stack>

      <KaraokeEditModal
        opened={editing !== null}
        onClose={() => setEditing(null)}
        karaoke={editing}
        onSave={(updated) => {
          onUpdateKaraoke(updated.id, updated)
          setEditing(null)
        }}
      />
    </>
  )
}
