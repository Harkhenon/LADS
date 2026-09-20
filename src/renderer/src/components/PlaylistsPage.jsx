import {
  ActionIcon,
  Box,
  Button,
  Card,
  Grid,
  Group,
  Menu,
  ScrollArea,
  Stack,
  Text,
  Title
} from '@mantine/core'
import { IconDots, IconEdit, IconPlus, IconTrash } from '@tabler/icons-react'
import { useState } from 'react'
import PropTypes from 'prop-types'
import { testDeleteKaraoke, testUpdateKaraoke } from '../data/testFunctions'
import PlaylistFormModal from './PlaylistFormModal'
import PlaylistKaraokeList from './PlaylistKaraokeList'

let playlistCounter = 100

const playlistShape = PropTypes.shape({
  id: PropTypes.string.isRequired,
  name: PropTypes.string.isRequired,
  description: PropTypes.string,
  karaoke: PropTypes.array.isRequired
})

PlaylistsPage.propTypes = {
  playlists: PropTypes.arrayOf(playlistShape).isRequired,
  setPlaylists: PropTypes.func.isRequired
}

export default function PlaylistsPage({ playlists, setPlaylists }) {
  const [selectedId, setSelectedId] = useState(playlists[0]?.id ?? null)

  const [formOpened, setFormOpened] = useState(false)
  const [editingPlaylist, setEditingPlaylist] = useState(null)

  const selected = playlists.find((p) => p.id === selectedId) ?? null

  const openCreate = () => {
    setEditingPlaylist(null)
    setFormOpened(true)
  }

  const openEdit = (playlist) => {
    setEditingPlaylist(playlist)
    setFormOpened(true)
  }

  const handlePlaylistSubmit = async (values) => {
    if (editingPlaylist) {
      const updated = { ...editingPlaylist, ...values }
      setPlaylists((prev) => prev.map((p) => (p.id === updated.id ? updated : p)))
      await window.playlists.update(playlists.map((p) => (p.id === updated.id ? updated : p)))
    } else {
      const created = {
        id: `pl-${playlistCounter + playlists.length}`,
        name: values.name,
        description: values.description,
        karaoke: []
      }
      setPlaylists((prev) => [...prev, created])
      setSelectedId(created.id)
      await window.playlists.update([...playlists, created])
    }
    setFormOpened(false)
    setEditingPlaylist(null)
  }

  const handleDeletePlaylist = (id) => {
    setPlaylists((prev) => prev.filter((p) => p.id !== id))
    if (selectedId === id) {
      setSelectedId(null)
    }
    window.playlists.update(playlists.filter((p) => p.id !== id))
  }

  const handleUpdateKaraoke = (karaId, updated) => {
    setPlaylists((prev) =>
      prev.map((p) =>
        p.id === selectedId
          ? { ...p, karaoke: p.karaoke.map((k) => (k.id === karaId ? updated : k)) }
          : p
      )
    )
    testUpdateKaraoke(updated)
  }

  const handleDeleteKaraoke = (karaId) => {
    setPlaylists((prev) =>
      prev.map((p) =>
        p.id === selectedId ? { ...p, karaoke: p.karaoke.filter((k) => k.id !== karaId) } : p
      )
    )
    testDeleteKaraoke(karaId)
  }

  return (
    <Stack gap="md" h="100%">
      <Group justify="space-between">
        <Title order={3}>Mes playlists</Title>
        <Button leftSection={<IconPlus size={16} />} onClick={openCreate}>
          Nouvelle playlist
        </Button>
      </Group>

      <Grid grow gutter="md" style={{ flex: 1, minHeight: 0 }}>
        <Grid.Col span={{ base: 12, md: 4 }} style={{ minHeight: 0 }}>
          <Card className="glass-card" p="0" h="100%" style={{ overflow: 'hidden' }}>
            <ScrollArea.Autosize mah="100%" type="scroll">
              <Stack gap={0}>
                {playlists.length === 0 ? (
                  <Text c="dimmed" p="md" ta="center">
                    Aucune playlist. Créez-en une !
                  </Text>
                ) : (
                  playlists.map((p) => (
                    <PlaylistListItem
                      key={p.id}
                      playlist={p}
                      active={p.id === selectedId}
                      onSelect={() => setSelectedId(p.id)}
                      onEdit={() => openEdit(p)}
                      onDelete={() => handleDeletePlaylist(p.id)}
                    />
                  ))
                )}
              </Stack>
            </ScrollArea.Autosize>
          </Card>
        </Grid.Col>

        <Grid.Col span={{ base: 12, md: 8 }} style={{ minHeight: 0 }}>
          <Card className="glass-card" p="lg" h="100%" style={{ overflow: 'hidden' }}>
            {selected ? (
              <Box>
                <Group justify="space-between" mb="xs">
                  <Stack gap={2}>
                    <Title order={4}>{selected.name}</Title>
                    {selected.description && (
                      <Text size="sm" c="dimmed">
                        {selected.description}
                      </Text>
                    )}
                  </Stack>
                  <Button
                    variant="light"
                    leftSection={<IconEdit size={16} />}
                    onClick={() => openEdit(selected)}
                  >
                    Modifier
                  </Button>
                </Group>
                <Text size="sm" fw={500} mt="md">
                  Karaokés ({selected.karaoke.length})
                </Text>
                <PlaylistKaraokeList
                  playlist={selected}
                  onUpdateKaraoke={handleUpdateKaraoke}
                  onDeleteKaraoke={handleDeleteKaraoke}
                />
              </Box>
            ) : (
              <Text c="dimmed" ta="center" mt="xl">
                Sélectionnez une playlist à gauche, ou créez-en une nouvelle.
              </Text>
            )}
          </Card>
        </Grid.Col>
      </Grid>

      <PlaylistFormModal
        opened={formOpened}
        onClose={() => {
          setFormOpened(false)
          setEditingPlaylist(null)
        }}
        initialValues={editingPlaylist}
        onSubmit={handlePlaylistSubmit}
      />
    </Stack>
  )
}

PlaylistListItem.propTypes = {
  playlist: playlistShape.isRequired,
  active: PropTypes.bool,
  onSelect: PropTypes.func.isRequired,
  onEdit: PropTypes.func.isRequired,
  onDelete: PropTypes.func.isRequired
}

function PlaylistListItem({ playlist, active, onSelect, onEdit, onDelete }) {
  return (
    <Group
      wrap="nowrap"
      justify="space-between"
      px="md"
      py="sm"
      style={{
        cursor: 'pointer',
        backgroundColor: active ? 'rgba(120, 160, 240, 0.18)' : 'transparent'
      }}
      onClick={onSelect}
    >
      <Stack gap={2}>
        <Text fw={active ? 600 : 500} lineClamp={1}>
          {playlist.name}
        </Text>
        <Text size="xs" c="dimmed">
          {playlist.karaoke.length} karaoké(s)
        </Text>
      </Stack>
      <Menu position="bottom-end" shadow="md" width={160}>
        <Menu.Target>
          <ActionIcon variant="subtle" color="gray" onClick={(e) => e.stopPropagation()}>
            <IconDots size={16} />
          </ActionIcon>
        </Menu.Target>
        <Menu.Dropdown onClick={(e) => e.stopPropagation()}>
          <Menu.Item leftSection={<IconEdit size={14} />} onClick={onEdit}>
            Modifier
          </Menu.Item>
          <Menu.Item color="red" leftSection={<IconTrash size={14} />} onClick={onDelete}>
            Supprimer
          </Menu.Item>
        </Menu.Dropdown>
      </Menu>
    </Group>
  )
}
