import {
  Button,
  Group,
  Modal,
  SegmentedControl,
  Select,
  Stack,
  Text,
  TextInput
} from '@mantine/core'
import { useForm } from '@mantine/form'
import PropTypes from 'prop-types'
import { resolutionOptions } from '../data/mockData'

KaraokeEditModal.propTypes = {
  opened: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  karaoke: PropTypes.shape({
    id: PropTypes.string,
    title: PropTypes.string,
    format: PropTypes.string,
    resolution: PropTypes.string
  }),
  onSave: PropTypes.func.isRequired
}

export default function KaraokeEditModal({ opened, onClose, karaoke, onSave }) {
  const form = useForm({
    initialValues: {
      title: karaoke?.title ?? '',
      format: karaoke?.format ?? 'mp4',
      resolution: karaoke?.resolution ?? '1080p'
    },
    validate: {
      title: (value) => (value.trim().length > 0 ? null : 'Le titre est obligatoire')
    }
  })

  const handleSubmit = (values) => {
    onSave({ ...karaoke, ...values })
    onClose()
  }

  return (
    <Modal opened={opened} onClose={onClose} title="Modifier le karaoké" centered size="md">
      <form onSubmit={form.onSubmit(handleSubmit)}>
        <Stack>
          <TextInput
            label="Titre"
            placeholder="Titre de la chanson"
            withAsterisk
            {...form.getInputProps('title')}
          />
          <Stack gap="xs">
            <Text size="sm" fw={500}>
              Format
            </Text>
            <SegmentedControl
              data={[
                { value: 'mp4', label: 'Vidéo (mp4)' },
                { value: 'mp3', label: 'Audio (mp3)' }
              ]}
              {...form.getInputProps('format')}
            />
          </Stack>
          <Select
            label="Résolution"
            data={resolutionOptions}
            {...form.getInputProps('resolution')}
          />
          <Group justify="flex-end">
            <Button variant="default" onClick={onClose}>
              Annuler
            </Button>
            <Button type="submit">Enregistrer</Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  )
}
