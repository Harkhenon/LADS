import { Card, Checkbox, Group, Select, Stack, Title, Tooltip } from '@mantine/core'
import { IconPlaylist } from '@tabler/icons-react'
import { useMemo, useState } from 'react'
import PropTypes from 'prop-types'
import AnimationStage from './animation/AnimationStage'

const playlistShape = PropTypes.shape({
  id: PropTypes.string.isRequired,
  name: PropTypes.string.isRequired,
  karaoke: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      title: PropTypes.string.isRequired,
      duration: PropTypes.string,
      format: PropTypes.string,
      filePath: PropTypes.string
    })
  ).isRequired
})

AnimationPage.propTypes = {
  playlists: PropTypes.arrayOf(playlistShape).isRequired
}

export default function AnimationPage({ playlists }) {
  const items = useMemo(() => playlists ?? [], [playlists])

  const [playlistId, setPlaylistId] = useState(items[0]?.id ?? '')
  const [trackId, setTrackId] = useState('')
  const [isPlaying, setIsPlaying] = useState(false)
  const [autoAdvance, setAutoAdvance] = useState(true)

  const playlist = useMemo(
    () => items.find((p) => p.id === playlistId) ?? null,
    [items, playlistId]
  )
  const tracks = playlist?.karaoke ?? []
  const currentIndex = tracks.findIndex((t) => t.id === trackId)
  const currentTrack = currentIndex >= 0 ? tracks[currentIndex] : null

  const handlePlaylistChange = (id) => {
    setPlaylistId(id)
    setTrackId('')
    setIsPlaying(false)
  }

  const handleTrackChange = (id) => {
    setTrackId(id)
    if (isPlaying && id !== trackId) {
      setIsPlaying(true)
    }
  }

  const goToTrack = (id, keepPlaying = true) => {
    setTrackId(id)
    if (keepPlaying) {
      setIsPlaying(true)
    }
  }

  const handlePlay = () => {
    if (!currentTrack && tracks.length > 0) {
      goToTrack(tracks[0].id)
      return
    }
    if (currentTrack) {
      setIsPlaying(true)
    }
  }

  const handlePause = () => {
    setIsPlaying(false)
  }

  const handleStop = () => {
    setIsPlaying(false)
    setTrackId('')
  }

  const handleNext = () => {
    if (tracks.length === 0) {
      return
    }
    const nextIndex = currentIndex < 0 ? 0 : (currentIndex + 1) % tracks.length
    goToTrack(tracks[nextIndex].id, isPlaying)
  }

  const handlePrevious = () => {
    if (tracks.length === 0) {
      return
    }
    const prevIndex = currentIndex < 0 ? 0 : (currentIndex - 1 + tracks.length) % tracks.length
    goToTrack(tracks[prevIndex].id, isPlaying)
  }

  const handleEnded = () => {
    if (!autoAdvance) {
      setIsPlaying(false)
      return
    }
    if (tracks.length > 0) {
      goToTrack(tracks[(currentIndex + 1) % tracks.length].id, true)
    } else {
      setIsPlaying(false)
    }
  }

  return (
    <Stack gap="md" h="100%">
      <Group justify="space-between">
        <Title order={3}>Animation</Title>
      </Group>
      <Card className="glass-card" p="md" radius="md">
        <Stack gap="md">
          <Select
            label="Playlist à animer"
            placeholder="Choisir une playlist"
            leftSection={<IconPlaylist size={16} />}
            value={playlistId}
            onChange={handlePlaylistChange}
            data={items.map((p) => ({ value: p.id, label: p.name }))}
            searchable
          />
          <Select
            label="Sélection rapide d'une chanson"
            placeholder={
              tracks.length === 0 ? 'Aucune chanson dans la playlist' : 'Choisir une chanson'
            }
            value={trackId}
            onChange={handleTrackChange}
            data={tracks.map((t, i) => ({
              value: t.id,
              label: `${i + 1}. ${t.title}${t.duration ? ` (${t.duration})` : ''}`
            }))}
            disabled={tracks.length === 0}
            searchable
          />
          <Group justify="flex-end">
            <Tooltip
              label="Passer automatiquement à la chanson suivante à la fin de chaque chanson"
              position="top"
              withArrow
            >
              <Checkbox
                label="Lecture automatique"
                checked={autoAdvance}
                onChange={(e) => setAutoAdvance(e.currentTarget.checked)}
              />
            </Tooltip>
          </Group>
        </Stack>
      </Card>
      <Card className="glass-card" p="lg" radius="md" style={{ flex: 1, minHeight: 0 }}>
        <Stack gap="md" h="100%">
          <AnimationStage
            track={currentTrack}
            isPlaying={isPlaying}
            onPlay={handlePlay}
            onPause={handlePause}
            onStop={handleStop}
            onNext={handleNext}
            onPrevious={handlePrevious}
            onEnded={handleEnded}
          />
        </Stack>
      </Card>
    </Stack>
  )
}
