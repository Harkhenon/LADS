import { Button, Container, Paper, Text } from '@mantine/core'

function Accueil() {
  const { name, version, author, description, homepage } = window.base.appInfos()

  return (
    <Container>
      <h1>Bienvenue sur LADS !</h1>
      <h2>Logiciel de création de playlist et de téléchargements Youtube spécial Mamans !</h2>
      <p>La version actuelle du logiciel est la {version}</p>
      <Button>Vérifier les mises à jour</Button>
      <Paper shadow="sm" p="xl" withBorder style={{ margin: '50px' }}>
        <Text>
          {name} - {description}
        </Text>
        <Text>v{version}</Text>
        <Text>
          By {author} -{' '}
          <a target="blank" href={homepage}>
            Website
          </a>
        </Text>
      </Paper>
    </Container>
  )
}

export default Accueil
