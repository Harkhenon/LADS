import { ActionIcon, Box, Card, Group, Select, Stack, Text, Title } from '@mantine/core'
import {
  IconDeviceSpeaker,
  IconMaximize,
  IconPlayerPause,
  IconPlayerPlay,
  IconPlayerSkipBack,
  IconPlayerSkipForward,
  IconPlayerStop,
  IconPlaylist
} from '@tabler/icons-react'
import { useMemo, useRef, useState } from 'react'
import PropTypes from 'prop-types'
import {
  testNextTrack,
  testPauseAnimation,
  testPlayAnimation,
  testPreviousTrack,
  testStopAnimation
} from '../data/testFunctions'

const playlistShape = PropTypes.shape({
  id: PropTypes.string.isRequired,
  name: PropTypes.string.isRequired,
  karaoke: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      title: PropTypes.string.isRequired,
      duration: PropTypes.string,
      format: PropTypes.string
    })
  ).isRequired
})

AnimationPage.propTypes = {
  playlists: PropTypes.arrayOf(playlistShape).isRequired
}

export default function AnimationPage({ playlists }) {
  const [playlistId, setPlaylistId] = useState(playlists[0]?.id ?? '')
  const [trackId, setTrackId] = useState('')
  const [isPlaying, setIsPlaying] = useState(false)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const stageRef = useRef(null)

  const playlist = useMemo(
    () => playlists.find((p) => p.id === playlistId) ?? null,
    [playlists, playlistId]
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
  }

  const handlePlay = () => {
    if (!currentTrack) {
      const first = tracks[0]
      if (first) {
        setTrackId(first.id)
        testPlayAnimation(playlistId, first.id)
        setIsPlaying(true)
      }
      return
    }
    testPlayAnimation(playlistId, currentTrack.id)
    setIsPlaying(true)
  }

  const handlePause = () => {
    testPauseAnimation()
    setIsPlaying(false)
  }

  const handleStop = () => {
    testStopAnimation()
    setIsPlaying(false)
  }

  const handleNext = () => {
    if (tracks.length === 0) return
    const nextIndex = currentIndex < 0 ? 0 : (currentIndex + 1) % tracks.length
    const next = tracks[nextIndex]
    setTrackId(next.id)
    testNextTrack(playlistId, next.id)
    if (isPlaying) testPlayAnimation(playlistId, next.id)
  }

  const handlePrevious = () => {
    if (tracks.length === 0) return
    const prevIndex = currentIndex < 0 ? 0 : (currentIndex - 1 + tracks.length) % tracks.length
    const prev = tracks[prevIndex]
    setTrackId(prev.id)
    testPreviousTrack(playlistId, prev.id)
    if (isPlaying) testPlayAnimation(playlistId, prev.id)
  }

  const handleFullscreen = () => {
    const el = stageRef.current
    if (!el) return
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {})
    } else {
      el.requestFullscreen().catch(() => {})
    }
  }

  const handleFullscreenChange = () => {
    setIsFullscreen(document.fullscreenElement === stageRef.current)
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
            data={playlists.map((p) => ({ value: p.id, label: p.name }))}
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
        </Stack>
      </Card>

      <Card className="glass-card" p="lg" radius="md" style={{ flex: 1, minHeight: 0 }}>
        <Stack gap="md" h="100%">
          <Box
            ref={stageRef}
            onFullscreenChange={handleFullscreenChange}
            style={{
              flex: 1,
              minHeight: 200,
              position: 'relative',
              borderRadius: 'var(--mantine-radius-md)',
              background:
                'linear-gradient(135deg, rgba(20, 38, 77, 0.82) 0%, rgba(28, 60, 114, 0.78) 50%, rgba(18, 44, 90, 0.85) 100%)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 16
            }}
          >
            <ActionIcon
              variant="light"
              color="pastelBlue"
              size="md"
              title={isFullscreen ? 'Quitter le plein écran' : 'Plein écran'}
              aria-label={isFullscreen ? 'Quitter le plein écran' : 'Plein écran'}
              onClick={handleFullscreen}
              style={{
                position: 'absolute',
                top: 8,
                right: 8,
                zIndex: 2
              }}
            >
              <IconMaximize size={18} />
            </ActionIcon>

            <Box
              style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              {currentTrack ? (
                <Stack gap="xs" align="center">
                  <IconDeviceSpeaker size={48} color="var(--mantine-pastelBlue-4)" />
                  <Text c="white" fw={600} ta="center" px="md">
                    {currentTrack.title}
                  </Text>
                  <Text c="dimmed" size="sm">
                    {isPlaying ? 'Lecture en cours…' : 'En pause'}
                  </Text>
                </Stack>
              ) : (
                <Stack gap="xs" align="center">
                  <IconDeviceSpeaker size={48} color="var(--mantine-color-dimmed)" />
                  <Text c="dimmed">
                    {tracks.length === 0
                      ? 'Sélectionnez une playlist avec des chansons'
                      : 'Sélectionnez une chanson à lire'}
                  </Text>
                </Stack>
              )}
            </Box>

            <Group justify="center" gap="xs" style={{ marginTop: 16 }}>
              <ActionIcon
                variant="light"
                size="lg"
                onClick={handlePrevious}
                disabled={tracks.length === 0}
              >
                <IconPlayerSkipBack size={20} />
              </ActionIcon>

              {isPlaying ? (
                <ActionIcon variant="filled" size="lg" color="pastelBlue" onClick={handlePause}>
                  <IconPlayerPause size={20} />
                </ActionIcon>
              ) : (
                <ActionIcon
                  variant="filled"
                  size="lg"
                  color="pastelBlue"
                  onClick={handlePlay}
                  disabled={tracks.length === 0}
                >
                  <IconPlayerPlay size={20} />
                </ActionIcon>
              )}

              <ActionIcon
                variant="light"
                size="lg"
                color="red"
                onClick={handleStop}
                disabled={!isPlaying}
              >
                <IconPlayerStop size={20} />
              </ActionIcon>

              <ActionIcon
                variant="light"
                size="lg"
                onClick={handleNext}
                disabled={tracks.length === 0}
              >
                <IconPlayerSkipForward size={20} />
              </ActionIcon>
            </Group>
          </Box>
        </Stack>
      </Card>
    </Stack>
  )
}
