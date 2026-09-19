import { AppShell, Container, Tabs } from '@mantine/core'
import { IconHome, IconPlaylist, IconDownload, IconDeviceSpeaker } from '@tabler/icons-react'
import { useState, useEffect } from 'react'
import AccueilPage from './components/AccueilPage'
import AnimationPage from './components/AnimationPage'
import PlaylistsPage from './components/PlaylistsPage'
import TelechargementPage from './components/TelechargementPage'

function App() {
  const [activeTab, setActiveTab] = useState('accueil')
  const [playlists, setPlaylists] = useState(null)

  useEffect(() => {
    if (playlists === null) {
      ;(async () => setPlaylists(await window.playlists.read()))()
    }
  }, [])

  return (
    <AppShell w="100vw" h="100vh" padding="md" layout="alt">
      <AppShell.Main>
        <Container fluid h="100%" p={0}>
          <Tabs
            value={activeTab}
            onChange={setActiveTab}
            orientation="vertical"
            h="100%"
            styles={{
              root: { height: '100%' },
              list: {
                width: 220,
                height: '100%',
                alignItems: 'stretch'
              }
            }}
          >
            <Tabs.List>
              <Tabs.Tab value="accueil" leftSection={<IconHome size={18} />}>
                Accueil
              </Tabs.Tab>
              <Tabs.Tab value="playlists" leftSection={<IconPlaylist size={18} />}>
                Playlists
              </Tabs.Tab>
              <Tabs.Tab value="telechargement" leftSection={<IconDownload size={18} />}>
                Téléchargement
              </Tabs.Tab>
              <Tabs.Tab value="animation" leftSection={<IconDeviceSpeaker size={18} />}>
                Animation
              </Tabs.Tab>
            </Tabs.List>

            <Tabs.Panel value="accueil" h="100%" style={{ minHeight: 0, paddingLeft: 16 }}>
              <AccueilPage onNavigate={setActiveTab} />
            </Tabs.Panel>

            <Tabs.Panel value="playlists" h="100%" style={{ minHeight: 0, paddingLeft: 16 }}>
              <PlaylistsPage playlists={playlists} setPlaylists={setPlaylists} />
            </Tabs.Panel>

            <Tabs.Panel value="telechargement" h="100%" style={{ minHeight: 0, paddingLeft: 16 }}>
              <TelechargementPage playlists={playlists} />
            </Tabs.Panel>

            <Tabs.Panel value="animation" h="100%" style={{ minHeight: 0, paddingLeft: 16 }}>
              <AnimationPage playlists={playlists} />
            </Tabs.Panel>
          </Tabs>
        </Container>
      </AppShell.Main>
    </AppShell>
  )
}

export default App
