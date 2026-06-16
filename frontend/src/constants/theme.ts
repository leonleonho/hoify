/** Theme tokens — matches dark music player aesthetic */
export const colors = {
  background: '#121212',
  surface: '#1E1E1E',
  surfaceLight: '#282828',
  primary: '#1DB954',
  primaryDark: '#169C46',
  text: '#FFFFFF',
  textSecondary: '#B3B3B3',
  textMuted: '#727272',
  secondary: '#4A90D9',
  error: '#FF6B6B',
  border: '#333333',
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

export const typography = {
  h1: { fontSize: 32, fontWeight: '700' as const },
  h2: { fontSize: 24, fontWeight: '600' as const },
  h3: { fontSize: 18, fontWeight: '600' as const },
  body: { fontSize: 16, fontWeight: '400' as const },
  bodySmall: { fontSize: 14, fontWeight: '400' as const },
  caption: { fontSize: 12, fontWeight: '400' as const },
} as const;
