import { Box, Group, Image, Stack, Text } from '@mantine/core'
import { IconEye, IconMusic } from '@tabler/icons-react'
import { testSearchYouTube } from '../data/testFunctions'
import { ActionIcon, Card, TextInput, Button, Modal, SimpleGrid } from '@mantine/core'
import { useState } from 'react'
import PropTypes from 'prop-types'
import DownloadConfigForm from './DownloadConfigForm'

const playlistShape = PropTypes.shape({
  id: PropTypes.string.isRequired,
  name: PropTypes.string.isRequired
})

TelechargementPage.propTypes = {
  playlists: PropTypes.arrayOf(playlistShape).isRequired
}

export default function TelechargementPage({ playlists }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [searched, setSearched] = useState(false)
  const [preview, setPreview] = useState(null)
  const [selectedVideo, setSelectedVideo] = useState(null)

  const handleSearch = async () => {
    testSearchYouTube(query)
    setResults(await window.youtube.search(query))
    setSearched(true)
    setSelectedVideo(null)
  }

  return (
    <Stack gap="md" h="100%">
      <Box>
        <Text fw={600} mb="xs">
          Rechercher une vidéo sur YouTube
        </Text>
        <Group>
          <TextInput
            placeholder="Titre de la chanson, artiste, URL…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            style={{ flex: 1 }}
          />
          <Button onClick={handleSearch}>Rechercher</Button>
        </Group>
      </Box>

      <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md" style={{ flex: 1, minHeight: 0 }}>
        <Card className="glass-card" p="md" style={{ minHeight: 0, overflow: 'hidden' }}>
          <Text fw={600} mb="sm">
            {searched ? '5 résultats de recherche' : 'Résultats de recherche'}
          </Text>
          {results.length === 0 ? (
            <Text c="dimmed" size="sm" ta="center" mt="xl">
              {searched
                ? 'Aucun résultat trouvé.'
                : 'Lancez une recherche pour afficher les vidéos.'}
            </Text>
          ) : (
            <Stack gap="xs">
              {results.map((r) => (
                <SearchResultItem
                  key={r.id}
                  result={r}
                  selected={selectedVideo?.id === r.id}
                  onSelect={() => setSelectedVideo(r)}
                  onPreview={() => setPreview(r)}
                />
              ))}
            </Stack>
          )}
        </Card>

        <Card className="glass-card" p="md" style={{ minHeight: 0, overflow: 'hidden' }}>
          <Text fw={600} mb="sm">
            Options de téléchargement
          </Text>
          <DownloadConfigForm playlists={playlists} selectedVideo={selectedVideo} />
        </Card>
      </SimpleGrid>

      <VideoPreviewModal result={preview} onClose={() => setPreview(null)} />
    </Stack>
  )
}

const searchResultShape = PropTypes.shape({
  id: PropTypes.string,
  title: PropTypes.string,
  channel: PropTypes.string,
  author: PropTypes.objectOf,
  thumbnails: PropTypes.arrayOf,
  duration: PropTypes.string,
  url: PropTypes.string
})

SearchResultItem.propTypes = {
  result: searchResultShape.isRequired,
  selected: PropTypes.bool,
  onSelect: PropTypes.func.isRequired,
  onPreview: PropTypes.func.isRequired
}

function SearchResultItem({ result, selected, onSelect, onPreview }) {
  return (
    <Card
      withBorder
      padding="sm"
      radius="md"
      onClick={onSelect}
      style={{
        cursor: 'pointer',
        backgroundColor: selected ? 'rgba(120, 160, 240, 0.20)' : 'rgba(48, 74, 130, 0.18)',
        borderColor: selected ? 'rgba(120, 160, 240, 0.45)' : 'rgba(120, 160, 240, 0.18)'
      }}
    >
      <Group wrap="nowrap" justify="space-between">
        <Group gap="sm" wrap="nowrap">
          <Image src={result?.thumbnails[0] ?? ''} className="yt-thumbnail" />
          <Stack gap={2} style={{ minWidth: 0 }}>
            <Text size="sm" fw={500} lineClamp={2}>
              {result.title}
            </Text>
            <Text size="xs" c="dimmed">
              {result.author.name} · {result.duration}
            </Text>
          </Stack>
        </Group>
        <Group gap={4}>
          <ActionIcon
            variant="light"
            color="pastelBlue"
            onClick={(e) => {
              e.stopPropagation()
              onPreview()
            }}
            title="Aperçu de la vidéo"
          >
            <IconEye size={16} />
          </ActionIcon>
        </Group>
      </Group>
    </Card>
  )
}

VideoPreviewModal.propTypes = {
  result: searchResultShape,
  onClose: PropTypes.func.isRequired
}

function VideoPreviewModal({ result, onClose }) {
  return (
    <Modal
      opened={result !== null}
      onClose={onClose}
      title={result?.title ?? 'Aperçu'}
      size="lg"
      centered
    >
      <Stack>
        <Text size="sm" c="dimmed">
          {result?.author.name} · {result?.duration}
        </Text>
        <Box
          style={{
            aspectRatio: '16 / 9',
            background:
              'linear-gradient(135deg, rgba(20, 38, 77, 0.85) 0%, rgba(28, 60, 114, 0.85) 100%)',
            borderRadius: 'var(--mantine-radius-md)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
          className="iframe"
        >
          <iframe
            src={result?.url}
            title="Lecteur vidéo YouTube"
            frameBorder="0"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; picture-in-picture; gyroscope; picture-in-picture; web-share"
            allowFullScreen
          ></iframe>
        </Box>
        <Text size="xs" c="dimmed">
          Lien :{' '}
          <a
            href={`https://youtube.com/watch?v=${result?.id}`}
            rel="noreferer noreferrer"
            target="_blank"
          >{`https://youtube.com/watch?v=${result?.id}`}</a>
        </Text>
      </Stack>
    </Modal>
  )
}
