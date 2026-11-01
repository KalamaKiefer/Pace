export const durations = {
  instant: 100,
  fast: 180,
  base: 280,
  slow: 500,
  reveal: 900,
} as const;

// Control points for Easing.bezier.
export const easings = {
  standard: [0.2, 0, 0, 1],
  decelerate: [0, 0, 0, 1],
  accelerate: [0.3, 0, 1, 1],
} as const;

export const STAGGER_MS = 40;
