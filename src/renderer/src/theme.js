import { createTheme } from '@mantine/core'

export const pastelBlue = [
  '#eaf2ff',
  '#d6e6ff',
  '#b3d0ff',
  '#8fb8ff',
  '#6f9ff5',
  '#5a86e6',
  '#4a72d6',
  '#3a5cb8',
  '#2c4790',
  '#1c3268'
]

export const softSky = [
  '#e8fbff',
  '#c9f3ff',
  '#9ae7ff',
  '#66d8f2',
  '#3fc4e0',
  '#29a8c8',
  '#2290b0',
  '#1f7590',
  '#1a5a72',
  '#123e52'
]

export const lavenderMist = [
  '#f3eeff',
  '#e6dcff',
  '#cfbaff',
  '#b694f5',
  '#9d72e0',
  '#8557cc',
  '#6f44b8',
  '#5a3790',
  '#422a68',
  '#2d1c45'
]

export const rosePetal = [
  '#fff0f3',
  '#ffd9e1',
  '#ffb3c1',
  '#ff859a',
  '#f56b82',
  '#e0526a',
  '#c03d54',
  '#9a2f43',
  '#722433',
  '#4a1822'
]

export const theme = createTheme({
  primaryColor: 'pastelBlue',
  colors: { pastelBlue, softSky, lavenderMist, rosePetal },
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
    },
    Card: {
      defaultProps: {
        shadow: 'none',
        radius: 'lg',
        padding: 'md',
        withBorder: false
      }
    },
    Badge: {
      defaultProps: {
        variant: 'light',
        radius: 'sm'
      }
    }
  }
})
