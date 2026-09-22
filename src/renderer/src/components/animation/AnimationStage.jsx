import { ActionIcon, Box, Group, Slider, Stack, Text } from '@mantine/core'
import {
  IconMaximize,
  IconMusic,
  IconPlayerPause,
  IconPlayerPlay,
  IconPlayerSkipBack,
  IconPlayerSkipForward,
  IconPlayerStop
} from '@tabler/icons-react'
import { useEffect, useRef, useState } from 'react'
import PropTypes from 'prop-types'
import { toMediaUrl } from '../../utils/mediaUrl'

const karaokeShape = PropTypes.shape({
  id: PropTypes.string.isRequired,
  title: PropTypes.string.isRequired,
  filePath: PropTypes.string,
  format: PropTypes.string
})

function formatTime(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) {
    return '--:--'
  }
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

AnimationStage.propTypes = {
  track: karaokeShape,
  isPlaying: PropTypes.bool.isRequired,
  onPlay: PropTypes.func.isRequired,
  onPause: PropTypes.func.isRequired,
  onStop: PropTypes.func.isRequired,
  onNext: PropTypes.func.isRequired,
  onPrevious: PropTypes.func.isRequired,
  onEnded: PropTypes.func.isRequired
}

export default function AnimationStage({
  track,
  isPlaying,
  onPlay,
  onPause,
  onStop,
  onNext,
  onPrevious,
  onEnded
}) {
  const videoRef = useRef(null)
  const stageRef = useRef(null)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [progress, setProgress] = useState(0)
  const [duration, setDuration] = useState(0)
  const [currentTime, setCurrentTime] = useState(0)

  const mediaUrl = track ? toMediaUrl(track.filePath) : null

  useEffect(() => {
    const video = videoRef.current
    if (!video || !mediaUrl) {
      return
    }
    if (isPlaying) {
      video.play().catch(() => {})
    } else {
      video.pause()
    }
  }, [isPlaying, mediaUrl])

  useEffect(() => {
    const handler = () => setIsFullscreen(document.fullscreenElement === stageRef.current)
    document.addEventListener('fullscreenchange', handler)
    return () => document.removeEventListener('fullscreenchange', handler)
  }, [])

  const handleFullscreen = () => {
    const el = stageRef.current
    if (!el) {
      return
    }
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {})
    } else {
      el.requestFullscreen().catch(() => {})
    }
  }

  const handleTimeUpdate = () => {
    const video = videoRef.current
    if (!video) {
      return
    }
    setCurrentTime(video.currentTime)
    setProgress(video.duration ? Math.round((video.currentTime / video.duration) * 1000) / 10 : 0)
  }

  const handleSeek = (value) => {
    const video = videoRef.current
    if (!video || !video.duration) {
      return
    }
    video.currentTime = (value / 100) * video.duration
    setProgress(value)
  }

  return (
    <Box
      ref={stageRef}
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
        padding: 16,
        overflow: 'hidden'
      }}
    >
      <ActionIcon
        variant="light"
        color="pastelBlue"
        size="md"
        title={isFullscreen ? 'Quitter le plein écran' : 'Plein écran'}
        aria-label={isFullscreen ? 'Quitter le plein écran' : 'Plein écran'}
        onClick={handleFullscreen}
        style={{ position: 'absolute', top: 8, right: 8, zIndex: 2 }}
      >
        <IconMaximize size={18} />
      </ActionIcon>

      <Box
        style={{
          flex: 1,
          width: '100%',
          minHeight: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        {mediaUrl ? (
          <video
            ref={videoRef}
            src={mediaUrl}
            onTimeUpdate={handleTimeUpdate}
            onLoadedMetadata={(e) => {
              setProgress(0)
              setCurrentTime(0)
              setDuration(e.currentTarget.duration)
            }}
            onEnded={onEnded}
            onError={() => {}}
            style={{
              maxWidth: '100%',
              maxHeight: '100%',
              width: track?.format === 'mp3' ? 'auto' : '100%',
              height: 'auto',
              objectFit: 'contain'
            }}
          />
        ) : (
          <Stack gap="xs" align="center">
            <IconMusic size={48} color="var(--mantine-color-dimmed)" />
            <Text c="dimmed" ta="center">
              Sélectionnez une chanson à lire
            </Text>
          </Stack>
        )}
      </Box>

      {mediaUrl && (
        <Stack gap={4} style={{ width: '100%', marginTop: 12 }}>
          <Group justify="space-between" gap="xs">
            <Text size="xs" c="dimmed">
              {formatTime(currentTime)}
            </Text>
            <Text size="xs" c="dimmed">
              {formatTime(duration)}
            </Text>
          </Group>
          <Slider
            value={progress}
            onChange={handleSeek}
            color="pastelBlue"
            size="sm"
            label={(value) => formatTime((value / 100) * duration)}
            labelTransitionProps={{ transition: 'skew-down', duration: 150 }}
          />
        </Stack>
      )}

      <Group justify="center" gap="xs" style={{ marginTop: 16 }}>
        <ActionIcon variant="light" size="lg" onClick={onPrevious}>
          <IconPlayerSkipBack size={20} />
        </ActionIcon>
        {isPlaying ? (
          <ActionIcon variant="filled" size="lg" color="pastelBlue" onClick={onPause}>
            <IconPlayerPause size={20} />
          </ActionIcon>
        ) : (
          <ActionIcon variant="filled" size="lg" color="pastelBlue" onClick={onPlay}>
            <IconPlayerPlay size={20} />
          </ActionIcon>
        )}
        <ActionIcon variant="light" size="lg" color="red" onClick={onStop} disabled={!isPlaying}>
          <IconPlayerStop size={20} />
        </ActionIcon>
        <ActionIcon variant="light" size="lg" onClick={onNext}>
          <IconPlayerSkipForward size={20} />
        </ActionIcon>
      </Group>
    </Box>
  )
}
