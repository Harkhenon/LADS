import {
  Alert,
  Box,
  Button,
  Group,
  LoadingOverlay,
  Stack,
  Text,
  ThemeIcon,
  Title
} from '@mantine/core'
import { IconCheck, IconLoader2, IconRefresh, IconX } from '@tabler/icons-react'
import PropTypes from 'prop-types'

const STEP_LABELS = {
  binary: 'Moteur yt-dlp',
  runtime: 'Moteur JavaScript (Deno/Node)',
  ffmpeg: 'ffmpeg (vidéos haute définition)'
}

ToolsInstallOverlay.propTypes = {
  visible: PropTypes.bool,
  tools: PropTypes.objectOf(
    PropTypes.shape({ state: PropTypes.oneOf(['pending', 'busy', 'ready', 'error']) })
  ),
  error: PropTypes.string,
  onRetry: PropTypes.func,
  zIndex: PropTypes.number
}

function StepIcon({ state }) {
  if (state === 'ready') {
    return (
      <ThemeIcon variant="light" color="teal" size="sm" radius="xl">
        <IconCheck size={12} />
      </ThemeIcon>
    )
  }
  if (state === 'busy') {
    return (
      <ThemeIcon variant="light" color="pastelBlue" size="sm" radius="xl">
        <IconLoader2 size={12} spin />
      </ThemeIcon>
    )
  }
  if (state === 'error') {
    return (
      <ThemeIcon variant="light" color="red" size="sm" radius="xl">
        <IconX size={12} />
      </ThemeIcon>
    )
  }
  return (
    <ThemeIcon variant="light" color="gray" size="sm" radius="xl">
      <IconLoader2 size={12} style={{ opacity: 0.3 }} />
    </ThemeIcon>
  )
}

StepIcon.propTypes = {
  state: PropTypes.oneOf(['pending', 'busy', 'ready', 'error']).isRequired
}

export default function ToolsInstallOverlay({ visible, tools, error, onRetry, zIndex = 1000 }) {
  if (!visible) {
    return null
  }

  return (
    <Box pos="absolute" inset={0} style={{ zIndex }}>
      <LoadingOverlay
        visible
        zIndex={zIndex}
        overlayProps={{ blur: 2, radius: 'md' }}
        loader={false}
      />
      <Stack
        gap="xs"
        align="center"
        justify="center"
        pos="absolute"
        inset={0}
        style={{ zIndex: zIndex + 1, pointerEvents: 'all' }}
        p="lg"
      >
        <Title order={4} mb="xs">
          Installation des outils de téléchargement…
        </Title>
        <Text size="sm" c="dimmed" ta="center" mb="md">
          Cette opération n&rsquo;a lieu qu&rsquo;une seule fois, à la première utilisation.
        </Text>
        <Stack gap={6}>
          {Object.entries(STEP_LABELS).map(([key, label]) => (
            <Group key={key} gap="xs" wrap="nowrap" justify="flex-start" style={{ minWidth: 260 }}>
              <StepIcon state={tools?.[key]?.state ?? 'pending'} />
              <Text size="sm" c={tools?.[key]?.state === 'ready' ? 'teal' : 'dimmed'}>
                {label}
              </Text>
            </Group>
          ))}
        </Stack>
        {error && (
          <Alert color="red" variant="light" mt="md" style={{ maxWidth: 420 }}>
            {error}
          </Alert>
        )}
        {error && onRetry && (
          <Button
            variant="light"
            color="pastelBlue"
            leftSection={<IconRefresh size={14} />}
            onClick={onRetry}
            mt="sm"
          >
            Réessayer
          </Button>
        )}
      </Stack>
    </Box>
  )
}
