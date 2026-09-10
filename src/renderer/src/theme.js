import { createTheme } from '@mantine/core'

export const pastelBlue = {
  0: '#f1f5ff',
  1: '#e0e9ff',
  2: '#c5d6ff',
  3: '#a6bcff',
  4: '#87a0f0',
  5: '#6e87e0',
  6: '#5a72cf',
  7: '#495da8',
  8: '#3a4a84',
  9: '#2c3866'
}

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
