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
    <Tabs value={activeTab} onChange={setActiveTab}>
      <AppShell w="100vw" h="100vh" header={{ height: 56 }} padding="md">
        <AppShell.Header withBorder>
          <Tabs.List grow h="100%" style={{ flex: 1 }}>
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
        </AppShell.Header>

        <AppShell.Main>
          <Container fluid p={0} h="100%">
            <Tabs.Panel value="accueil" h="100%">
              <AccueilPage onNavigate={setActiveTab} />
            </Tabs.Panel>

            <Tabs.Panel value="playlists" h="100%">
              <PlaylistsPage playlists={playlists} setPlaylists={setPlaylists} />
            </Tabs.Panel>

            <Tabs.Panel value="telechargement" h="100%">
              <TelechargementPage playlists={playlists} setPlaylists={setPlaylists} />
            </Tabs.Panel>

            <Tabs.Panel value="animation" h="100%">
              <AnimationPage playlists={playlists} />
            </Tabs.Panel>
          </Container>
        </AppShell.Main>
      </AppShell>
    </Tabs>
  )
}

export default App
