import { Button, Group, SegmentedControl, Select, Stack, Text, TextInput } from '@mantine/core'
import { IconDownload } from '@tabler/icons-react'
import { useForm } from '@mantine/form'
import PropTypes from 'prop-types'
import { downloadLocationOptions, formatOptions, resolutionOptions } from '../data/mockData'
import { testDownloadVideo } from '../data/testFunctions'

DownloadConfigForm.propTypes = {
  playlists: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      name: PropTypes.string.isRequired
    })
  ).isRequired,
  selectedVideo: PropTypes.shape({
    id: PropTypes.string,
    title: PropTypes.string
  })
}

export default function DownloadConfigForm({ playlists, selectedVideo }) {
  const form = useForm({
    initialValues: {
      format: 'video',
      resolution: '1080p',
      playlist: playlists[0]?.id ?? '',
      location: 'documents',
      customLocation: ''
    },
    validate: {
      playlist: (value) => (value ? null : 'Sélectionnez une playlist')
    }
  })

  const handleSubmit = (values) => {
    testDownloadVideo({
      video: selectedVideo,
      ...values
    })
  }

  return (
    <form onSubmit={form.onSubmit(handleSubmit)}>
      <Stack gap="md">
        <Stack gap="xs">
          <Text size="sm" fw={500}>
            Vidéo sélectionnée
          </Text>
          {selectedVideo ? (
            <Text size="sm" lineClamp={2}>
              {selectedVideo.title}
            </Text>
          ) : (
            <Text size="sm" c="dimmed">
              Aucune vidéo sélectionnée dans les résultats.
            </Text>
          )}
        </Stack>

        <Stack gap="xs">
          <Text size="sm" fw={500}>
            Format
          </Text>
          <SegmentedControl data={formatOptions} {...form.getInputProps('format')} />
        </Stack>

        <Select
          label="Résolution"
          data={resolutionOptions}
          withAsterisk
          {...form.getInputProps('resolution')}
        />

        <Select
          label="Playlist associée"
          data={playlists.map((p) => ({ value: p.id, label: p.name }))}
          withAsterisk
          placeholder="Choisir une playlist"
          {...form.getInputProps('playlist')}
        />

        <Select
          label="Emplacement de téléchargement"
          data={downloadLocationOptions}
          withAsterisk
          {...form.getInputProps('location')}
        />

        {form.values.location === 'custom' && (
          <TextInput
            label="Dossier personnalisé"
            placeholder="/chemin/vers/le/dossier"
            {...form.getInputProps('customLocation')}
          />
        )}

        <Group justify="flex-end">
          <Button type="submit" leftSection={<IconDownload size={16} />} disabled={!selectedVideo}>
            Télécharger
          </Button>
        </Group>
      </Stack>
    </form>
  )
}
