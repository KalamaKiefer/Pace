# Pace

Pace is a weight-loss app that answers one question every day: *am I on pace?* The look is **Night Run**: deep ink-navy surfaces, crisp near-white type, and four vivid pillar colors that glow softly, like city lights on an evening run. It's dark-mode first. Glow always means progress, so it's used only on rings, the trend line, and active states.

## Content fundamentals

- **Pace over pounds.** Lead with the trend and the pace status, never a single raw weigh-in. "226.8 lb trend · Ahead 2.8 days", not "You weighed 225.7 today".
- **Encouraging, never shaming.** Over target is amber with "One day doesn't move your trend." Never red, never "failed".
- **Concrete next steps.** Nudges say what to do: "4,200 steps to go — a 40-minute walk gets you there."
- **Numbers carry units and are estimates.** "~42 min", "≈ 38 kcal per 1,000 steps". Never "guaranteed".
- **Short.** One line per nudge, one action per nudge.
- **Voice:** a calm coach. Plain words, sentence case, no exclamation marks except in celebrations.

## Visual foundations

**Color.** Backgrounds step up in lightness: `bg-base` → `bg-surface` (cards) → `bg-raised` (inputs, chips). Each pillar owns one accent, and nothing else uses it:

| Pillar | Token | Where |
|---|---|---|
| Weight / pace | `accent-weight` | trend line, journey bar, pace |
| Nutrition | `accent-food` | calorie ring, Log buttons, completed sets |
| Training | `accent-train` | workout ring, Start workout |
| Steps | `accent-steps` | step ring, step charts |
| Rewards | `accent-reward` | streaks, achievements, PRs only |

Macros have their own trio: `macro-protein`, `macro-carbs`, `macro-fat`. Rings and fills use a two-stop gradient from the accent to its `-deep` partner. Text on a filled accent is always `text-on-accent`.

**Status is never color alone.** Every status pairs its color with an icon and a word: ▲ AHEAD (`status-ahead`), ● ON PACE (`status-on-pace`), ▼ BEHIND (`status-behind`). `status-danger` is for errors and destructive actions only, never for food or weight.

**Contrast.** All text tokens and accents pass WCAG AA (≥ 4.5:1) on `bg-surface` and `bg-raised`. `border-subtle` is decorative; control boundaries use `border-strong` (3.4:1).

**Type.** Inter only. Display styles use heavy weights with tight tracking. Every number uses tabular numerals (`font-variant-numeric: tabular-nums`) so counters don't jitter while animating.

**Shape.** Cards use `radius-lg` (20), buttons and inputs `radius-md` (14), chips and badges `radius-pill`. Cards have no drop shadow: they sit on `bg-surface` with the `highlight-top` inset. Use `glow-*` only on progress elements.

**Layout.** A 4-pt scale. Screens have `space-5` (20) side padding, cards `space-4` (16) padding, and `space-3` (12) between cards. Touch targets are at least 44 pt (48 for set checkmarks). Phone frames are 390 × 844.

**Charts.** Horizontal dashed gridlines only (`chart-grid`, 4 ticks). Trend line 3 px in `accent-weight` with `glow-weight`. Raw weigh-ins are 4 px dots in `text-primary` at 40% opacity. The target pace line is 1.5 px dashed (6/6) in `text-tertiary`. Area fills fade from the accent at 28% to 0%.

## Motion

Motion explains a change of state. Numbers always tween, nothing snaps. Celebrations scale with the moment. Respect Reduce Motion: springs become 150 ms fades and confetti is skipped.

| Spring | damping / stiffness / mass | Use |
|---|---|---|
| `snappy` | 18 / 280 / 1 | presses, toggles, tab indicator |
| `bouncy` | 11 / 180 / 1 | badges, PR chips, streak +1 |
| `gentle` | 22 / 120 / 1 | cards, sheets, ring settle |

Timing uses the `dur-*` and `ease-*` tokens. Key moments:
- **Ring fill:** 0 → value over `dur-slow` with `ease-decelerate`. The end-cap dot flares at 100%.
- **Number count-up:** 300–900 ms, scaled to the size of the change.
- **Chart draw-in:** the path draws over 600 ms and the area fades in after.
- **Achievement unlock:** the badge drops in with `bouncy` and flips over `dur-reveal`, then confetti and a success haptic.

## Iconography

Lucide icons: 1.75 px stroke, 20 pt inline and 24 pt in navigation. Active tabs use the filled variant. No emoji in the UI. Achievement badges are hexagonal medallions in four tiers (bronze `#D08A5B`, silver `#C9D1E6`, gold `accent-reward`, platinum `text-primary` with `accent-reward` rays), with a pillar glyph in the center.

## Components

ProgressRing, PaceBadge, Button, MacroBar, NudgeCard and SetRow are documented with live previews below. The full component list (JourneyBar, StatTile, StreakFlame, NumberRuler, AchievementBadge, ChartCard…) is in the Pace product plan, Section 7.5.

## Building it in React Native

Map tokens 1:1 into `src/ui/theme/tokens.ts` (Unistyles theme). Don't retype hex values in components. Draw rings, glow and charts with Skia and Victory Native XL, and use Reanimated 4 for motion.
