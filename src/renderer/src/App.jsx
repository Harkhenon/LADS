import { AppShell, Burger, Tabs } from '@mantine/core'
import { useDisclosure } from '@mantine/hooks'
import Accueil from './components/Accueil'

function App() {
  const [opened, { toggle }] = useDisclosure()

  return (
    <AppShell w={'100%'} header={{ height: 60 }} footer={{ height: 60 }}>
      <AppShell.Header>
        <Burger opened={opened} onClick={toggle} hiddenFrom="sm" size="sm" />

        <div>Logo</div>
      </AppShell.Header>

      <AppShell.Main>
        <Tabs defaultValue="accueil" orientation="vertical" inverted>
          <Tabs.List style={{ height: 'calc(100vh - 120px)' }}>
            <Tabs.Tab value="accueil">Accueil</Tabs.Tab>
            <Tabs.Tab value="telechargements">Téléchargements</Tabs.Tab>
            <Tabs.Tab value="playlists">Playlists</Tabs.Tab>
          </Tabs.List>
          <Tabs.Panel value="accueil">
            <Accueil />
          </Tabs.Panel>
          <Tabs.Panel value="telechargements">Messages tab content</Tabs.Panel>
          <Tabs.Panel value="playlists">Settings tab content</Tabs.Panel>
        </Tabs>
      </AppShell.Main>
      <AppShell.Footer>Produced with ♥️ by Harkhenon</AppShell.Footer>
    </AppShell>
  )
}

export default App
