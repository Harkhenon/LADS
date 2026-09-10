import { Button, Group, Modal, Stack, TextInput, Textarea } from '@mantine/core'
import { useEffect } from 'react'
import { useForm } from '@mantine/form'
import PropTypes from 'prop-types'

PlaylistFormModal.propTypes = {
  opened: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  initialValues: PropTypes.shape({
    name: PropTypes.string,
    description: PropTypes.string
  }),
  onSubmit: PropTypes.func.isRequired
}

export default function PlaylistFormModal({ opened, onClose, initialValues, onSubmit }) {
  const form = useForm({
    initialValues: {
      name: '',
      description: ''
    },
    validate: {
      name: (value) => (value.trim().length > 0 ? null : 'Le nom est obligatoire')
    }
  })

  useEffect(() => {
    if (opened) {
      form.setValues(initialValues || { name: '', description: '' })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [opened, initialValues])

  const handleSubmit = (values) => {
    onSubmit(values)
    form.reset()
  }

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={initialValues ? 'Modifier la playlist' : 'Nouvelle playlist'}
      centered
    >
      <form onSubmit={form.onSubmit(handleSubmit)}>
        <Stack>
          <TextInput
            label="Nom de la playlist"
            placeholder="Ex : Anniversaire Mamie"
            withAsterisk
            {...form.getInputProps('name')}
          />
          <Textarea
            label="Description"
            placeholder="Une petite description (optionnelle)"
            autosize
            minRows={2}
            {...form.getInputProps('description')}
          />
          <Group justify="flex-end">
            <Button variant="default" onClick={onClose}>
              Annuler
            </Button>
            <Button type="submit">{initialValues ? 'Enregistrer' : 'Ajouter'}</Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  )
}
