import { AppShell, Container, Tabs } from '@mantine/core'
import { useState, useEffect } from 'react'
import AccueilPage from './components/AccueilPage'
import AnimationPage from './components/AnimationPage'
import AppNav from './components/AppNav'
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
          <AppNav />
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
