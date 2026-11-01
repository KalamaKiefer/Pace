import { ReduceMotion } from 'react-native-reanimated';

const base = { mass: 1, reduceMotion: ReduceMotion.System } as const;

export const springs = {
  snappy: { ...base, damping: 18, stiffness: 280 },
  bouncy: { ...base, damping: 11, stiffness: 180 },
  gentle: { ...base, damping: 22, stiffness: 120 },
} as const;
