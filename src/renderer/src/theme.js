import { createTheme } from '@mantine/core'

export const pastelBlue = [
  '#e7f0ff',
  '#d0e1ff',
  '#a8c2ff',
  '#7aa3f5',
  '#5a87e0',
  '#436dd0',
  '#3658b8',
  '#2c4790',
  '#233668',
  '#182540'
]

export const theme = createTheme({
  primaryColor: 'pastelBlue',
  colors: { pastelBlue },
  defaultRadius: 'md',
  fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
  headings: {
    fontWeight: '600'
  },
  components: {
    Button: {
      defaultProps: {
        size: 'sm'
      }
    },
    Tabs: {
      defaultProps: {
        radius: 'md'
      }
    }
  }
})
