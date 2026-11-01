// Mapped 1:1 from the Pace design system (design/tokens.json). A test keeps them in step.
// Components read these through the Unistyles theme. Never retype a hex value in a component.

export const colors = {
  bgBase: '#0A0E1A',
  bgSurface: '#121829',
  bgRaised: '#1A2238',
  bgOverlay: 'rgba(5,8,16,0.72)',
  borderSubtle: '#2A3558',
  borderStrong: '#5E6B99',
  textPrimary: '#F2F5FF',
  textSecondary: '#A7B1D0',
  textTertiary: '#7E89AE',
  textOnAccent: '#0A0E1A',
  accentWeight: '#9D8CFF',
  accentWeightDeep: '#6A5CFF',
  accentFood: '#3DF5A7',
  accentFoodDeep: '#14C98A',
  accentTrain: '#FF6B8A',
  accentTrainDeep: '#FF3D6E',
  accentSteps: '#2DD4F0',
  accentStepsDeep: '#3B82F6',
  accentReward: '#FFC24B',
  accentRewardDeep: '#FF8A3D',
  macroProtein: '#FF7AC6',
  macroCarbs: '#FFD866',
  macroFat: '#7CC4FF',
  statusAhead: '#3DF5A7',
  statusOnPace: '#9D8CFF',
  statusBehind: '#FFB547',
  statusDanger: '#FF5468',
  ringTrack: 'rgba(255,255,255,0.07)',
  chartGrid: 'rgba(255,255,255,0.06)',
} as const;

// Keys match the numeric suffix of the design system's space-* tokens.
export const space = {
  '0.5': 2,
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  8: 32,
  10: 40,
  14: 56,
} as const;

export const radius = {
  xs: 6,
  sm: 10,
  md: 14,
  lg: 20,
  xl: 28,
  pill: 999,
} as const;

// React Native picks a face by family name, so each weight maps to its own loaded Inter file.
export const fontFamily = {
  400: 'Inter_400Regular',
  500: 'Inter_500Medium',
  600: 'Inter_600SemiBold',
  700: 'Inter_700Bold',
  800: 'Inter_800ExtraBold',
} as const;

export const type = {
  displayXl: {
    fontFamily: fontFamily[800],
    fontSize: 56,
    lineHeight: 60,
    letterSpacing: -1.5,
    fontVariant: ['tabular-nums'],
  },
  displayL: {
    fontFamily: fontFamily[700],
    fontSize: 40,
    lineHeight: 44,
    letterSpacing: -1,
    fontVariant: ['tabular-nums'],
  },
  titleL: { fontFamily: fontFamily[700], fontSize: 28, lineHeight: 34, letterSpacing: -0.5 },
  titleM: { fontFamily: fontFamily[600], fontSize: 22, lineHeight: 28 },
  titleS: { fontFamily: fontFamily[600], fontSize: 18, lineHeight: 24 },
  bodyL: { fontFamily: fontFamily[400], fontSize: 17, lineHeight: 24 },
  bodyM: { fontFamily: fontFamily[400], fontSize: 15, lineHeight: 22 },
  labelM: { fontFamily: fontFamily[600], fontSize: 13, lineHeight: 18, letterSpacing: 0.4 },
  caption: { fontFamily: fontFamily[500], fontSize: 12, lineHeight: 16 },
  micro: { fontFamily: fontFamily[600], fontSize: 11, lineHeight: 14 },
} as const;

export const glow = {
  weight: { shadowColor: colors.accentWeight, shadowOpacity: 0.35, shadowRadius: 18 },
  food: { shadowColor: colors.accentFood, shadowOpacity: 0.35, shadowRadius: 18 },
  train: { shadowColor: colors.accentTrain, shadowOpacity: 0.35, shadowRadius: 18 },
  steps: { shadowColor: colors.accentSteps, shadowOpacity: 0.35, shadowRadius: 18 },
  reward: { shadowColor: colors.accentReward, shadowOpacity: 0.45, shadowRadius: 24 },
} as const;

export const highlightTop = 'rgba(255,255,255,0.05)';

export const night = { colors, space, radius, type, glow, highlightTop } as const;

export type AppTheme = typeof night;
