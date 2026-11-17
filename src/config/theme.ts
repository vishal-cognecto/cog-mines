/**
 * Visual tokens. Brand blues come from the Cognecto palette.
 * Cyan/white are hologram accents. Amber/red are reserved for alerts only.
 */
export const theme = {
  brand: {
    primaryFrom: '#1F60C0',
    primaryTo: '#0D4493',
    mid: '#114A9D',
  },
  holo: {
    blue: '#2f7dff',
    cyan: '#5fe6ff',
    ice: '#cfefff',
    white: '#ffffff',
    dim: '#2a4f8f',
    grid: '#123a78',
  },
  alert: {
    amber: '#ffb347',
    red: '#ff4d5e',
  },
  ok: '#5fffc0',
  background: '#02060f',
  /** Multiplier above 1.0 pushes a colour into the bloom range. */
  glow: {
    low: 1.2,
    mid: 2.2,
    high: 4.0,
  },
} as const

export type Theme = typeof theme
