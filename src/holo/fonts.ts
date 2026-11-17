const base = import.meta.env.BASE_URL

/** Font files for troika (3D text). Troika needs .woff/.ttf, not .woff2. */
export const fonts = {
  hudLight: `${base}fonts/rajdhani-latin-300-normal.woff`,
  hud: `${base}fonts/rajdhani-latin-500-normal.woff`,
  hudBold: `${base}fonts/rajdhani-latin-600-normal.woff`,
  mono: `${base}fonts/jetbrains-mono-latin-400-normal.woff`,
  monoLight: `${base}fonts/jetbrains-mono-latin-300-normal.woff`,
}
