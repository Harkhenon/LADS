import { Alert, AppShell, Center, Container, Loader, Tabs } from '@mantine/core'
import { notifications } from '@mantine/notifications'
import { useState, useEffect, useRef } from 'react'
import AccueilPage from './components/AccueilPage'
import AnimationPage from './components/AnimationPage'
import AppNav from './components/AppNav'
import PlaylistsPage from './components/PlaylistsPage'
import TelechargementPage from './components/TelechargementPage'

function notifySaveError() {
  notifications.show({
    title: 'Sauvegarde impossible',
    message: 'Les playlists n’ont pas pu être enregistrées sur le disque.',
    color: 'red',
    autoClose: false
  })
}

function App() {
  const [activeTab, setActiveTab] = useState('accueil')
  const [playlists, setPlaylists] = useState(null)
  const [loadError, setLoadError] = useState(null)
  const savedPlaylistsRef = useRef(null)

  useEffect(() => {
    let cancelled = false
    window.playlists
      .read()
      .then((loaded) => {
        if (!cancelled) {
          savedPlaylistsRef.current = loaded
          setPlaylists(loaded)
        }
      })
      .catch((error) => {
        if (!cancelled) {
          setLoadError(String(error?.message ?? error))
        }
      })
    return () => {
      cancelled = true
    }
  }, [])

  // Point unique de sauvegarde : toute modification de l'état est écrite sur le disque.
  useEffect(() => {
    if (playlists === null || playlists === savedPlaylistsRef.current) {
      return
    }
    savedPlaylistsRef.current = playlists
    window.playlists
      .update(playlists)
      .then((result) => {
        if (result?.state !== 1) {
          notifySaveError()
        }
      })
      .catch(notifySaveError)
  }, [playlists])

  if (loadError) {
    return (
      <Center h="100vh" p="md">
        <Alert color="red" title="Impossible de charger les playlists">
          {loadError}
        </Alert>
      </Center>
    )
  }

  if (playlists === null) {
    return (
      <Center h="100vh">
        <Loader />
      </Center>
    )
  }

  return (
    // display-none : avec le mode par défaut, un onglet masqué perdrait ses abonnements
    // et la fin d'un téléchargement passerait inaperçue.
    <Tabs value={activeTab} onChange={setActiveTab} keepMountedMode="display-none">
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
              <TelechargementPage
                playlists={playlists}
                setPlaylists={setPlaylists}
                active={activeTab === 'telechargement'}
              />
            </Tabs.Panel>

            <Tabs.Panel value="animation" h="100%">
              <AnimationPage playlists={playlists} active={activeTab === 'animation'} />
            </Tabs.Panel>
          </Container>
        </AppShell.Main>
      </AppShell>
    </Tabs>
  )
}

export default App
