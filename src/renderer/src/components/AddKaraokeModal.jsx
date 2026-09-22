import {
  Badge,
  Button,
  Group,
  Modal,
  ScrollArea,
  Stack,
  Switch,
  Text,
  TextInput,
  UnstyledButton
} from '@mantine/core'
import { IconFolder, IconMusic, IconSearch, IconVideo } from '@tabler/icons-react'
import { useEffect, useMemo, useState } from 'react'
import PropTypes from 'prop-types'

const mediaFileShape = PropTypes.shape({
  id: PropTypes.string.isRequired,
  name: PropTypes.string.isRequired,
  path: PropTypes.string.isRequired,
  format: PropTypes.oneOf(['mp3', 'mp4']).isRequired,
  extension: PropTypes.string,
  size: PropTypes.number
})

AddKaraokeModal.propTypes = {
  opened: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  onAdd: PropTypes.func.isRequired
}

export default function AddKaraokeModal({ opened, onClose, onAdd }) {
  const [folder, setFolder] = useState(null)
  const [files, setFiles] = useState([])
  const [loading, setLoading] = useState(false)
  const [filter, setFilter] = useState('')
  const [selected, setSelected] = useState([])

  useEffect(() => {
    if (!opened) {
      const timer = setTimeout(() => {
        setFilter('')
        setSelected([])
      }, 0)
      return () => clearTimeout(timer)
    }
  }, [opened])

  const loadFolder = async () => {
    const picked = await window.media.pickFolder()
    if (!picked) {
      return
    }
    setFolder(picked)
    setLoading(true)
    try {
      setFiles(await window.media.listFiles(picked))
    } finally {
      setLoading(false)
    }
  }

  const visibleFiles = useMemo(() => {
    const needle = filter.trim().toLowerCase()
    if (!needle) {
      return files
    }
    return files.filter((f) => f.name.toLowerCase().includes(needle))
  }, [files, filter])

  const toggleFile = (file) => {
    setSelected((current) =>
      current.some((f) => f.id === file.id)
        ? current.filter((f) => f.id !== file.id)
        : [...current, file]
    )
  }

  const toggleAll = (checked) => {
    setSelected(checked ? [...visibleFiles] : [])
  }

  const handleSubmit = () => {
    onAdd(selected.map(fileToKaraoke))
    onClose()
  }

  return (
    <Modal opened={opened} onClose={onClose} title="Ajouter des karaokés" size="lg" centered>
      <Stack gap="md">
        <Group justify="space-between" wrap="nowrap">
          <Text size="sm" c="dimmed" lineClamp={1} style={{ flex: 1 }}>
            {folder ?? 'Aucun dossier sélectionné'}
          </Text>
          <Button
            variant="light"
            color="pastelBlue"
            leftSection={<IconFolder size={16} />}
            onClick={loadFolder}
          >
            Choisir un dossier
          </Button>
        </Group>

        {folder && files.length > 0 && (
          <Group gap="md">
            <TextInput
              placeholder="Filtrer par nom de fichier…"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              leftSection={<IconSearch size={16} />}
              style={{ flex: 1 }}
            />
            <Switch
              label="Tout sélectionner"
              checked={selected.length === visibleFiles.length && visibleFiles.length > 0}
              onChange={(e) => toggleAll(e.currentTarget.checked)}
            />
          </Group>
        )}

        {folder && (
          <ScrollArea.Autosize mah={280} type="hover">
            <Stack gap="xs">
              {loading && (
                <Text size="sm" c="dimmed" ta="center">
                  Lecture du dossier…
                </Text>
              )}
              {!loading && files.length === 0 && (
                <Text size="sm" c="dimmed" ta="center">
                  Aucun fichier audio ou vidéo trouvé dans ce dossier.
                </Text>
              )}
              {!loading &&
                visibleFiles.map((file) => (
                  <FileRow
                    key={file.id}
                    file={file}
                    checked={selected.some((f) => f.id === file.id)}
                    onToggle={() => toggleFile(file)}
                  />
                ))}
            </Stack>
          </ScrollArea.Autosize>
        )}

        <Group justify="space-between">
          <Text size="sm" c="dimmed">
            {selected.length} fichier(s) sélectionné(s)
          </Text>
          <Group>
            <Button variant="subtle" onClick={onClose}>
              Annuler
            </Button>
            <Button color="pastelBlue" disabled={selected.length === 0} onClick={handleSubmit}>
              Ajouter à la playlist
            </Button>
          </Group>
        </Group>
      </Stack>
    </Modal>
  )
}

FileRow.propTypes = {
  file: mediaFileShape.isRequired,
  checked: PropTypes.bool.isRequired,
  onToggle: PropTypes.func.isRequired
}

function FileRow({ file, checked, onToggle }) {
  return (
    <UnstyledButton
      onClick={onToggle}
      style={{
        display: 'block',
        width: '100%',
        padding: '8px 10px',
        borderRadius: 'var(--mantine-radius-md)',
        backgroundColor: checked ? 'rgba(120, 160, 240, 0.20)' : 'rgba(48, 74, 130, 0.18)'
      }}
    >
      <Group gap="sm" wrap="nowrap">
        {file.format === 'mp3' ? <IconMusic size={18} /> : <IconVideo size={18} />}
        <Stack gap={2} style={{ minWidth: 0, flex: 1 }}>
          <Text size="sm" fw={500} lineClamp={1}>
            {file.name}
          </Text>
          <Text size="xs" c="dimmed" lineClamp={1}>
            {file.path}
          </Text>
        </Stack>
        <Badge size="xs" variant="light" color={file.format === 'mp3' ? 'lavenderMist' : 'softSky'}>
          {file.extension || file.format}
        </Badge>
      </Group>
    </UnstyledButton>
  )
}

function fileToKaraoke(file) {
  return {
    id: `k-${crypto.randomUUID()}`,
    title: file.name.replace(/\.[^.]+$/, ''),
    format: file.format,
    resolution: file.format === 'mp3' ? 'audio' : '',
    duration: '',
    addedAt: new Date().toISOString().slice(0, 10),
    filePath: file.path
  }
}
