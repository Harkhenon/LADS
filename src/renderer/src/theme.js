import { createTheme } from '@mantine/core'

export const pastelBlue = [
  '#f1f5ff',
  '#e0e9ff',
  '#c5d6ff',
  '#a6bcff',
  '#87a0f0',
  '#6e87e0',
  '#5a72cf',
  '#495da8',
  '#3a4a84',
  '#2c3866'
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
