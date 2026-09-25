import { Divider, Group, Tabs, Text } from '@mantine/core'
import { IconSparkles } from '@tabler/icons-react'
import { Fragment } from 'react'

const NAV_ITEMS = [
  { value: 'accueil', label: 'Accueil' },
  { value: 'playlists', label: 'Playlists' },
  { value: 'telechargement', label: 'Téléchargement' },
  { value: 'animation', label: 'Animation' }
]

export default function AppNav() {
  return (
    <Group h="100%" px="md" wrap="nowrap" gap="sm">
      <Group gap={6} wrap="nowrap">
        <IconSparkles size={18} color="#8fb8ff" />
        <Text
          fw={700}
          fz="lg"
          variant="gradient"
          gradient={{ from: '#8fb8ff', to: '#b694f5', deg: 90 }}
        >
          LADS
        </Text>
      </Group>

      <Divider orientation="vertical" h={22} opacity={0.4} />

      <Group justify="center" wrap="nowrap" h="100%" style={{ flex: 1 }}>
        <Tabs.List
          styles={{
            root: { height: '100%' },
            tab: {
              paddingTop: 0,
              paddingBottom: 0,
              '&[data-active]': {
                backgroundColor: 'transparent',
                fontWeight: 600
              }
            }
          }}
        >
          {NAV_ITEMS.map((item, index) => (
            <Fragment key={item.value}>
              {index > 0 && <Divider orientation="vertical" h={14} mx={2} opacity={0.35} />}
              <Tabs.Tab value={item.value} fz="sm" fw={500}>
                {item.label}
              </Tabs.Tab>
            </Fragment>
          ))}
        </Tabs.List>
      </Group>
    </Group>
  )
}
