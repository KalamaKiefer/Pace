# Pace — Product Design & Technical Plan

*Working title: "Pace" — because the core question the app answers every day is "am I on pace?" Check trademark/App Store name availability before committing.*

*Plan date: November 2026. Stack versions verified against Expo SDK 57 (React Native 0.86, React 19.2).*

---

## Revisions to the original plan (Nov 1, 2026)

These changes are already merged into the sections below.

| Change | What it means | Where |
|---|---|---|
| **Accounts in the MVP** | Sign-in is required. Progress is stored per user: one local database per account, synced to Supabase. No longer a v1 item. | 2, 3.8, 9, 10.8, 11, 12, 13, 14 |
| **Body measurements in the MVP** | Optional. Can be logged by themselves or together with a weigh-in, from the same sheet. No longer a v1 item. | 3.1, 3.9, 8.13, 9, 12 |
| **Cardio adds to the calorie target** | Logged cardio sessions raise that day's calorie target by their net burn, deduplicated against steps. This replaces "cardio isn't eaten back". | 3.3, 4.9, 5.1, 9, 14 |
| **Step surplus is shown, not added** | Going over the step goal shows the extra burn for the day. It never adds to the calorie goal. | 3.4, 4.9, 8.7 |
| **Design system is the visual source of truth** | Tokens and component specs come from the Pace design system (`design/`). Where it differs from Section 7, it wins: Inter only (no Inter Display), NudgeCard uses a tinted icon tile rather than a left accent bar, and the platinum badge is `text-primary` with `accent-reward` rays. | 7 |

---

## Contents

1. Product vision, personas, differentiators
2. Information architecture & navigation
3. Feature specs (Home, Food, Train, Steps, Gamification, Reminders, Accounts, Measurements) + edge cases
4. Calculation engine (formulas, worked examples, pace algorithm, cardio & step surplus)
5. Gamification system (streaks, records, achievements)
6. Notification catalog
7. Design system & motion system
8. Screen-by-screen UX specs
9. Data model / schema
10. Technical architecture
11. Recommended stack, justifications, costs
12. Roadmap (MVP → v1 → v2) + MVP task breakdown
13. Risks & compliance
14. Assumptions & open questions

---

## 1. Product vision

**One sentence:** The weight-loss app that tells you, every day, whether you're on pace — and makes every action that keeps you there (eating, lifting, walking, weighing in) feel like progress.

**Problem.** Serious dieters run 3–4 apps: Happy Scale for the trend, MyFitnessPal for food, Hevy/Strong for lifting, Apple Fitness for steps. None of them talk to each other, so nobody answers the real question: *given what I ate, how much I moved, and what the scale says — am I going to hit my goal date?*

**Core loop (daily):**
1. Weigh in (morning, 10 seconds) → trend updates → pace badge updates.
2. Log meals → rings fill → protein/calorie nudges if drifting.
3. Walk → step ring fills → at-risk nudge late in the day if behind.
4. Lift (on training days) → weekly workout ring ticks → PRs celebrate.
5. Every success extends a streak; milestones unlock achievements; Sunday brings a weekly recap.

**Design principles**
- **Pace over pounds.** The headline is never the raw scale number; it's the trend and whether you're ahead/on/behind.
- **Progress everywhere.** Every screen shows at least one filling ring, bar, or streak.
- **Reward consistency, not extremity.** Streaks reward being *in range*, never starving. (Section 13.)
- **Ten-second logging.** Any daily action is ≤ 3 taps from the home screen.
- **Calm by default, loud when earned.** Subtle micro-motion everywhere; confetti only for real milestones.

### Personas

| Persona | Profile | Needs | Success metric |
|---|---|---|---|
| **Marcus, "The Restarter"** (primary) | 34, 240 lb → 190 lb goal, desk job, has tried MFP twice and quit | Simple targets, proof it's working despite daily scale noise, motivation to not quit week 3 | Still logging at day 90 |
| **Dana, "The Optimizer"** | 29, 165 → 140 lb, lifts 3–4x/week, already tracks macros | Protein focus, lift log with PRs, adaptive TDEE, data depth | Hits goal date ±2 weeks |
| **Leo, "The Walker"** | 52, 210 → 180 lb, no gym, prefers walking | Step-driven plan, gentle reminders, no lifting pressure | Step goal ≥ 5 days/week |

### Differentiators

| Competitor | What they do well | What Pace does better |
|---|---|---|
| Happy Scale | Smoothed trend, goal projections, milestones | Same trend quality **plus** it knows *why* (intake, steps, workouts) and drives the daily behavior |
| MyFitnessPal | Huge food DB, barcode | Faster logging, targets tied to a dated goal, protein pacing by time of day, no ad clutter |
| Strong / Hevy | Excellent lift logging, PRs | Workouts count toward a weekly goal that sits next to nutrition and weight, with gamified consistency |
| MacroFactor | Adaptive TDEE, coaching | Adaptive TDEE **plus** steps baked into the target, plus gamification and lift tracking in one app |
| Apple Fitness | Rings, steps | Step goal is *calculated from your weight-loss plan*, with time-aware at-risk nudges |

---

## 2. Information architecture & navigation

### Tab bar (5 slots)

```
[ Home ]  [ Food ]  [ ＋ ]  [ Train ]  [ Steps ]
```

- **Home** — progress hub (default).
- **Food** — today's diary, rings, food search.
- **＋ (Quick Log)** — not a screen; opens a bottom sheet: *Weigh-in · Measurements · Log food · Quick-add calories · Start workout · Log cardio · Log water (v1)*.
- **Train** — weekly goal, start workout, log cardio, routines, history, exercise progress.
- **Steps** — live steps, goal, pace-through-the-day chart, history.
- **Profile / Trophy Room** — reached from the avatar in the Home header (not a tab; it's low-frequency).

### Route map (Expo Router, file-based)

```
src/app/
  _layout.tsx                    # providers, fonts, session + DB migrations gate
  (auth)/
    sign-in.tsx  sign-up.tsx  forgot-password.tsx
  (onboarding)/
    welcome.tsx  units.tsx  body.tsx  goal.tsx  rate.tsx
    activity.tsx  health-permission.tsx  notifications.tsx  reveal.tsx
  (tabs)/
    _layout.tsx                  # custom animated tab bar
    index.tsx                    # Home
    food/index.tsx               # Diary (date-paged)
    train/index.tsx
    steps/index.tsx
  weigh-in.tsx                   # formSheet, includes optional measurements
  measurements.tsx               # formSheet, measurements on their own
  quick-log.tsx                  # formSheet (the ＋)
  food/search.tsx                # full-screen modal
  food/scan.tsx                  # full-screen camera
  food/[foodId].tsx              # food detail + serving editor (formSheet)
  food/custom-food.tsx
  food/meal/[mealId].tsx         # saved meal (v1)
  train/workout/active.tsx       # active workout (full-screen, persists)
  train/workout/[id].tsx         # past workout detail
  train/cardio.tsx               # log cardio (formSheet)
  train/exercise/[id].tsx        # exercise history & charts
  train/routines/[id].tsx
  progress/weight.tsx            # full weight analytics, measurements charts
  progress/insights.tsx
  profile/index.tsx              # trophy room + settings entry
  profile/achievements.tsx
  profile/streaks.tsx
  profile/goal.tsx               # edit goal / rate / recalc
  profile/settings/*.tsx         # account, units, notifications, health, data, about
  recap/[weekId].tsx             # weekly recap story (full-screen)
  celebrate.tsx                  # transparent modal for achievement unlocks
```

**Presentation rules**
- Fast actions (weigh-in, measurements, serving edit, quick-add, log cardio) → native `formSheet` with detents (fast, native feel, swipe to dismiss).
- Focused tasks (search, scan, active workout) → full-screen modal.
- Active workout is **resumable**: a pill above the tab bar shows elapsed time and returns you to it.
- Celebrations → transparent modal over current screen so the moment feels "on top of" what you just did.

---

## 3. Feature specs

### 3.1 Home / Progress

**Layout (top → bottom)**
1. **Header:** greeting + date, avatar (→ Profile), streak flame chip (longest active streak, tap → Streaks).
2. **Pace Hero card:** big trend weight (e.g. `226.8 lb`), delta since start (`−3.2 lb`), and the **Pace badge**: `AHEAD · 2.8 days` / `ON PACE` / `BEHIND · 0.9 lb`. Under it: projected goal date vs planned date ("Goal: Jun 14 · planned Jun 18").
3. **Journey bar:** start → current → goal, with milestone ticks at every 5 lb and 25/50/75%. Fills on mount.
4. **Weight chart:** raw weigh-ins (small dots), trend line (thick, violet glow), target pace line (dashed). Range chips: 1W · 1M · 3M · 6M · 1Y · All. Scrub with a finger to read any day (haptic tick at each point).
5. **Today rings row:** 4 mini rings — Calories left, Protein, Steps, Workouts this week. Tap any → that tab.
6. **This week card:** weekly average weight, change vs last week, current rate (lb/wk, from the trend), best week.
7. **Stats grid (2×3):** Total lost · % to goal · Lowest trend weight · BMI (trend) · Days on journey · Weigh-in consistency %.
8. **Nudge card (contextual, max 1):** the highest-priority active CTA (see 6. Notifications) e.g. "62 g protein to go — 3 hours left".
9. **Recent achievements carousel** (last 3) → Trophy Room.

**Empty state (day 1):** Pace Hero shows "Your trend starts tomorrow" and a ghost chart drawing the planned pace line; CTA "Log tomorrow's weigh-in".

**Full Weight Analytics screen (`progress/weight`)**
- Larger chart with toggles: Raw / Trend / Weekly averages (bar) / Target line.
- Table of weekly averages (week, avg, change, rate).
- Milestones timeline (when you hit each 5 lb).
- Projection fan: optimistic/expected/pessimistic goal dates from best/avg/worst 4-week rates.
- Body measurements section (see 3.9): one chart per measurement with data, optionally overlaid on the weight trend. Hidden entirely until the first measurement is logged.

**Weigh-in sheet**
- Big numeric stepper preloaded with yesterday's trend value (rounded to 0.1). Drag horizontally on a ruler OR type.
- Optional: time (default now), note, "post-meal/after workout" flag (excluded from trend? no — flagged only; see edge cases).
- Optional, collapsed by default: **"Add measurements"** expands the measurement fields in the same sheet, so both save in one tap and share a timestamp (see 3.9).
- On save: trend animates to new value, pace badge cross-fades, haptic success; if a milestone is crossed → celebration.
- Writes weight to Apple Health if the user opted in (and reads weigh-ins from Health from smart scales).

### 3.2 Food / Meal tracking

**Diary screen**
- Date pager (swipe left/right between days; tap date to open calendar).
- **Rings header:** big calorie ring (remaining in center, counts up/down), three macro bars (Protein pink, Carbs sun, Fat sky) with `g / target g`. When cardio is logged, the ring's target includes it and a caption explains: "1,800 + 310 from cardio".
- **Meal sections:** Breakfast · Lunch · Dinner · Snacks (renameable, up to 6 slots in v1). Each shows kcal subtotal + "＋ Add".
- Each food row: name, serving, kcal, P/C/F mini text. Swipe left → delete; swipe right → copy to another meal/day; long-press → edit serving.
- Footer actions: "Copy yesterday", "Copy meal from…", "Quick add".
- **Day summary bar** at the bottom: "Ends at 1,780 / 1,800 · Protein 141/148 g" with "Complete day" button (marks day as fully logged — important for adaptive TDEE and streaks).

**Food search (full-screen)**
- Search field autofocused; tabs: **All · Recent · Frequent · My Foods · Meals (v1)**.
- Results merge: My Foods > recents/frequents matching query > bundled USDA generic foods (offline, instant) > Open Food Facts text search (online, debounced 350 ms).
- Barcode button (top-right) → camera scanner. Not found → "Create this food" with barcode pre-filled.
- Quick add: calories only, or calories + macros, with a name.

**Food detail / serving editor (formSheet)**
- Serving units list (from source: g, oz, cup, piece, package…), numeric amount with quick chips (½, 1, 1½, 2).
- Live macro preview with animated mini-rings showing *what this does to today* ("Leaves 420 kcal · 38 g protein to go").
- Meal slot picker; "Log" button (primary, mint).

**Custom foods & saved meals**
- Custom food: name, brand (opt), serving size + unit, kcal, P/C/F (required), fiber/sugar/sodium (opt), barcode (opt).
- Saved meals (v1): bundle of foods logged with one tap. Recipes (v1): ingredients + number of servings → per-serving macros.

**Targets**
- Daily calorie target and macro targets come from the calculation engine (Section 4). Users can override macros (grams or %) but the app shows the effect on pace.
- Optional per-day targets (v1): e.g. higher carbs on training days, same weekly total.

**Smart CTAs (in-app nudges; push versions in Section 6)**
| Trigger | Message example | Placement |
|---|---|---|
| ≥ 90% of calories used | "150 kcal left — a high-protein snack fits: Greek yogurt (100 kcal, 17 g)" | Diary header banner, Home nudge |
| Over target | "Over by 120 kcal. One day doesn't change your trend — tomorrow resets." | Banner (amber, never red-shaming) |
| Protein behind pace | Expected protein by now = target × fraction of eating window elapsed; if actual < 70% of expected after 2 pm → "You're 45 g behind on protein" + 3 suggested foods from your history with the best protein/kcal ratio | Home nudge, Diary |
| Under-eating | By 8 pm, logged < 60% of target, or day completed under floor → "You're well under target. Eating too little slows progress and costs muscle." | Diary banner |
| Nothing logged by lunch | "Log breakfast?" (only if user usually logs breakfast) | Push only |

### 3.3 Train / Exercise tracking

**Train tab**
- **Weekly goal ring:** "2 / 4 workouts" with day dots (M T W T F S S) lit on workout days. Goal set by user (1–7/week). Week start configurable (Mon default).
- **At-risk banner:** if `workoutsRemaining > daysRemaining` (impossible) → "Goal out of reach this week — 3 left, 2 days. Do what you can; streak freeze available." If `workoutsRemaining == daysRemaining` → "Need to train every remaining day to hit 4."
- **Start workout** (primary): Empty workout · From routine · Repeat last.
- **Log cardio** (secondary): opens the cardio sheet (below).
- **Routines:** user templates (e.g. Push A, Pull A, Legs A). Starter pack: Full-Body 3x, Upper/Lower 4x, PPL 6x.
- **History:** list grouped by week; each entry: name, duration, total volume or cardio burn, PR badges.
- **Volume chart:** weekly total volume (bar) and workouts per week (bar), 12-week view.

**Active workout screen**
- Header: workout name (editable), elapsed timer, "Finish".
- Exercise cards; each set row: `Set | Previous (e.g. 185×8) | lb | reps | RPE (opt) | ✓`.
- Tapping ✓: row fills mint, haptic light, **rest timer** auto-starts (default per exercise, 90 s; floating countdown pill with ±15 s). Timer end → haptic + local notification if backgrounded.
- Set types: warm-up, working, drop, failure. Supersets (link 2+ exercises).
- **PR detection on set completion:** heaviest weight for reps, best estimated 1RM (Epley), most reps at a weight, highest single-session volume for an exercise. PR → gold flash on the row + "PR" chip; full celebration on workout finish summary.
- Plate calculator (v1), notes per exercise.
- Finish → **Summary screen**: duration, volume, sets, PR list with animated badges, weekly ring tick animation ("3 / 4 this week!"), share card (v1).

**Cardio sessions**
- **Log cardio sheet:** activity (walk, run, cycle, row, elliptical, stair climber, swim, hike, HIIT, other), duration, intensity (easy / moderate / hard), optional distance. Shows the estimate live: "≈ 310 kcal added to today's target".
- The session's **net burn is added to that day's calorie target** (formula in 4.9), so eating it back keeps the planned deficit. Editing or deleting a session updates the target immediately.
- **No double counting with steps:** for on-foot activities (walk, run, hike) the step energy from that session is subtracted, since it already counts toward the step total (4.9).
- A cardio session of ≥ 10 minutes counts toward the weekly workout goal.
- Estimates are always labeled "estimated", and the user can edit the kcal on any session.

**Exercise library**
- ~200 seeded exercises (name, primary/secondary muscles, equipment, type: weight×reps / reps-only / time / distance). Custom exercises supported.
- Exercise detail: best set, est. 1RM chart over time, volume chart, history list.
- **No calorie estimates for lifting** (by design — avoids inflated "eat-back" calories). Only cardio sessions add to the food target.

**Counting rules**
- A workout counts toward the weekly goal if it has ≥ 1 completed set (or ≥ 10 min for time-based and cardio sessions).
- Max 1 counted workout per calendar day by default (toggle: "Count doubles").

### 3.4 Steps

**Steps tab**
- **Big step ring** with live count (count-up animation on open), goal, % complete.
- **Pace-through-the-day chart:** cumulative steps today (cyan area) vs "on-track" line (goal distributed over the user's active window, weighted by their typical hourly pattern from the last 28 days). Shows "You usually have 6,100 by now".
- **Status chip:** `On track` / `Slightly behind` / `At risk` (definitions in 4.6).
- **Needed:** "4,200 steps to go · ~42 min walk · 3 h left".
- **Extra burn (once over goal):** "+3,000 steps over goal ≈ 115 kcal extra burn today. Your calorie goal stays the same, so this speeds up your pace." The surplus is display-only and never added to the calorie target (4.9).
- **Why this goal:** expandable card explaining the plan: "For you, every 1,000 steps ≈ 38 kcal. Missing your goal by 3,000 steps ≈ 115 kcal ≈ 0.23 lb/week slower if it happens every day."
- **Week strip:** 7 bars colored by goal hit; weekly average; best day; current step streak.
- **History:** 4W / 3M / 1Y charts, monthly averages.

**Data source**
- iOS: Apple Health (`HKQuantityTypeIdentifierStepCount`) via statistics queries (summed per day, deduplicated across iPhone + Watch by HealthKit).
- Android (v2): Health Connect `Steps` records, aggregated.
- Fallback if permission denied: device pedometer (Expo Sensors) for today only + manual entry for past days.
- Steps are **read-only** from Health; manual edits are stored locally as an override with a "manual" badge.

### 3.5 Gamification & consistency

Full rules in Section 5. Product decisions:

| Mechanic | Include? | Why |
|---|---|---|
| Streaks (daily + weekly) | **MVP** | Proven retention driver; pairs naturally with daily logging |
| Personal records (consistency records + lift PRs) | **MVP** | "Longest ever" gives a reason to beat yourself |
| Achievements/badges | **MVP (~30)**, v1 (~60) | Milestone moments, especially weight milestones |
| Weekly recap story | **v1** | High delight; summarizes pace, records, next week's focus |
| Streak freezes | **v1** | Prevents the "broke my streak, quit the app" cliff. Earned (1 per 7-day streak), max 2 banked, auto-applied |
| Levels / XP | **Defer to v2, maybe never** | Risks rewarding logging volume over outcomes; adds noise. Revisit only with retention data |
| Social / leaderboards | **v2+ (opt-in friends only)** | Comparisons around body weight can be harmful; if added, compare consistency, never weight |

**Celebration tiers**
- **Tier 1 (micro):** ring completes, set checked → haptic light + 300 ms glow pulse.
- **Tier 2 (moment):** daily goal complete, streak +1, lift PR → haptic success + chip animation + small burst of 20 particles from the element.
- **Tier 3 (milestone):** achievement unlock, every 5 lb, goal-date milestones → full-screen transparent modal, badge flips in (3D Y-rotation), confetti (Skia, 120 particles), haptic pattern (success → 2× light at 120 ms), share button.

### 3.6 Reminders & notifications

All reminders are user-configurable (on/off + time), respect **quiet hours** (default 9:30 pm–7:30 am), and obey a **global cap of 3 non-scheduled nudges per day**, never more than 1 per category per day. Full catalog in Section 6.

### 3.7 Edge cases

| Case | Behavior |
|---|---|
| **Missed weigh-ins** | Trend uses time-aware smoothing (4.2) so gaps don't distort it. Chart interpolates the trend line across gaps but shows no raw dot. After 7 days without a weigh-in, Home shows "Trend paused — weigh in to update your pace" and the pace badge greys out. |
| **Multiple weigh-ins per day** | Use the **first** of the day by default (setting: first / last / average). Others are shown but not trended. |
| **Water-weight spikes** (≥ 2 lb jump vs trend) | Raw dot shown in amber with tooltip: "Likely water — salty meal, carbs, or training soreness. Your trend moved only +0.2 lb." Trend smoothing naturally absorbs it. No pace badge flip to "Behind" for a single spike (pace uses the trend). |
| **Whoosh drops** | Same treatment, mint color, "Nice drop — the trend will catch up over the next week." |
| **Plateau** | Trend change < 0.3 lb over 21 days while ≥ 80% of days are logged in-range → Insight card: "Plateau detected. Your measured TDEE looks ~150 kcal lower than estimated. Recalibrate?" (applies adaptive TDEE if off). Also suggest a +1,000 step goal bump as an alternative. If waist or hips are dropping during the plateau, say so: "Your waist is down 0.8 in, so progress is still happening." |
| **Goal change mid-journey** | Creates a new `goal_plan` version starting today; journey start weight is kept; pace line restarts from today's trend with the new rate (chart shows a small marker "New plan"). Old streaks are kept. |
| **Rate too aggressive** | Rate clamped to ≤ 1% of current body weight/week; calorie target never below the floor. If the requested rate can't be met within floor + max step goal, show the fastest safe rate and the step goal it needs (see example B in 4.8). |
| **Reached goal** | Big celebration + switch prompt: "Maintain at 185 lb?" → maintenance mode (target = TDEE, pace badge becomes "Within ±2 lb of goal" band). |
| **Unit switching (lb ↔ kg)** | All weights stored in **kg** (REAL, full precision); all lengths in **cm**; all energy in kcal. Display converts. Steps/plates round to the unit's conventions (lb: 0.1 display, plates 2.5/5/10/25/35/45; kg: 0.1 display, plates 1.25/2.5/5/10/15/20/25). Switching never mutates stored data. |
| **Time zones / travel** | Days are bucketed by the device's local date at time of logging; each log stores the UTC timestamp + local date string + tz offset. Changing zones never moves past logs. |
| **Late-night eating** | Day boundary configurable ("My day ends at 3 am") for food logging. |
| **Health permission denied/revoked** | Steps tab shows a permission card + manual entry; step goal still shown; notifications for steps disabled automatically. |
| **Incomplete food days** | Days not marked complete (or with < 800 kcal logged and not marked) are excluded from adaptive TDEE and don't count for or against nutrition streaks (they count as "no data", which *does* break a daily streak unless a freeze is used). |
| **Pregnancy / medical conditions / under 18** | Onboarding asks; if yes → app runs in "tracking only" mode with no deficit target and advises consulting a clinician. Under-18 → not supported (age gate). |
| **Cardio logged for a past day** | Adds to that day's target, re-evaluates that day's calories-in-range qualification, and rebuilds affected streaks. |
| **Implausible cardio** | Credit capped at 1,000 kcal per day. Above that, the sheet asks the user to confirm the duration. |
| **Offline at sign-in** | First sign-in on a device needs a connection. After that the app works fully offline and syncs when back online. |
| **Same account on a new device** | Sign-in pulls the user's data into a new local database, then skips onboarding. |
| **Two users on one device** | Each account has its own local database file. Signing out never exposes one user's data to another. |
| **Sync conflict** | Last write wins per row, by `updated_at`. Soft deletes sync as rows, so a deletion on one device reaches the others. |
| **Measurement without a weigh-in** | Allowed. Measurements don't affect the trend, pace, or targets. |

### 3.8 Accounts

- **Required.** Every user signs in, so progress is always stored per user and restores on a new device.
- **Methods:** email + password, and Sign in with Apple. Email verification, plus password reset by email.
- **Flow:** Welcome → create account or sign in → onboarding (new accounts only) → Home.
- **Local-first stays true.** The app reads and writes the local database. Sync runs in the background and never blocks logging.
- **Consent before upload:** the sign-up screen states plainly what is stored in the cloud (profile, goal, weigh-ins, measurements, food, workouts, cardio). Weights that came from Apple Health sync only if the user opts in; steps are never uploaded.
- **Account settings:** change email or password, sign out, export data, and **delete account** (removes server data and the local database, as App Store Guideline 5.1.1(v) requires).
- **Sign-out:** finishes pending sync, clears the session, returns to sign-in. Local data stays on the device for fast re-entry, with a "Remove my data from this device" option.

### 3.9 Body measurements (optional)

- **Measurements:** waist, hips, chest, arm, thigh, neck, body fat %. The user picks which ones they track, and none are required.
- **Two ways to log:** with a weigh-in ("Add measurements" in the weigh-in sheet saves both together) or alone (＋ → Measurements). Combined entries are linked, so history shows them together.
- **Where they show:** Weight Analytics gets a measurement section with per-measurement charts, change since start, and an optional overlay on the weight trend. Home shows a small "Waist −1.2 in" line in the This week card only when there's data.
- **Never required, never nagged.** Measurements don't affect pace, targets, or streaks. No achievements or streaks in MVP, and the optional reminder is off by default.
- **Units:** stored in cm; displayed in inches when the height unit is ft-in, otherwise cm. Body fat is a plain percentage.

---

## 4. Calculation engine

All math lives in one pure TypeScript package (`src/engine/`), no React, no I/O, 100% unit-tested. Internal units: **kg, cm, kcal, days**. Display conversion happens at the edge.

### 4.1 Inputs

| Input | Source | Notes |
|---|---|---|
| sex (for BMR formula) | onboarding | "Male / Female" formula choice; copy explains it's only used for the energy equation |
| age | birth date | recomputed on birthday |
| height | onboarding | |
| current weight | trend weight (or first weigh-in) | targets recompute from **trend**, never a single raw weigh-in |
| goal weight | onboarding | must imply BMI ≥ 18.5; otherwise blocked with explanation |
| rate | onboarding: lose 0.5 / 1 / 1.5 / 2 lb/wk (0.25/0.5/0.75/1 kg); maintain; gain 0.25/0.5 lb/wk | |
| baseline steps | 28-day average from Health (or self-reported bucket) | |
| weekly workout goal | onboarding | lifting doesn't affect calories (see 3.3) |
| cardio sessions | logged per day | add net burn to that day's target (see 4.9) |
| eating window | onboarding (default 7 am–8 pm) | used for protein pacing |
| active window | onboarding (default 7 am–9 pm) | used for step pacing |

### 4.2 Constants

```ts
export const KCAL_PER_LB = 3500;          // classic approximation; corrected over time by adaptive TDEE
export const KCAL_PER_KG = 7700;
export const SEDENTARY_FACTOR = 1.2;      // BMR × 1.2 = sedentary TDEE (no purposeful activity)
export const BASELINE_STEPS = 3000;       // incidental steps assumed inside the 1.2 factor
export const WALK_NET_KCAL_PER_KG_PER_KM = 0.5; // ACSM walking eq., net of resting cost
export const STRIDE_FACTOR = { male: 0.415, female: 0.413 }; // stride ≈ height × factor
export const CALORIE_FLOOR = { male: 1500, female: 1200 };
export const MAX_LOSS_PCT_PER_WEEK = 0.01; // ≤ 1% body weight / week
export const STEP_GOAL_MIN = 7000, STEP_GOAL_MAX = 12500, STEP_GOAL_STEP = 500;
export const TREND_ALPHA = 0.1;           // Hacker's Diet smoothing per day
export const PROTEIN_G_PER_LB_GOAL = 0.8; // user-adjustable 0.6–1.0
export const FAT_MIN_G_PER_LB_GOAL = 0.3, FAT_MIN_PCT = 0.25;
export const CARDIO_CREDIT_MAX_KCAL_PER_DAY = 1000;
```

### 4.3 Formulas

**BMR — Mifflin-St Jeor**
```
BMR = 10·kg + 6.25·cm − 5·age + s      where s = +5 (male), −161 (female)
```

**Base (sedentary) TDEE**
```
TDEE_base = BMR × 1.2
```

**Step energy (no double counting)** — the 1.2 factor already assumes a sedentary day (~3,000 incidental steps). Only steps *above* that baseline add energy:
```
stride_m      = height_cm/100 × STRIDE_FACTOR[sex]
kcal_per_step = 0.0005 × kg × stride_m        // 0.5 kcal/kg/km × km per step
step_kcal(n)  = max(0, n − 3000) × kcal_per_step
```
Activity-level multipliers above 1.2 (1.375, 1.55…) are **not used** — steps replace them. This is the key design decision: activity is measured, not guessed.

**Daily deficit (or surplus)**
```
rate_eff      = min(rate_requested, 0.01 × current_lb)     // loss only
daily_deficit = rate_eff × 3500 / 7                         // lb/wk → kcal/day
```

**Step goal (computed, user can override)**
```
step_goal = clamp(roundUp500(baselineSteps + 2000), 7000, 12500)
calorie_target(step_goal) = TDEE_base + step_kcal(step_goal) − daily_deficit
while calorie_target < floor and step_goal < 12500: step_goal += 500
if calorie_target still < floor: infeasible → offer fastest safe rate (solve rate from floor)
```
So the deficit is shared between food and movement, and steps raise the food budget — "walk more, eat more" is visible in the UI.

**Calorie target**: rounded to nearest 10 kcal. The base target is fixed for the day: it does **not** change live with steps, which avoids the "eat back your steps" trap. Steps shortfall/surplus is shown as its effect on pace instead. The only thing that raises a day's target is a logged cardio session (4.9).

**Macros**
```
protein_g = 0.8 × goal_lb                    (adjustable 0.6–1.0 g/lb)
fat_g     = max(0.3 × goal_lb, 0.25 × kcal / 9)
carbs_g   = (kcal − 4·protein_g − 9·fat_g) / 4      (min 50 g; if below, reduce fat toward its floor first)
fiber_g   = 14 g per 1,000 kcal (display target only)
```
Using **goal weight** for protein avoids absurd targets for people with a lot to lose. Cardio credit goes to carbs: protein and fat targets don't change.

**Recalculation triggers**: new trend weight moves ≥ 2 lb from the last calc weight · birthday · goal/rate change · baseline steps change ≥ 1,500 (28-day average) · user edits height/sex · weekly adaptive TDEE update (if enabled). Target changes are shown as a dismissible card ("New targets: 1,780 kcal (−20) because you've lost 4 lb — nice.").

### 4.4 Weight trend (EMA, time-aware)

```
trend_0 = first weigh-in
for each subsequent weigh-in w on day t (Δ = days since previous weigh-in):
    α_eff  = 1 − (1 − 0.1)^Δ          // irregular gaps handled correctly
    trend  = trend + α_eff × (w − trend)
```
Weekly average = mean of raw weigh-ins in the week (shown separately from trend). Rate of loss = linear regression slope of trend over the last 21 days (lb/wk) — less jumpy than week-over-week deltas.

### 4.5 Pace status algorithm

The naive comparison (trend vs straight target line) is biased: the EMA lags, so early in a journey everyone looks "behind". **Fix: pass the ideal pace line through the same EMA** and compare like with like.

```
ideal(d)       = start_trend − rate_eff/7 × d                 // d = days since plan start
ideal_trend(d) = EMA(ideal) using the same α and the same weigh-in days
delta_lb       = ideal_trend(today) − trend(today)            // + means ahead (lost more)
delta_days     = delta_lb / (rate_eff / 7)
tolerance      = max(0.5 lb, 0.25 × rate_eff)

status = delta_lb >  tolerance → AHEAD
         delta_lb < −tolerance → BEHIND
         otherwise             → ON PACE
```
Projected goal date = today + (trend − goal) / current_rate (21-day slope), capped at "2+ years" display. If current rate ≤ 0 → "Not trending down yet" (no date).

Gain mode flips signs; maintenance mode: ON PACE when |trend − goal| ≤ 2 lb (1 kg).

### 4.6 Step pacing (time-aware)

```
expected_by_now = goal × cumulativeShare(now)        // from user's 28-day hourly distribution,
                                                     // falls back to linear over active window
remaining       = goal − steps_now
hours_left      = active_window_end − now
needed_per_hour = remaining / hours_left
walk_minutes    = remaining / 100                    // ~100 steps/min brisk walk

status = steps_now ≥ expected_by_now                    → ON TRACK
         needed_per_hour ≤ 1.5 × typical_hourly_rate    → SLIGHTLY BEHIND
         otherwise                                      → AT RISK
```

### 4.7 Adaptive TDEE (optional, recommended after 2 weeks)

```
window      = last 14–28 days with ≥ 80% days marked complete (incomplete days excluded)
observed    = mean(intake) − mean(cardio_credit) − (Δtrend_lb × 3500 / days)
new_estimate= 0.8 × previous + 0.2 × observed        // weekly update, smoothed
clamp change to ±100 kcal per week; never let target drop below floor
```
Cardio credit is subtracted so that it isn't counted twice: once in the measured burn and again when added to each day's target. Displayed as "Your measured burn: 2,650 kcal/day (formula estimated 2,550)". The step component stays visible inside it ("of which steps ≈ 150").

### 4.8 Worked examples (computed by script, not by hand)

**Example A — Marcus (male, 32, 5′10″, 230 lb, goal 185 lb, 1.5 lb/wk, baseline 4,500 steps)**

| Step | Value |
|---|---|
| kg / cm | 104.3 kg / 177.8 cm |
| BMR | 10·104.3 + 6.25·177.8 − 5·32 + 5 = **2,000 kcal** |
| TDEE_base (×1.2) | **2,399 kcal** |
| Max rate (1% BW) | 2.3 lb/wk → 1.5 allowed |
| Daily deficit | 1.5 × 3500 / 7 = **750 kcal** |
| Stride / kcal per step | 0.738 m / 0.0385 kcal (≈ 38 kcal per 1,000 steps) |
| Step goal | roundUp500(4,500 + 2,000) = 6,500 → min 7,000 → **7,000** |
| Step kcal | (7,000 − 3,000) × 0.0385 = **154 kcal** |
| Calorie target | 2,399 + 154 − 750 = 1,803 → **1,800 kcal** (≥ 1,500 floor ✓) |
| Macros | Protein 0.8×185 = **148 g** · Fat max(56, 50) = **56 g** · Carbs (1,800 − 592 − 504)/4 = **176 g** |
| Projection | 45 lb ÷ 1.5 = **30 weeks** (targets recompute as weight drops) |

**Example B — Dana (female, 29, 5′4″, 165 lb, goal 140 lb, asks for 1.5 lb/wk, baseline 3,800 steps)**

| Step | Value |
|---|---|
| BMR / TDEE_base | 1,458 / 1,750 kcal |
| Deficit at 1.5 lb/wk | 750 kcal |
| Without extra steps | 1,750 − 750 = 1,000 → **below 1,200 floor** |
| Engine raises step goal | needs ≥ 200 kcal from steps at 0.0251 kcal/step → **11,000 steps** → target exactly **1,200 kcal** |
| App response | "1.5 lb/week needs 11,000 steps/day *and* 1,200 kcal — the floor. We recommend **1 lb/week**: 7,000 steps and **1,350 kcal** (P 112 / F 42 / C 131 g), goal in ~25 weeks." User may still choose 1.5 with a clear warning. |

**Example C — Pace badge (Marcus, 14 daily weigh-ins from 230.0 to 225.7)**

| Method | Expected | Trend | Result |
|---|---|---|---|
| Naive (trend vs straight line) | 227.2 | 228.1 | "Behind 3.9 days" ✗ (lag artifact) |
| Lag-matched (both EMA'd) | 228.7 | 228.1 | **"Ahead 2.8 days"** ✓ |

**Example D — Steps at risk:** 6 pm, 5,800 / 10,000, active window ends 9 pm → 4,200 left, 1,400/h needed, **~42 min walk**. Typical evening rate 600/h → 1,400 > 1.5 × 600 → **AT RISK** → push "4,200 steps to go — a 40-minute walk after dinner gets you there."

**Example E — Adaptive TDEE:** 14 complete days, mean intake 2,050 kcal, no cardio, trend −2.4 lb → observed TDEE = 2,050 + 2.4×3500/14 = **2,650 kcal**.

**Example F — Cardio on the bike (Marcus, 104.3 kg, 30 min moderate cycling, MET 7):** net = (7 − 1) × 104.3 × 0.5 = 313 kcal, no step overlap → credit **313**. Target 1,800 + 313 = 2,113 → **2,110 kcal**.

**Example G — Cardio on foot (Marcus, 30 min running, MET 9.8, ~4,500 steps during the run):** net = 8.8 × 104.3 × 0.5 = 459 kcal; step energy already counted = 4,500 × 0.0385 = 173 kcal → credit **286**. Target 1,800 + 286 = 2,086 → **2,090 kcal**.

**Example H — Step surplus (Marcus, 10,000 steps, goal 7,000):** extra burn = 3,000 × 0.0385 = **≈ 115 kcal**. The calorie target stays at **1,800**.

### 4.9 Cardio credit and step surplus

These two are deliberately different. Cardio is a discrete, intentional session the user chose to log, so it raises the food budget. Going over the step goal is extra credit toward pace, so it's reported but doesn't change the food budget.

**Cardio credit (added to the day's calorie target)**
```
net_kcal      = (MET − 1) × kg × hours            // subtracts resting burn, already in BMR
on_foot_steps = steps during the session          // walk, run, hike only; else 0
                                                  // from Health for that time range, or estimated
                                                  // from duration × typical cadence for the activity
step_overlap  = on_foot_steps × kcal_per_step
credit        = max(0, net_kcal − step_overlap)   // user may edit the session's kcal
day_credit    = min(sum(credit), 1000)            // CARDIO_CREDIT_MAX_KCAL_PER_DAY

effective_target(day) = round10(base_target + day_credit)
```
MET values live in a table keyed by activity and intensity (Compendium of Physical Activities). The credit goes to carbs in the macro split.

**Step surplus (display only)**
```
surplus_steps = max(0, steps − step_goal)
extra_burn    = surplus_steps × kcal_per_step     // shown on Steps tab and Home; never added to target
```
Copy: "+3,000 steps over goal ≈ 115 kcal extra burn today. Your calorie goal stays the same." Steps from an on-foot cardio session stay in `surplus_steps`: their energy was already taken out of the cardio credit, so each step is counted exactly once.

---

## 5. Gamification system

### 5.1 Day/week qualification rules (single source of truth)

| Rule | A day/week qualifies when… |
|---|---|
| **Calories in range** | Day marked complete AND `intake ≥ max(floor, 0.8×effective_target)` AND `intake ≤ effective_target + max(100, 5%)` — *under-eating does not count*. `effective_target` includes cardio credit (4.9). |
| **Protein hit** | protein ≥ 90% of target |
| **Logged day** | ≥ 2 meal slots logged or day marked complete |
| **Step goal hit** | steps ≥ step goal (Health or manual) |
| **Weigh-in day** | ≥ 1 weigh-in that day |
| **Workout week** | completed workouts (including qualifying cardio) in the week ≥ weekly goal |
| **On-pace week** | pace status at week end is ON PACE or AHEAD |
| **Perfect day** | calories in range + protein hit + step goal hit (+ workout if a planned training day) |

### 5.2 Streaks (current + longest, all tracked)

| Streak | Unit | Freeze-eligible |
|---|---|---|
| Logging streak | days | yes |
| Calories-in-range streak | days | yes |
| Protein streak | days | yes |
| Step-goal streak | days | yes |
| Weigh-in streak | days (or "weigh-in ≥ 4×/week" weekly variant, user choice) | yes |
| Workout-goal streak | weeks | yes (weekly freeze) |
| On-pace streak | weeks | no |
| Perfect-day streak | days | no (it's the hard mode) |

**Freezes (v1):** earn 1 freeze per 7 consecutive days on any daily streak (max 2 banked, shared). Auto-applied at day rollover to the streak that would break; user is told next morning ("Freeze used — your 23-day protein streak is safe"). Weekly streaks have their own freeze earned per 4 consecutive weeks.

**Records screen:** longest of each streak, best week (most lost), most steps in a day/week, most workouts in a month, total workouts, total volume lifted, heaviest lift per exercise, est. 1RM PRs.

### 5.3 Achievements (MVP set ≈ 32; v1 extends to ~60)

Each achievement: `id, title, description, tier (bronze/silver/gold/platinum), icon, rule, hidden?`. Rules evaluated after every relevant write (event-driven, see 10.4).

**Journey & time**
| ID | Title | Rule |
|---|---|---|
| `day_1` | First Step | Complete onboarding + first weigh-in |
| `days_7` / `30` / `90` / `180` / `365` | Week One / One Month In / Quarter Strong / Half-Year Hero / One Year Pace | Days since journey start with ≥ 70% logged days |

**Weight milestones**
| ID | Title | Rule |
|---|---|---|
| `lost_5` … `lost_100` (every 5 lb; bronze < 20, silver < 50, gold < 100, platinum 100) | Down 5 … Down 100 | Trend (not raw) crosses the threshold below start |
| `pct_25` / `50` / `75` / `100` | Quarter Way / Halfway / Final Stretch / Goal Reached | Trend progress to goal |
| `onedecade` | New Decade | Trend crosses a 10-lb boundary (e.g. 229.9 → "the 220s") |
| `bmi_class` | New Category | BMI (from trend) drops into a lower WHO category |

**On-timeline**
| ID | Title | Rule |
|---|---|---|
| `pace_4w` / `12w` | Locked In / Metronome | On-pace streak 4 / 12 weeks |
| `ahead_7d` | Ahead of Schedule | Delta ≥ 7 days ahead |
| `goal_on_time` | Right on Time | Goal reached within ±7 days of planned date |
| `goal_early` | Early Finish | Goal reached > 7 days early |
| `comeback` | Comeback | From BEHIND to ON PACE within 3 weeks |

**Nutrition**
| ID | Title | Rule |
|---|---|---|
| `log_first` | First Bite | First food logged |
| `inrange_7` / `30` / `100` | In the Zone / Dialed In / Machine | Calories-in-range streak |
| `protein_7` / `30` | Protein Pro / Protein Royalty | Protein streak |
| `scanner_25` | Barcode Boss | 25 barcode scans |
| `perfect_week` | Perfect Week | 7 perfect days in a calendar week |

**Training**
| ID | Title | Rule |
|---|---|---|
| `workout_1` / `25` / `100` / `250` | First Rep / Regular / Centurion / Iron Habit | Total workouts |
| `wk_goal_4` / `12` / `26` | Consistent / Committed / Unbreakable | Workout-goal streak (weeks) |
| `pr_first` / `pr_25` | First PR / PR Machine | Lift PRs |
| `volume_100k` | 100K Club | Lifetime volume ≥ 100,000 lb |

**Steps**
| ID | Title | Rule |
|---|---|---|
| `steps_goal_7` / `30` | On the Move / Wanderer | Step streak |
| `steps_20k` | Big Day | ≥ 20,000 steps in a day |
| `steps_1m` | Millionaire | 1,000,000 lifetime steps (since install) |
| `night_save` | Clutch Walk | Hit step goal after receiving an "at risk" alert |

**Hidden (surprise)**: `early_bird` (weigh-in before 6 am 10×), `weekend_warrior` (in-range every Sat+Sun for 4 weeks), `whoosh` (trend −1 lb in 3 days, celebrated gently).

**Unlock UX:** queue unlocks, max 1 full-screen celebration per session event; extras batch into a "You unlocked 3 achievements" stacked-card reveal.

### 5.4 Weekly recap (v1)
Sunday evening (user's week end) → push "Your week is ready". Full-screen story, 5–7 swipeable cards: Pace status + trend change · Weekly average vs last week · Nutrition (days in range, avg protein) · Steps (avg, best day, extra burn) · Training (workouts vs goal, cardio burn, PRs) · Streaks & unlocks · Next week focus (one suggestion, chosen by the weakest metric). Shareable card (no weight shown by default — % or "lb lost" toggle).

---

## 6. Notification catalog

All local notifications (no server needed). **Global rules:** quiet hours respected; max 3 *nudges* per day (scheduled reminders the user explicitly set don't count); 1 per category per day; any nudge auto-cancels if its condition is resolved before it fires; nudges are suppressed for 24 h after the user dismisses the same type twice in a row ("adaptive backoff"); all copy is encouraging, never shaming.

| ID | Category | Trigger / logic | Default timing | Example copy | Default |
|---|---|---|---|---|---|
| `weighin_reminder` | Reminder | No weigh-in today | 7:30 am | "Morning weigh-in? Takes 10 seconds ⚖️" | On |
| `measurement_reminder` | Reminder | No measurements in 14 days (only if the user has logged one before) | with the morning weigh-in reminder | "Two weeks since your last measurements. Add them to today's weigh-in?" | Off |
| `log_meal_reminder` | Reminder | Slot empty at user's usual time (learned from 14-day median, ±30 min) | per slot | "Log lunch while it's fresh" | On (lunch/dinner) |
| `calorie_near_limit` | Nudge | ≥ 90% of target logged before 6 pm | on log event | "150 kcal left today. Greek yogurt fits perfectly." | On |
| `calorie_over` | Nudge | Day complete > target + 10% | on complete | "A bit over today — your trend barely notices one day." | Off (in-app only) |
| `protein_behind` | Nudge | 3 pm & 6 pm check: protein < 70% of expected-by-now | 3 pm / 6 pm | "62 g protein to go — chicken, eggs or a shake?" | On |
| `under_eating` | Nudge | 8 pm: intake < 60% of target with day not complete | 8 pm | "You're well under target — make sure you eat enough today." | On |
| `steps_at_risk` | Nudge | Status AT RISK (4.6) at hourly checks 5–8 pm; fires once | first AT RISK check | "4,200 steps to go — ~40 min walk gets you there." | On |
| `steps_goal_hit` | Celebration | Crossed goal (via background check) | instant-ish | "Step goal smashed 🎉 Streak: 12 days" | On |
| `workout_at_risk` | Nudge | `remaining ≥ daysLeft` in week, checked 6 pm daily | 6 pm | "2 workouts left, 2 days left. Tomorrow's a great day to lift." | On |
| `workout_planned` | Reminder | User-scheduled training days | user time | "Push A today 💪" | Off |
| `rest_timer_done` | System | Rest timer ends while app backgrounded | timer | "Rest over — next set: Bench 185×8" | On |
| `streak_save` | Nudge | 8:30 pm: a daily streak ≥ 5 would break today | 8:30 pm | "Keep your 23-day logging streak — log dinner?" | On |
| `achievement` | Celebration | Unlock while app backgrounded | instant | "New badge: Halfway 🏅" | On |
| `weekly_recap` | Digest | End of week | Sun 7 pm | "Your week: Ahead 2 days. Tap to see your recap." | On (v1) |
| `plateau_insight` | Insight | Plateau detected | next morning | "Your trend's been flat 3 weeks. Want to recalibrate?" | On |
| `trend_paused` | Re-engage | 7 days no weigh-in | 9 am | "Your trend misses you — weigh in to update your pace." | On |
| `reengage_3d` | Re-engage | 3 days no app open | 6 pm | "Pick up where you left off — your streaks are waiting." (once, then weekly max) | On |

**Scheduling strategy (works within iOS limits):** iOS doesn't guarantee background execution, so we use **pre-scheduled conditional notifications**: each time the app foregrounds, a data write happens, or a background task runs, a scheduler recomputes the rest of today's nudges and *re-schedules or cancels* them (`expo-notifications` local triggers). Example: at 2 pm the user has 30 g protein → schedule `protein_behind` for 3 pm; at 2:40 they log a shake → it's cancelled. HealthKit background delivery for steps (plus `expo-background-task`) improves freshness for step alerts; the worst case is a nudge computed from data a few hours old, so step copy uses "about" numbers. iOS allows 64 pending local notifications — the scheduler only ever keeps the next 24 h queued (~10–15). Notification copy follows the design system's "no emoji in the UI" rule at implementation time unless you decide push copy is an exception.

---

## 7. Design system & motion system

**The Pace design system is the source of truth:** https://claude.ai/artifact/JMUqjqtManfKjSwphM91z8. A copy of its tokens and README lives in `design/`, and `src/ui/theme/tokens.ts` is tested against it. The spec below is the original plan's; where they differ, the design system wins (see Revisions).

**Direction: "Night Run."** Deep ink-navy backgrounds, crisp near-white type, and four vivid pillar accents that glow softly like city lights at night. Saturated, never muddy; glow is reserved for *progress* (rings, trend line, active states) so it always means something.

### 7.1 Color tokens (dark mode — the default and primary design target)

Contrast ratios computed against `bg.surface` (#121829) unless noted. WCAG AA: 4.5:1 text, 3:1 large text & UI components.

| Token | Hex | Use | Contrast |
|---|---|---|---|
| `bg.base` | `#0A0E1A` | App background | — |
| `bg.surface` | `#121829` | Cards | — |
| `bg.raised` | `#1A2238` | Inputs, sheets, pressed cards, tooltips | — |
| `bg.overlay` | `rgba(5,8,16,0.72)` | Modal scrim (+ blur 20) | — |
| `border.subtle` | `#2A3558` | Card hairlines, dividers (decorative only) | 1.5:1 (decorative) |
| `border.strong` | `#5E6B99` | Input borders, unselected chips | 3.4:1 ✓ |
| `text.primary` | `#F2F5FF` | Headlines, numbers, body | 16.2:1 ✓ |
| `text.secondary` | `#A7B1D0` | Labels, supporting text | 8.3:1 ✓ |
| `text.tertiary` | `#7E89AE` | Captions, axis labels, placeholders | 5.1:1 ✓ (4.6 on raised ✓) |
| `text.onAccent` | `#0A0E1A` | Text on accent-filled buttons/chips | 7.0–13.6:1 ✓ |

**Pillar accents**

| Token | Hex | Gradient (rings/fills) | Pillar | Contrast |
|---|---|---|---|---|
| `accent.weight` | `#9D8CFF` electric violet | `#9D8CFF → #6A5CFF` | Weight, trend, pace | 6.4:1 ✓ |
| `accent.food` | `#3DF5A7` neon mint | `#3DF5A7 → #14C98A` | Calories, nutrition | 12.5:1 ✓ |
| `accent.train` | `#FF6B8A` hot coral | `#FF6B8A → #FF3D6E` | Workouts, lifts | 6.5:1 ✓ |
| `accent.steps` | `#2DD4F0` cyan | `#2DD4F0 → #3B82F6` | Steps | 9.9:1 ✓ |
| `accent.reward` | `#FFC24B` gold | `#FFC24B → #FF8A3D` | Streaks, achievements, PRs | 11.0:1 ✓ |

**Macros:** `macro.protein #FF7AC6` (7.5:1) · `macro.carbs #FFD866` (12.9:1) · `macro.fat #7CC4FF` (9.4:1).

**Status:** `status.ahead #3DF5A7` · `status.onPace #9D8CFF` · `status.behind #FFB547` (10.1:1) · `status.danger #FF5468` (5.7:1, errors/destructive only). Over-target states use **amber, not red** — red reads as failure.

**Never color alone:** every status pairs color with an icon + word (▲ AHEAD, ● ON PACE, ▼ BEHIND) for color-blind users.

**Glow:** `shadowColor = accent`, opacity 0.35, radius 18 for active rings and hero chart line (Skia `BlurMask` on the line itself for charts). Cards: no drop shadows; separate by surface color + 1 px top highlight `rgba(255,255,255,0.05)`.

**Light mode (v1, secondary):** `bg.base #F6F7FB`, `surface #FFFFFF`, `text.primary #0E1220`; accents darkened ~20% for 4.5:1 on white (e.g. violet `#5B47E0`, mint `#0B9E6A`, coral `#E0315A`, cyan `#0786A8`, gold `#B87500`). Re-verify every pair with the contrast script.

### 7.2 Typography

Family: **Inter** (OFL). All numbers use `fontVariant: ['tabular-nums']` so counters don't jitter while animating.

| Token | Size / line | Weight | Use |
|---|---|---|---|
| `display.xl` | 56 / 60 | 800 | Hero trend weight |
| `display.l` | 40 / 44 | 700 | Ring center numbers |
| `title.l` | 28 / 34 | 700 | Screen titles |
| `title.m` | 22 / 28 | 600 | Card titles |
| `title.s` | 18 / 24 | 600 | Section headers |
| `body.l` | 17 / 24 | 400 | Primary body |
| `body.m` | 15 / 22 | 400 | Secondary body, list rows |
| `label.m` | 13 / 18 | 600, +0.4 tracking | Buttons, chips (UPPERCASE for status chips only) |
| `caption` | 12 / 16 | 500 | Axis labels, meta |
| `micro` | 11 / 14 | 600 | Badges, tab labels |

Dynamic Type: scale body/title tokens up to 1.35×; display tokens cap at 1.15× (they're already large). Layouts reflow (rings row wraps 2×2).

### 7.3 Spacing, radii, layout

- **Spacing (4-pt):** `2, 4, 8, 12, 16, 20, 24, 32, 40, 56`. Screen padding 20; card padding 16; gap between cards 12.
- **Radii:** `xs 6` (tags) · `sm 10` (inputs small) · `md 14` (buttons, inputs) · `lg 20` (cards) · `xl 28` (sheets top) · `pill 999`.
- **Touch targets:** ≥ 44×44 pt; set-row checkmarks 48×48.
- **Grid:** single column; stat grid 2 columns; tab bar 84 pt incl. safe area with a 64-pt center ＋ button raised 12 pt.

### 7.4 Iconography & illustration
- **Lucide** icons, 1.75 stroke, 20 pt (inline) / 24 pt (nav). Filled variants for active tab.
- **Achievement badges:** custom SVG set, hexagonal medallion, 4 tiers (bronze `#D08A5B`, silver `#C9D1E6`, gold `#FFC24B`, platinum `text-primary` with `accent-reward` rays), pillar glyph in center. Locked = 30% opacity silhouette with lock.
- **Empty-state illustrations:** simple line art in `text.tertiary` with one accent stroke.

### 7.5 Component library (key specs)

| Component | Spec |
|---|---|
| **ProgressRing** (Skia) | Sizes 200 (hero) / 120 / 56 (mini). Stroke 16 / 12 / 6. Track `rgba(255,255,255,0.07)`. Gradient sweep + round caps + glowing end-cap dot. Overflow (>100%) draws a second lap in `status.behind`. Center: value (display.l) + label (caption). Accessible label: "Calories, 1,320 of 1,800, 480 remaining". |
| **PaceBadge** | Pill, 32 h, icon + label + delta. Background = status color @ 16% opacity, text = status color. Cross-fades between states. |
| **JourneyBar** | 10 h track, gradient fill, milestone ticks (4×4 dots), current-position knob with glow. Start/goal labels below. |
| **ChartCard** | Title + range chips + chart (Victory Native XL) + footer stats. Grid: horizontal only, dashed `rgba(255,255,255,0.06)`, 4 ticks. Trend line 3 px + glow; raw points 4 px `text.primary` @ 40%; target line 1.5 px dashed 6/6 `text.tertiary`; area fill accent 28% → 0%. Scrub: vertical cursor line + tooltip pill (`bg.raised`). |
| **MacroBar** | 8 h rounded bar, label left, `g / target` right, overflow tick. |
| **StatTile** | Surface card, caption label, title.m value, optional sparkline (40 h). |
| **StreakFlame** | Animated Skia flame (3 layered paths, noise-driven), number inside. Color shifts with length: 1–6 orange, 7–29 gold, 30–99 coral-magenta, 100+ violet "blue flame". |
| **SetRow** | 56 h; columns `Set · Previous · Weight · Reps · ✓`. Completed: mint 12% fill sweep left→right. PR: gold chip plus a gold flash. |
| **Buttons** | Primary: accent fill (contextual pillar color), `text.onAccent`, 52 h, radius 14, press scale 0.97 + haptic light. Secondary: `bg.raised` + `text.primary`. Ghost: text only. Destructive: `status.danger` text on raised. Disabled: 40% opacity. |
| **Inputs** | 56 h, `bg.raised`, `border.strong` 1 px, focus = 2 px accent ring + label floats. Numeric inputs open a custom keypad sheet with ± steppers. |
| **NumberRuler** | Horizontal snapping ruler (0.1 increments), haptic selection tick per step, big value above. Used for weigh-in. |
| **Sheet** | Native formSheet, `bg.surface`, top radius 28, grabber, detents [0.5, 0.9]. |
| **Toast** | Top, `bg.raised`, icon + text, 3 s, swipe up to dismiss, undo action for deletes. |
| **Chip / Segmented** | 32 h pills; selected = accent 16% bg + accent text; segmented thumb slides with spring. |
| **NudgeCard** | Surface card, 36 pt icon tile tinted with the pillar color at 16%, one-line message, one compact pill action, dismiss ×. |
| **Skeleton** | `bg.raised` blocks with a shimmer (1.2 s, 20° gradient) — used only > 300 ms loads. |

### 7.6 Motion system

**Principles**
1. *Motion explains state change* (a ring fills because you ate; it doesn't spin for fun).
2. *Fast in, gentle settle* — springs for anything touch-driven, timing curves for data reveals.
3. *Numbers always tween* — no value ever just snaps.
4. *Celebrate proportionally* — tiers (3.5); never block input longer than 1.2 s.
5. *Respect Reduce Motion* — Reanimated `ReduceMotion.System`: springs → 150 ms fades, no confetti/particles, draw-ins become fades; haptics stay (separately toggleable).

**Tokens**

| Token | Value |
|---|---|
| `dur.instant` | 100 ms (press feedback) |
| `dur.fast` | 180 ms (chips, toggles, fades) |
| `dur.base` | 280 ms (sheets content, card enter) |
| `dur.slow` | 500 ms (chart draw-in, ring fill on mount) |
| `dur.reveal` | 900 ms (onboarding reveal, hero count-up) |
| `ease.standard` | `cubic-bezier(0.2, 0, 0, 1)` |
| `ease.decelerate` | `cubic-bezier(0, 0, 0, 1)` (enter) |
| `ease.accelerate` | `cubic-bezier(0.3, 0, 1, 1)` (exit) |
| `spring.snappy` | `{ damping: 18, stiffness: 280, mass: 1 }` — presses, toggles, tab indicator |
| `spring.bouncy` | `{ damping: 11, stiffness: 180, mass: 1 }` — badges, PR chips, streak +1 |
| `spring.gentle` | `{ damping: 22, stiffness: 120, mass: 1 }` — cards, sheets, ring settle |
| `stagger` | 40 ms between list items (max 8 items staggered, rest appear together) |

**Signature animations**

| Animation | Spec |
|---|---|
| **Ring fill** | On mount: 0 → value over `dur.slow`, `ease.decelerate`. On log: from old → new with `spring.gentle`; end-cap dot flares (scale 1 → 1.6 → 1, 300 ms). At 100%: full ring glow pulse ×2 + haptic success. |
| **Number count-up** | Tween displayed integer on UI thread (`useDerivedValue` + `ReText`/Skia text), duration scales with the size of the change: `clamp(300 + 150·log10(Δ+1), 300, 900)` ms, `ease.standard`. |
| **Chart draw-in** | Line path `end` 0 → 1 over 600 ms; area fades in 200 ms after; points pop in staggered 15 ms. Range change: morph paths (Skia path interpolation) 400 ms. |
| **Pace badge change** | Old badge slides up + fades (180 ms), new slides in from below with `spring.snappy`; if moving to AHEAD, a single mint sparkle. |
| **Streak flame** | Idle: continuous 2.4 s noise loop. +1: flame scales 1 → 1.35 → 1 (`spring.bouncy`), number flips (3D X-rotation 280 ms), 12 ember particles rise. |
| **Achievement unlock** | Scrim fades 200 ms → badge drops in from scale 0.4 with `spring.bouncy` + Y-rotation 540° over 900 ms → tier-colored light rays rotate slowly behind → title/description fade-up staggered 60 ms → confetti burst (120 Skia particles, gravity 900 px/s², 1.6 s lifetime). Haptic: success, then 2 light taps at 120 ms. |
| **Set completion** | Row fill sweeps L→R 220 ms, checkmark draws (stroke-end 0→1, 200 ms), rest pill slides up from bottom. |
| **Tab transitions** | Custom tab bar: active indicator slides with `spring.snappy`; icon morphs outline→filled with scale 0.9→1. Screen content cross-fade 180 ms (no horizontal slide between tabs). |
| **＋ button** | Press: rotates 45° into ×, sheet rises; action icons stagger in (40 ms). |
| **Weigh-in save** | Ruler collapses into the number, number flies (shared transition) to the Home hero, trend line extends its last segment. |
| **Target raised by cardio** | Calorie ring's target tweens to the new value with `spring.gentle`; caption fades in ("+ 310 from cardio"). |
| **Haptics map** | selection (ruler ticks, chip changes) · light (set ✓, food logged) · medium (workout finished) · success (goal ring complete, PR, unlock) · warning (over target — once per day max). |

---

## 8. Screen-by-screen UX specs

### 8.1 Onboarding (account + 9 steps, ~2 minutes, progress dots at top)

1. **Welcome** — animated hero: a trend line drawing itself, rings filling. "Lose weight on pace." CTA "Get started". Secondary "I have an account" → sign in.
   - **Create account** (between Welcome and Units) — email + password or Sign in with Apple, with a short line on what's stored in the cloud (3.8).
2. **Units** — lb/kg, ft-in/cm (default from locale).
3. **About you** — sex (for the formula, with info tooltip), birth date (age gate ≥ 18), height. Health conditions question (pregnant/breastfeeding/medical → tracking-only mode).
4. **Weight** — current weight (NumberRuler) + optional "import from Apple Health". Optional "Add measurements" link for a starting baseline; skippable with no prompt.
5. **Goal** — goal weight; live BMI-category hint; blocks BMI < 18.5 goals.
6. **Rate** — 4 cards: 0.5 / 1 / 1.5 / 2 lb/wk with "Relaxed · Steady (recommended) · Ambitious · Aggressive", each showing goal date + calorie target. Aggressive cards disabled if > 1% BW/wk with explanation.
7. **Activity** — connect Apple Health (explainer: "We read steps and weight; we never sell or share health data"). If granted → baseline from 28 days shown ("You average 4,512 steps"). If denied → pick bucket (< 3k / 3–6k / 6–9k / 9k+). Weekly workout goal stepper (0–7).
8. **Notifications** — preview of 3 sample nudges with toggles; then OS prompt.
9. **The Reveal** — full-screen sequence (`dur.reveal`): "Your plan" → calorie ring fills to target (count-up 0 → 1,800) → macro bars fill staggered → step ring fills to 7,000 → workout dots light → the journey chart draws from today to goal date with the date stamping in with `spring.bouncy` → "Start my journey" (first achievement unlocks: *First Step*).

### 8.2 Home

```
┌──────────────────────────────────────┐
│ Good morning, Marcus      🔥23   (◉) │
│ Sunday, Nov 1                         │
├──────────────────────────────────────┤
│  TREND                                │
│  226.8 lb          ▲ AHEAD · 2.8 days │
│  −3.2 lb since Oct 18                  │
│  Goal Jun 14  (planned Jun 18)         │
│  230 ●━━━━━○─────┼─────┼─────┼── 185  │
├──────────────────────────────────────┤
│ Weight            1W 1M [3M] 6M 1Y All│
│  ·  ·╲·   ·                            │
│       ╲·━━━━━·━━  (trend, glow)        │
│  - - - - - - - - - (target pace)       │
├──────────────────────────────────────┤
│  (◔)480   (◑)62g   (◕)5.8k   (●●○○)  │
│  kcal left protein  steps    2/4 lifts │
├──────────────────────────────────────┤
│ This week  avg 227.4 · −1.4 · 1.4/wk  │
├──────────────────────────────────────┤
│ ┃ 62 g protein to go — 3 h left  [Add]│
├──────────────────────────────────────┤
│ Total lost │ % to goal │ Lowest trend │
│ BMI        │ Days      │ Weigh-in %   │
├──────────────────────────────────────┤
│ Recent badges  [🏅][🏅][🏅]  →         │
└──────────────────────────────────────┘
 [Home] [Food] ( ＋ ) [Train] [Steps]
```
- **Loading:** skeleton for hero + chart (only if DB read > 300 ms — it's local, usually instant).
- **Empty:** see 3.1.
- **Error:** Health sync failed → small inline chip on steps ring "Sync paused · Retry"; never a blocking error.
- Pull-to-refresh → re-sync Health + cloud + recompute.

### 8.3 Food diary

```
┌──────────────────────────────────────┐
│  ‹   Today, Nov 1   ›        [Scan]   │
│        ╭────────╮   Protein ▇▇▇▇░ 86/148│
│        │  480   │   Carbs   ▇▇▇░░ 102/176│
│        │kcal left│  Fat     ▇▇▇▇░ 41/56 │
│        ╰────────╯   1,320 eaten · 1,800 │
├──────────────────────────────────────┤
│ ┃ 150 kcal left soon — snack ideas  › │
├──────────────────────────────────────┤
│ Breakfast                     420 kcal│
│  Greek yogurt, 1 cup   230  P23 C9 F11│
│  Blueberries, 1 cup     85  P1 C21 F0 │
│  ＋ Add food                           │
│ Lunch                         610 kcal│
│  …                                     │
│ Dinner                     ＋ Add food │
│ Snacks                     ＋ Add food │
├──────────────────────────────────────┤
│ [Copy yesterday] [Quick add] [Complete day]│
└──────────────────────────────────────┘
```
- **Empty day:** illustration + "Start with breakfast" + recents row (one-tap log of the 5 most frequent foods).
- **Past day not complete:** banner "Mark Oct 30 complete?" (feeds adaptive TDEE).
- **Offline:** search shows local results (USDA bundled + My Foods + recents) with "Online results unavailable" footer.

### 8.4 Food search / scan / detail
- **Search:** autofocused field; results list rows: name, brand (secondary), serving + kcal right; source tag (Generic · Product · Mine). Tap → detail sheet. Long-press → quick log default serving.
- **Scan:** full-screen camera with rounded-rect reticle, animated scanning line (cyan), torch toggle. On detect: haptic + reticle snaps green + detail sheet slides up. Not found → "Not in the database yet — create it" (barcode prefilled; option to contribute to Open Food Facts in v1).
- **Detail sheet:** name, brand, serving picker, amount chips, macro preview rings showing the day *after* logging, meal slot, "Log" (mint). Error (OFF fetch fails): "Couldn't load product — try again or add manually".

### 8.5 Train
```
┌──────────────────────────────────────┐
│ This week          (●●○○) 2 / 4       │
│ M● T○ W● T○ F○ S○ S○                  │
│ ┃ 2 left, 5 days to go — you're good  │
├──────────────────────────────────────┤
│ [ ▶ Start workout ]   [ Log cardio ]  │
│ Routines: [Push A] [Pull A] [Legs A] ＋│
├──────────────────────────────────────┤
│ Volume (12 wk)  ▁▃▅▅▆▇▆█               │
├──────────────────────────────────────┤
│ History                                │
│ Thu  Pull A   52 min  18,400 lb  PR×2 │
│ Wed  Cycling  30 min  ≈ 313 kcal      │
│ Tue  Push A   47 min  15,900 lb        │
└──────────────────────────────────────┘
```
- **Empty:** "Pick a starter routine" cards (Full-Body 3×, Upper/Lower 4×, PPL 6×) + "Empty workout".

### 8.6 Active workout
```
┌──────────────────────────────────────┐
│ Push A                 31:12  [Finish]│
├──────────────────────────────────────┤
│ Bench Press                       ⋯   │
│ SET PREV     LB    REPS   ✓           │
│  W  95×10    95    10     ✓           │
│  1  185×8    185   8      ✓  (mint)   │
│  2  185×8    190   8      ✓ PR (gold) │
│  3  185×7    190   _      ○           │
│ ＋ Add set                             │
├──────────────────────────────────────┤
│ Incline DB Press                  ⋯   │
│ …                                      │
│ [＋ Add exercise]                      │
├──────────────────────────────────────┤
│        ⏱ Rest 1:12   −15  +15  Skip   │
└──────────────────────────────────────┘
```
- Survives app kill (state persisted on every set change). Leaving shows "Workout in progress" pill above tab bar.
- **Finish → Summary:** duration, volume, sets, PR list (badges bounce in staggered), weekly ring animates +1, "Save" / "Save as routine".
- **Discard** requires confirm sheet.

### 8.7 Steps
```
┌──────────────────────────────────────┐
│            ╭──────────╮               │
│            │  5,812   │  ● SLIGHTLY   │
│            │ of 10,000│    BEHIND     │
│            ╰──────────╯               │
│  4,188 to go · ~42 min walk · 3 h left│
├──────────────────────────────────────┤
│ Today   ▁▂▃▅▅▆▆▇  (cyan area)          │
│         ‐ ‐ ‐ on-track line            │
│ "You usually have 6,100 by now"        │
├──────────────────────────────────────┤
│ Week  ▇ ▅ ▇ ▃ ▇ ▆ ░   avg 8,940 · 🔥5 │
├──────────────────────────────────────┤
│ Why 10,000? ⌄                          │
│ History  4W 3M 1Y                      │
└──────────────────────────────────────┘
```
- **Over goal:** the "to go" line becomes "+3,000 steps over goal ≈ 115 kcal extra burn. Your calorie goal stays the same." The ring draws a second lap in `accent-steps`, not amber, since going over here is good news.
- **Permission denied:** card "Connect Apple Health to track steps automatically" + "Enter manually".
- **Health data delayed** (Watch not synced): footer "Last updated 14 min ago".

### 8.8 Profile / Trophy Room
- Header: avatar, name, "Day 15 of your journey", quick stats.
- **Streaks** grid (current + longest, flame per streak; freezes banked shown as ❄ icons).
- **Achievements** grid by category, locked silhouettes with progress bars ("Down 10: 3.2 / 10 lb"). Tap → detail sheet with unlock date and rule.
- **Records** list.
- Settings entry rows: Account · Goal & targets · Units · Notifications · Apple Health · Data (export CSV/JSON, delete all) · Appearance (v1 light mode) · About/Privacy.

### 8.9 Goal & targets editor
- Shows current plan card (target, macros, step goal, rate, goal date).
- Editable: goal weight, rate, protein g/lb, macro override, step goal override, adaptive TDEE toggle. Every change previews new goal date + pace impact before "Save new plan".

### 8.10 Weekly recap (v1)
Full-screen stories (tap/hold like Instagram stories), progress segments top, each card animated per Section 7.6, final card "Next week's focus" + "Share".

### 8.11 Celebrate modal
Transparent modal (8.6 spec of unlock animation). Buttons: "Share" (renders a 1080×1920 card via Skia snapshot) · "Nice!" (dismiss). Tap outside = dismiss after 600 ms minimum.

### 8.12 Global states
- **Offline:** non-blocking top pill "Offline — everything still works" (local-first).
- **Sync failed:** quiet "Saved on this device, will sync later" in Account settings; never a blocking error.
- **Session expired:** local data stays usable; a banner asks the user to sign in again to resume syncing.
- **First launch after update with migrations:** splash holds until migrations finish (< 1 s typical).
- **Error boundary:** friendly screen + "Send report" (Sentry) + "Restart".

### 8.13 Measurements
- **In the weigh-in sheet:** a collapsed "Add measurements" row. Expanded, it lists the measurements the user tracks with a numeric field each, preloaded with the last value. Empty fields are simply not saved.
- **Standalone sheet:** the same fields, plus "Choose what to track" (first use and from the sheet's menu).
- **Empty state:** none on Home. In Weight Analytics, a single quiet row: "Track waist, hips and more (optional)".

### 8.14 Sign in / Create account
- Fields: email, password. Primary "Sign in with Apple" above them. Forgot password link.
- Errors say what to do: "That password doesn't match. Try again or reset it."
- Delete account (Settings → Account) lists what will be removed and requires typing `DELETE`.

---

## 9. Data model / schema

**Conventions:** SQLite via Drizzle. IDs are UUIDv7 text (sortable by time, sync-ready). Every user-data table has `created_at`, `updated_at` (epoch ms) and `deleted_at` (soft delete, used by sync). Weights in **kg**, lengths in **cm**, energy in **kcal**, distance in **m**, durations in **s**. Days are `local_date` strings `YYYY-MM-DD` in the user's local day (respecting `day_end_hour`).

**Database files**
| File | Contents | Backup |
|---|---|---|
| `pace-<userId>.db` | All of that user's data | Synced to Supabase; excluded from device backup since the server copy restores it |
| `health_cache-<userId>.db` | Steps (daily + hourly) mirrored from Apple Health / Health Connect | **Excluded from backup and sync** (stored in Caches) — re-derivable, keeps HealthKit data out of iCloud |
| `usda.db` (bundled, read-only) | USDA Foundation + SR Legacy foods with FTS5 index | Shipped in app bundle, shared by all accounts |
| `off_cache.db` | Cached Open Food Facts products | Excluded from backup; kept separate so ODbL share-alike stays scoped to OFF data; shared by all accounts |

**Server schema (Supabase Postgres):** mirrors the synced local tables with an added `user_id uuid` referencing `auth.users`, and a row-level security policy on every table: `user_id = auth.uid()`. Local databases don't store `user_id`, since the file itself is per user. Sync adds it at the boundary.

### 9.1 TypeScript domain types

```ts
type Id = string;            // UUIDv7
type LocalDate = string;     // 'YYYY-MM-DD'
type SexFormula = 'male' | 'female';
type GoalMode = 'lose' | 'maintain' | 'gain';
type MealSlot = 'breakfast' | 'lunch' | 'dinner' | 'snacks' | `custom_${number}`;
type FoodSource = 'custom' | 'usda' | 'off' | 'quick_add';
type WeighInSource = 'manual' | 'healthkit' | 'health_connect';
type SetType = 'warmup' | 'working' | 'drop' | 'failure';
type MetricType = 'weight_reps' | 'reps' | 'time' | 'distance';
type PaceStatus = 'ahead' | 'on_pace' | 'behind' | 'paused';
type StepStatus = 'on_track' | 'slightly_behind' | 'at_risk' | 'done';
type StreakType = 'logging' | 'calories_in_range' | 'protein' | 'steps' | 'weigh_in'
                | 'perfect_day' | 'workout_week' | 'on_pace_week';
type MeasurementKind = 'waist' | 'hips' | 'chest' | 'arm' | 'thigh' | 'neck' | 'body_fat_pct';
type CardioActivity = 'walk' | 'run' | 'cycle' | 'row' | 'elliptical' | 'stairs' | 'swim'
                    | 'hike' | 'hiit' | 'other';
type CardioIntensity = 'easy' | 'moderate' | 'hard';

interface Account {               // mirrors the Supabase auth user; session tokens live in SecureStore
  userId: Id; email: string; authProvider: 'email' | 'apple'; cloudConsentAt: number;
  syncHealthWeights: boolean; lastSyncedAt?: number;
}

interface Profile {
  id: Id; displayName: string; sexFormula: SexFormula; birthDate: LocalDate; heightCm: number;
  unitWeight: 'lb' | 'kg'; unitHeight: 'ft_in' | 'cm';
  weekStart: 0 | 1;  dayEndHour: number;               // 0 = midnight, 3 = 3 am
  eatingWindow: [number, number]; activeWindow: [number, number]; // minutes from midnight
  trackingOnly: boolean;                                // medical / pregnancy mode
  trackedMeasurements: MeasurementKind[];               // empty = feature stays out of the way
}

interface GoalPlan {
  id: Id; isActive: boolean; startDate: LocalDate; startWeightKg: number; goalWeightKg: number;
  mode: GoalMode; rateKgPerWeek: number; proteinGPerKgGoal: number;
  stepGoalOverride?: number; macroOverride?: { proteinG?: number; carbsG?: number; fatG?: number };
  adaptiveTdee: boolean; weeklyWorkoutGoal: number; endedAt?: number;
}

interface DailyTarget {           // snapshot per day so history stays accurate after plan changes
  localDate: LocalDate; planId: Id; kcal: number; proteinG: number; carbsG: number; fatG: number;
  fiberG: number; stepGoal: number; bmr: number; tdeeBase: number; stepKcal: number;
  deficit: number; tdeeSource: 'formula' | 'adaptive'; kcalPerStep: number;
  // kcal is the base target. Effective target = kcal + that day's cardio credit (derived, not stored).
}

interface WeighIn {
  id: Id; measuredAt: number; localDate: LocalDate; weightKg: number; source: WeighInSource;
  externalId?: string; note?: string; flags?: ('post_meal' | 'post_workout')[]; isTrended: boolean;
}

interface Measurement {
  id: Id; measuredAt: number; localDate: LocalDate; kind: MeasurementKind;
  value: number;            // cm, or percent for body_fat_pct
  weighInId?: Id;           // set when saved together with a weigh-in
  note?: string;
}

interface Food {
  id: Id; source: FoodSource; sourceId?: string; barcode?: string; name: string; brand?: string;
  baseGrams: number;                         // nutrients below are per baseGrams
  kcal: number; proteinG: number; carbsG: number; fatG: number;
  fiberG?: number; sugarG?: number; sodiumMg?: number;
  servings: { label: string; grams: number }[];
  qualityFlag?: 'kcal_macro_mismatch';
}

interface FoodLog {               // macros snapshotted at log time
  id: Id; localDate: LocalDate; mealSlot: MealSlot; foodRef: string; // 'food:<id>' | 'usda:<fdcId>' | 'off:<barcode>'
  nameSnapshot: string; servingLabel: string; servingGrams: number; quantity: number;
  kcal: number; proteinG: number; carbsG: number; fatG: number; fiberG?: number; loggedAt: number;
}

interface DayStatus { localDate: LocalDate; foodComplete: boolean; completedAt?: number; }

interface Exercise {
  id: Id; name: string; primaryMuscle: string; secondaryMuscles: string[]; equipment: string;
  metricType: MetricType; isCustom: boolean; defaultRestS: number;
}

interface Workout {
  id: Id; routineId?: Id; name: string; startedAt: number; endedAt?: number; localDate: LocalDate;
  durationS?: number; totalVolumeKg?: number; counted: boolean; notes?: string;
}
interface WorkoutExercise { id: Id; workoutId: Id; exerciseId: Id; order: number; supersetGroup?: number; }
interface WorkoutSet {
  id: Id; workoutExerciseId: Id; order: number; setType: SetType;
  weightKg?: number; reps?: number; rpe?: number; durationS?: number; distanceM?: number; completedAt?: number;
}
interface PersonalRecord {
  id: Id; exerciseId: Id; prType: 'weight_at_reps' | 'e1rm' | 'reps_at_weight' | 'session_volume';
  value: number; reps?: number; setId: Id; achievedAt: number;
}

interface CardioSession {
  id: Id; localDate: LocalDate; startedAt: number; durationS: number; activity: CardioActivity;
  intensity: CardioIntensity; distanceM?: number; met: number;
  onFootSteps?: number;     // walk, run, hike only
  netKcal: number; creditKcal: number; kcalEdited: boolean; counted: boolean; notes?: string;
}

interface StepDay { localDate: LocalDate; steps: number; source: 'healthkit' | 'health_connect' | 'pedometer' | 'manual'; manualOverride?: number; syncedAt: number; }
interface StepHour { localDate: LocalDate; hour: number; steps: number; }

interface StreakState {
  type: StreakType; current: number; longest: number; currentStartedOn?: LocalDate;
  lastQualifiedOn?: LocalDate; longestStartedOn?: LocalDate; longestEndedOn?: LocalDate;
}
interface StreakFreeze { id: Id; scope: 'daily' | 'weekly'; earnedAt: number; usedAt?: number; usedForType?: StreakType; usedForDate?: LocalDate; }
interface AchievementUnlock { achievementId: string; unlockedAt: number; context?: Record<string, unknown>; seen: boolean; }
interface TdeeEstimate { weekStart: LocalDate; observedKcal: number; smoothedKcal: number; daysUsed: number; applied: boolean; }
interface NotificationPref { category: string; enabled: boolean; timeMinutes?: number; }
interface NotificationLog { id: Id; category: string; scheduledFor: number; firedAt?: number; dismissed?: boolean; osId?: string; }
```

### 9.2 Tables & indexes

| Table | Key / indexes | Synced |
|---|---|---|
| `profile` | single row | yes |
| `goal_plans` | `id`; index `(is_active)` | yes |
| `daily_targets` | PK `local_date` | yes |
| `weigh_ins` | `id`; index `(local_date)`, unique `(source, external_id)` | yes (Health-sourced rows only with opt-in) |
| `trend_cache` | PK `local_date` (derived; rebuilt from `weigh_ins` on any edit — cheap: years of data < 50 ms) | no |
| `measurements` | `id`; index `(local_date, kind)`, index `(weigh_in_id)` | yes |
| `foods` | `id`; unique `(source, source_id)`; index `(barcode)`; FTS5 virtual table `foods_fts(name, brand)` | yes (not the FTS table) |
| `food_logs` | `id`; index `(local_date, meal_slot)`, index `(food_ref)` for recents/frequents | yes |
| `saved_meals`, `saved_meal_items` (v1) | `id`; FK | yes |
| `recipes`, `recipe_ingredients` (v1) | recipe produces a `foods` row with `source='custom'` | yes |
| `day_status` | PK `local_date` | yes |
| `exercises` | `id`; index `(name)` | custom only |
| `routines`, `routine_exercises` | `id`; index `(routine_id, order)` | yes |
| `workouts` | `id`; index `(local_date)` | yes |
| `workout_exercises` | `id`; index `(workout_id, order)` | yes |
| `workout_sets` | `id`; index `(workout_exercise_id, order)` | yes |
| `personal_records` | `id`; index `(exercise_id, pr_type)` | yes |
| `cardio_sessions` | `id`; index `(local_date)` | yes |
| `streaks` | PK `type` | yes |
| `streak_freezes` | `id`; index `(used_at)` | yes |
| `achievement_unlocks` | PK `achievement_id` (definitions live in code, versioned) | yes |
| `tdee_estimates` | PK `week_start` | yes |
| `notification_prefs` | PK `category` | yes |
| `notification_log` | `id`; index `(category, scheduled_for)` | no |
| `sync_state` | PK `table_name`; `last_pulled_at` | no |
| `health_cache.step_days` / `step_hours` | PK `local_date` / `(local_date, hour)` | never |
| `usda.foods` + `usda.foods_fts` | read-only | no |
| `off_cache.products` | PK `barcode`; `fetched_at` (refresh after 30 days) | no |

Derived values (trend, pace, streak qualification, cardio credit totals) are **computed by the engine from raw tables**, cached only where it's a measurable speed win. That keeps edits (e.g. deleting a wrong weigh-in from 3 weeks ago) trivially correct: rebuild the cache.

---

## 10. Technical architecture

### 10.1 Folder structure

```
pace/
  app.config.ts                 # Expo config + config plugins (healthkit, health-connect, build-properties)
  eas.json                      # development / preview / production profiles
  drizzle.config.ts
  design/                       # copy of the design system's tokens + README
  supabase/ migrations/         # server schema + RLS policies
  src/
    app/                        # Expo Router routes (see Section 2)
    engine/                     # PURE TS — no React, no I/O
      units.ts  bmr.ts  targets.ts  stepGoal.ts  trend.ts  pace.ts
      stepPace.ts  cardio.ts  adaptiveTdee.ts  macros.ts
      qualification.ts  streaks.ts  prs.ts
      achievements/ definitions.ts  evaluate.ts
      nudges/ planner.ts  rules.ts          # decides WHICH nudges at WHAT time
      __tests__/                           # fixtures incl. worked examples A–H
    auth/
      supabase.ts  session.ts  apple.ts     # client, SecureStore session, Sign in with Apple
    db/
      schema/ *.ts   client.ts   migrations/   seeds/ exercises.json
      repos/ weighIns.ts measurements.ts foodLogs.ts workouts.ts cardio.ts targets.ts streaks.ts …
    health/
      HealthProvider.ts         # interface: requestAuth, syncSteps, syncWeight, writeWeight, subscribe
      healthkit.ts  healthConnect.ts  pedometerFallback.ts
    food/
      usdaLocal.ts  offClient.ts  searchService.ts  nutritionSanity.ts
    events/ bus.ts  handlers.ts # domain events → recompute targets/streaks/achievements/nudges
    services/
      scheduler.ts              # expo-notifications: reconcile planned vs scheduled
      backgroundTask.ts         # expo-background-task registration
      dayRollover.ts
      analytics.ts  errors.ts   # PostHog/Sentry wrappers that strip health values
      sync/                     # Supabase push/pull
    features/                   # screen-level composition
      auth/ home/ food/ train/ steps/ profile/ onboarding/ recap/
    ui/
      theme/ tokens.ts unistyles.ts
      motion/ springs.ts durations.ts presets.ts useCountUp.ts
      charts/ WeightChart.tsx StepsDayChart.tsx BarWeekChart.tsx
      components/ ProgressRing.tsx PaceBadge.tsx JourneyBar.tsx StatTile.tsx MacroBar.tsx
                  StreakFlame.tsx AchievementBadge.tsx NumberRuler.tsx NudgeCard.tsx Confetti.tsx …
    stores/ activeWorkout.ts  ui.ts  session.ts   # Zustand (+ MMKV persist)
    lib/ dates.ts ids.ts format.ts haptics.ts
  assets/ fonts/ lottie/ db/usda.db badges/
  scripts/ build-usda-db.ts  contrast-check.ts
```

### 10.2 State & data flow

```
           ┌────────────── writes ──────────────┐
 UI ──▶ repos (Drizzle) ──▶ SQLite ──▶ domain event bus
  ▲                          │              │
  │   useLiveQuery hooks ◀───┘              ├─▶ targets recompute (engine)
  │   + engine selectors (memoized)         ├─▶ streak/achievement evaluation
  │                                          ├─▶ nudge planner → scheduler (expo-notifications)
  │                                          ├─▶ sync queue → Supabase (background)
  └── Zustand (ephemeral UI, active workout) └─▶ celebration queue → celebrate modal
```

- **SQLite is the source of truth on the device.** Screens read with Drizzle `useLiveQuery` (re-renders on table change) and pass rows to pure engine functions (`computePace(trendSeries, plan)`), memoized per input hash. Supabase is the durable per-user copy.
- **Zustand** holds only ephemeral/UI state and the active workout (persisted to MMKV on every change for crash safety; written to SQLite on finish).
- **TanStack Query** is only for network: OFF lookups/search and (v1) the USDA-branded proxy. Query cache persisted to MMKV. Sync has its own queue.
- **Domain events** (`weighin.saved`, `measurement.saved`, `food.logged`, `day.completed`, `workout.finished`, `cardio.saved`, `steps.synced`, `day.rollover`, `sync.pulled`) decouple writes from side effects — easy to test, and new achievements just subscribe.

### 10.3 Health data sync

**iOS (Apple Health, `@kingstinct/react-native-healthkit`)**
- Permissions: read `stepCount`, `bodyMass`; write `bodyMass` (optional toggle). Nothing else (minimal access helps App Review).
- **Steps:** statistics collection query, cumulative sum, interval = 1 day for the last 7 days (catches late Apple Watch syncs) and 1 hour for today. HealthKit deduplicates iPhone + Watch overlap in statistics queries. Initial backfill: 90 days.
- **On-foot cardio:** a statistics query over the session's time range gives `onFootSteps` (4.9). If Health isn't connected, estimate from duration and typical cadence.
- **Weight:** anchored query on `bodyMass` (incremental, includes deletions) → upsert `weigh_ins` (`source='healthkit'`, `external_id` = sample UUID). Skip samples written by our own bundle to avoid echo.
- **Triggers:** app foreground · `subscribeToChanges(stepCount)` while running · HealthKit background delivery (hourly) where granted · `expo-background-task` opportunistic runs. Each sync ends with `steps.synced` → nudge planner reconciles step notifications.

**Android (v2, `react-native-health-connect`)**
- Same `HealthProvider` interface; `aggregateRecord` for `Steps` per day/hour; `readRecords('Weight')` with change tokens. Requires minSdk 26; Health Connect is built into Android 14+, otherwise prompt to install. Background read requires the background permission.

**Fallback:** `expo-sensors` Pedometer (today's steps) + manual entry.

### 10.4 Rules evaluation & day rollover
- On each event, evaluate only the affected rules (e.g. `food.logged` → calorie/protein nudges; `weighin.saved` → trend, pace, weight milestones; `cardio.saved` → effective target, calorie nudges).
- **Day rollover** (first foreground after `day_end_hour`, or background task): finalize yesterday → qualification for every streak → apply freezes → update `streaks` → evaluate time-based achievements → snapshot today's `daily_targets` → re-plan today's notifications. Idempotent (keyed by date) so running twice is harmless.

### 10.5 Notification scheduling
`nudges/planner.ts` (pure) takes today's state + prefs + notification log and returns the desired list `{category, fireAt, content}` for the next 24 h, already filtered for quiet hours, daily cap, per-category limits and backoff. `scheduler.ts` diffs desired vs currently scheduled (`getAllScheduledNotificationsAsync`) and cancels/creates the difference. Called after every domain event and every sync — so a nudge that's no longer true is gone before it fires.

### 10.6 Expo Go vs development builds (workflow impact)
- **Expo Go can't be used** — HealthKit, Health Connect, MMKV v4 and other Nitro modules need native code that Expo Go doesn't contain. (Expo Go has also lagged behind recent SDK releases in the App Store.)
- **Setup once:** `npx expo install expo-dev-client` → add config plugins in `app.config.ts` → `eas build --profile development --platform ios` (cloud) **or** `npx expo run:ios` (local, needs a Mac + Xcode — free and fastest).
- **Day-to-day is the same as Expo Go:** install the dev build on your iPhone once, then `npx expo start` and get fast refresh as usual.
- **Rebuild only when native things change:** adding/updating a native package, changing config plugins/entitlements/Info.plist, bumping the Expo SDK.
- **Testing HealthKit:** the iOS Simulator has the Health app (add sample steps/weights manually); test background delivery and Watch sync on a real device.
- **Ship JS-only fixes** with EAS Update; native changes need a new store build.

### 10.7 Testing & quality
- **Engine:** Jest unit tests, ≥ 95% coverage; worked examples A–H as golden tests; property tests for trend/pace (fast-check).
- **DB/repos:** run Drizzle schema against SQLite in Node for repository tests.
- **Sync & RLS:** two-device merge tests in Node, and a test that one user's token can't read another's rows.
- **UI:** `@testing-library/react-native` for components with logic (PaceBadge, SetRow).
- **E2E:** Maestro flows — sign-up → onboarding → reveal; weigh-in with measurements; scan + log; full workout; log cardio → target rises; streak rollover (time-travel by mocking the clock).
- **Performance budgets:** cold start < 1.5 s on iPhone 12; Home first render < 300 ms after splash; all animations 60 fps on iPhone 12 (120 on ProMotion); food search local results < 100 ms.
- **CI:** GitHub Actions — typecheck, ESLint, tests on PR; EAS Build on release tags.

### 10.8 Accounts & sync

- **Auth:** Supabase Auth via `@supabase/supabase-js`. Session stored with `expo-secure-store`. Sign in with Apple through `expo-apple-authentication` exchanging its identity token with Supabase.
- **Root gate:** `_layout.tsx` restores the session, opens that user's `pace-<userId>.db`, runs migrations, then routes to `(auth)`, `(onboarding)`, or `(tabs)`. Switching users closes one database and opens another; nothing is shared but the read-only food databases.
- **Sync:** `services/sync` pushes rows whose `updated_at` is newer than the last push and pulls rows newer than `sync_state.last_pulled_at`, table by table, in small batches. Last write wins per row. Soft deletes (`deleted_at`) carry deletions. Derived tables aren't synced; they rebuild after a pull.
- **When it runs:** foreground, after writes (debounced 30 s), background task, and pull-to-refresh. Failures retry with backoff and never block the UI.
- **Security:** RLS on every table, anon key only in the app, no service-role key anywhere in the client. Account deletion runs through an Edge Function, since deleting an auth user needs the service role.
- **New-device restore:** pull everything first, then rebuild caches, then show Home.

---

## 11. Recommended stack

Verified current as of November 2026 against Expo SDK 57. Re-run `npx expo install --fix` and `npx expo-doctor` before starting; versions move fast.

| Area | Choice | Why | Rejected / alternatives |
|---|---|---|---|
| Framework | **Expo SDK 57** (React Native 0.86, React 19.2, New Architecture) | Easiest RN upgrade path in years; iOS first, Android from the same codebase | Flutter (would lose your React/TS skills), native Swift (no Android path) |
| Language | **TypeScript strict** | Engine correctness, typed routes | — |
| Navigation | **Expo Router** (typed routes, native `formSheet`) | File-based, deep links free, native sheets | React Navigation directly (Expo Router is built on it anyway) |
| Animation | **Reanimated 4** (+ react-native-worklets) | UI-thread animation; v4 adds CSS-style animations/transitions for simple cases | — |
| Simple declarative animation | **Reanimated 4 CSS animations/transitions** | Covers what Moti was used for | **Moti** — docs still describe it as built on Reanimated 3; avoid adding risk |
| Graphics | **@shopify/react-native-skia** | Rings with glow, flame, confetti, chart rendering, share-card snapshots | react-native-svg (fine for icons; slower for animated glow) |
| Gestures | **react-native-gesture-handler** | Scrubbing charts, ruler, swipe rows | — |
| Charts | **victory-native (XL)** | Built on Skia + Reanimated + D3; animated paths, press/scrub gestures; MIT, actively maintained | react-native-gifted-charts (SVG, less control), ECharts in WebView (heavy) |
| Celebrations | **Custom Skia confetti/particles** + **lottie-react-native** for badge reveals | Skia particles match theme exactly; Lottie for designer-made moments (check each LottieFiles asset's license) | Rive (great, but adds an editor + runtime) |
| Haptics | **expo-haptics** | — | — |
| Apple Health | **@kingstinct/react-native-healthkit** (+ react-native-nitro-modules) | Full TypeScript, Promise API, anchored queries for sync, change subscriptions, Expo config plugin | react-native-health (older API surface, less TS-native) |
| Health Connect | **react-native-health-connect v4+** | Expo plugin now ships inside the package (drop `expo-health-connect`) | — |
| Pedometer fallback | **expo-sensors** | — | — |
| Notifications | **expo-notifications** (local) | Scheduling, categories, no server needed | OneSignal/FCM (not needed until server push) |
| Background | **expo-background-task** | Opportunistic sync on iOS/Android | — |
| Local DB | **expo-sqlite + drizzle-orm** (+ drizzle-kit migrations, Drizzle Studio dev plugin) | SQL power for analytics (weekly averages, PRs), typed schema, `useLiveQuery` reactivity, FTS5 food search | **WatermelonDB** — heavier, opinionated sync protocol you don't need yet |
| Key-value | **react-native-mmkv v4** (`createMMKV`) | Synchronous, fast; settings, Zustand persist, Query cache | AsyncStorage (slow, async) |
| Secure storage | **expo-secure-store** | Auth session in the Keychain | MMKV (not for tokens) |
| Sign in with Apple | **expo-apple-authentication** | Native button and flow; Supabase accepts the identity token | Web OAuth flow |
| State | **Zustand** | Tiny, no boilerplate; perfect for active workout & UI | Redux Toolkit (overkill) |
| Server state | **@tanstack/react-query** | Caching, retries, offline persistence for food APIs | — |
| Styling | **react-native-unistyles 3** | Typed theme tokens, theme/Dynamic-Type changes **without re-renders** (C++ core) — ideal for a token-heavy design system | **Uniwind** (Tailwind v4 classes, from the Unistyles team) if you want Tailwind DX; **NativeWind v5** is still preview; v4 is stable but slower |
| Forms | **react-hook-form + zod** | Onboarding, custom food forms; zod schemas reused for import/export validation | — |
| Barcode | **expo-camera** (`CameraView` barcode scanning: EAN-13, EAN-8, UPC-A, UPC-E) | Built-in, no extra dependency | VisionCamera (more power, more setup) |
| Lists | **@shopify/flash-list** | History, search results | FlatList |
| Icons | **lucide-react-native** (ISC license) | Clean, consistent stroke set | Phosphor |
| Fonts | **Inter** via expo-font (OFL) | Excellent tabular numerals | — |
| Dates | **date-fns** + `@date-fns/tz` | Tree-shakeable, tz-safe local-date bucketing | dayjs |
| IDs | **uuidv7** | Sortable IDs for sync | — |
| Food data (generic) | **USDA FoodData Central — Foundation + SR Legacy, bundled** | Public domain (CC0); bundling avoids shipping an API key (USDA asks you not to expose keys) and gives instant offline search | Live USDA API from the app (key exposure, 1,000 req/h per key) |
| Food data (packaged/barcode) | **Open Food Facts API** | Free, no key; ODbL — attribute "© Open Food Facts contributors", keep OFF data in its own cache DB, send a custom User-Agent, respect 100 product reads/min | Paid DBs (Nutritionix, FatSecret Premier) — consider only if barcode hit-rate in the US is too low |
| USDA branded foods (v1) | Proxy via **Cloudflare Worker** or **Supabase Edge Function** | Keeps the API key server-side | — |
| Backend | **Supabase** (Auth + Postgres + RLS + Edge Functions) — **required from MVP** | Free tier is 500 MB DB / 50k MAU, but **pauses after 7 days idle and has no backups** — fine for beta; move to Pro ($25/mo) before public launch | Firebase (NoSQL fits poorly), PocketBase self-host |
| Errors | **Sentry** (`@sentry/react-native`, free developer tier) | Crash + performance; scrub health values | — |
| Analytics | **PostHog** (free tier) — event names only, no health values | Product analytics/funnels | Firebase Analytics |
| Builds/OTA | **EAS Build + EAS Update** (free tier) or local `expo run:ios` | — | — |
| E2E | **Maestro** (OSS) | YAML flows, works with Expo | Detox |
| Lint/format | ESLint (expo config) + Prettier | — | Biome |

**Year-one cost estimate (solo):**
| Item | Cost |
|---|---|
| Apple Developer Program | $99 / year (needed for TestFlight, App Store, Sign in with Apple) |
| Expo EAS | $0 (free tier; use local builds when the queue is slow) |
| Food data (USDA, OFF) | $0 |
| Supabase | $0 during beta → $25/mo from public launch (accounts make this a launch requirement) |
| Sentry, PostHog | $0 at this scale |
| Privacy policy hosting | $0 (GitHub Pages) – ~$12/yr domain |
| **Total through beta** | **≈ $100–125** |
| **Total with a public launch** | **≈ $100–125 + $25/mo** |

---

## 12. Roadmap

### MVP (iOS, with accounts) — target ≈ 14 weeks for one developer

**Scope:** accounts + cloud sync · onboarding + plan reveal · weigh-ins + optional body measurements + trend + pace + weight chart · food diary with USDA local search, OFF barcode scan, custom foods, quick add, recents/frequents, copy yesterday · rings + calorie/protein nudges · Apple Health steps + computed step goal + at-risk nudge + step-surplus burn · workout logger with library, routines, rest timer, PR detection, weekly goal · cardio sessions that add to the day's target · 8 streaks + ~32 achievements + celebrations · notifications with caps/quiet hours · CSV/JSON export, delete-all, delete account.

| Milestone | Weeks | Tasks |
|---|---|---|
| **M0 Foundation** | 1 | Expo SDK 57 project, TS strict, Expo Router skeleton, Unistyles tokens, fonts, dev client builds (EAS + local), ESLint/Prettier, CI, Sentry |
| **M1 Engine + DB** | 2 | Drizzle schema + migrations; engine modules (units, BMR, targets, step goal, macros, trend, pace, step pace, cardio credit, step surplus) with golden tests A–H; repos; event bus |
| **M2 Accounts + sync** | 3–4 | Supabase project, server schema + RLS; email and Apple sign-in; session gate + per-user databases; push/pull sync with soft deletes; new-device restore; account settings, delete account |
| **M3 Onboarding + Home** | 5–6 | Onboarding 9 screens + reveal animation; ProgressRing, PaceBadge, JourneyBar, StatTile; WeightChart (Victory XL) with range chips + scrub; weigh-in sheet + NumberRuler; measurements (sheet, combined save, charts); Home layout + empty states |
| **M4 Food** | 7–9 | Build `usda.db` script (Foundation + SR Legacy → SQLite + FTS5); search service merging sources; OFF client + cache + sanity checks; scanner; food detail sheet; diary with meal slots, swipe actions, copy yesterday, quick add, custom food form; complete-day; calorie/protein/under-eating nudges |
| **M5 Steps + Health** | 10 | HealthProvider (HealthKit): permissions, 90-day backfill, daily/hourly stats, weight anchored sync + write; Steps tab (ring, day chart, week strip, "why this goal", extra burn); step pacing + at-risk nudge; pedometer/manual fallback |
| **M6 Train** | 11–12 | Seed 200 exercises; routines CRUD + starter templates; active workout (set rows, rest timer + local notif, supersets, persistence); PR detection; summary screen; cardio sheet + MET table + target update + step dedupe; Train tab (weekly ring, history, volume chart); workout-at-risk nudge |
| **M7 Gamification + polish** | 13–14 | Qualification rules, streak engine, day rollover; achievements definitions + evaluation + Trophy Room; celebrate modal (Skia confetti, Lottie badge); StreakFlame; notification planner/scheduler with caps + backoff; settings; export/delete; accessibility pass (VoiceOver labels, Dynamic Type, Reduce Motion); performance pass; TestFlight beta |

### v1 (≈ +8 weeks)
Adaptive TDEE + plateau insights · saved meals & recipes · weekly recap stories + share cards · streak freezes · light mode · iOS home-screen widgets (expo-widgets: today's rings + pace badge) · USDA branded foods via proxy · OFF contribution flow · per-day (training/rest) calorie targets · plate calculator · import cardio from Apple Health workouts · measurement achievements.

### v2
Android release (Health Connect, Material polish, Play Store) · Apple Watch quick-log/steps complication · live workout Live Activity · optional AI photo/voice food logging · opt-in friends (consistency-only comparisons) · maintenance & gain modes polished · coach export (PDF) · localization.

---

## 13. Risks & compliance

### 13.1 App Store & HealthKit (Guideline 5.1.3 and related)
- **Never** use HealthKit data for advertising, marketing or use-based data mining; never sell it; never share it with third parties without explicit consent. Analytics/Sentry wrappers strip all health values (event names only, e.g. `weighin_saved`, never the weight).
- **Don't store HealthKit data in iCloud.** Mirrored step data lives in `health_cache-<userId>.db` in Caches (excluded from backup). Cloud sync goes to your own Supabase backend with user consent, encrypted in transit and at rest, and disclosed in the privacy policy. Steps are never uploaded; Health-sourced weights upload only with a separate opt-in.
- Request **only** step count and body mass; write only body mass (never write inaccurate data — manual weigh-ins are written as the user entered them).
- Clear `NSHealthShareUsageDescription` / `NSHealthUpdateUsageDescription` purpose strings; HealthKit capability via the config plugin.
- A privacy policy URL is required in the app and App Store Connect; App Privacy labels must declare Health & Fitness data plus Contact Info (email), "not used for tracking".
- **In-app account deletion is required** (Guideline 5.1.1(v)) and is part of the MVP.
- Sign in with Apple is offered alongside email; review Guideline 4.8 again if any other third-party login is added.

### 13.2 Privacy law
Accounts mean weight, measurements, food and workout data now live on a server from the MVP, so exposure is larger than a local-only app. GDPR/UK GDPR (if available in EU/UK), CCPA/CPRA, and US state consumer-health-data laws (e.g. Washington's My Health My Data Act) may apply — consent screen before upload, data export, deletion, no sale of data. Get a privacy policy reviewed before public launch.

### 13.3 Health-claim wording
- Never: "guaranteed", "lose X lb in Y days", "treats/cures", "medical-grade". Always: "estimate", "plan", "trend".
- Onboarding + Settings: "Pace provides estimates for general wellness, not medical advice. Talk to a healthcare professional before starting a diet, especially if you have a medical condition."
- Calorie, cardio and step figures are labeled "estimated".

### 13.4 Safety guardrails (built into the engine, not just the UI)
| Guardrail | Rule |
|---|---|
| Calorie floor | Never below 1,500 (male formula) / 1,200 (female formula) |
| Max loss rate | ≤ 1% body weight / week; 2 lb/wk option only appears when that's ≤ 1% |
| Goal weight | Implied BMI ≥ 18.5 |
| Age | 18+ only |
| Special populations | Pregnancy/breastfeeding/medical flag → tracking-only mode (no deficit) |
| Under-eating | Streaks require eating ≥ 80% of the effective target; 3 consecutive completed days below the floor → gentle check-in card with a link to the National Alliance for Eating Disorders helpline; aggressive nudges paused |
| Compensatory exercise | Cardio raises the food budget, never the reverse: the app never suggests cardio to "earn" food or "burn off" an over-target day. Credit capped at 1,000 kcal/day. |
| Language | No red "failure" states for food; no shaming copy; over-target framed as "one day doesn't move your trend" |
| Adaptive TDEE | Can't push targets below the floor; change ≤ 100 kcal/week |
| Social (v2) | Never compare body weights between users |

### 13.5 Product & technical risks
| Risk | Mitigation |
|---|---|
| **Scope** (four apps in one, now with a backend) | Strict MVP slice; the engine is shared, but each pillar ships at "good" before "great" |
| 3,500 kcal/lb inaccuracy over long diets | Recompute from trend every 2 lb; adaptive TDEE in v1 |
| EMA lag makes pace look wrong early | Lag-matched comparison (4.5) |
| Crowdsourced OFF data errors | Sanity check `kcal ≈ 4P + 4C + 9F` (±20%) → flag + let user correct; user edits saved as custom food |
| US barcode coverage gaps in OFF | Measure hit-rate in beta; fallback create-food flow; consider a paid DB only if needed |
| iOS background limits → stale step nudges | Conditional pre-scheduling + reconcile on every sync; "about" wording |
| Notification fatigue | Caps, backoff, per-category toggles, smart timing from habits |
| Library churn (Reanimated 4 / Skia / Victory compatibility on new SDKs) | Pin versions; upgrade one SDK at a time with expo-doctor; keep chart code behind a thin `ui/charts` layer |
| Gamification encouraging unhealthy behavior | "In-range" qualification, no XP for restriction, floor-aware streaks |
| Cardio estimates inflate intake (MET values run high) | Net of resting burn, step dedupe, daily cap, editable kcal, "estimated" label; adaptive TDEE corrects for the error over time |
| Sync bugs lose user data | Soft deletes only, last-write-wins per row, two-device tests, server backups on Pro before launch |
| Supabase free tier pauses after 7 idle days | Fine for beta with regular use; move to Pro before public launch |

---

## 14. Assumptions & open questions

### Assumptions made
1. US-first launch; default units lb / ft-in; English only.
2. Free app for MVP; monetization (e.g. Pro: adaptive TDEE, recaps, widgets) decided after beta retention data.
3. Local-first with a required account from the MVP: the device database serves the UI and Supabase holds the durable per-user copy. No guest mode.
4. One account per person, and a device can hold several accounts with separate databases; no coach/trainer accounts.
5. Weekly workout goal does not change calorie targets. Lifting isn't eaten back. Logged cardio is added to the day's target, net of resting burn and step overlap.
6. Base calorie target is fixed per day. It isn't live-adjusted by steps; step surplus is display-only. Only logged cardio raises it.
7. Week starts Monday by default; day ends at midnight by default (configurable).
8. Mifflin-St Jeor + 1.2 sedentary factor + 3,000-step baseline is accurate enough at the start; adaptive TDEE corrects it.
9. Protein default 0.8 g per lb of goal weight.
10. USDA Foundation + SR Legacy (~8k generic foods) is enough for generic offline search; packaged foods come from OFF.
11. Apple Watch is an optional data source via Apple Health (no watch app in MVP). Cardio is logged manually in the MVP; importing Health workouts is v1.
12. Working title "Pace" is a placeholder for your branding. The palette is set by the Pace design system.

---

## References (checked November 2026)

- Expo SDK 57 changelog — https://expo.dev/changelog/sdk-57
- Expo SDK 56 changelog — https://expo.dev/changelog/sdk-56
- @kingstinct/react-native-healthkit — https://github.com/kingstinct/react-native-healthkit
- react-native-health-connect (v4 release notes) — https://github.com/matinzd/react-native-health-connect/releases
- Victory Native XL — https://github.com/FormidableLabs/victory-native-xl
- Reanimated compatibility — https://docs.swmansion.com/react-native-reanimated/docs/guides/compatibility
- Moti — https://github.com/nandorojo/moti
- Drizzle + Expo SQLite — https://orm.drizzle.team/docs/connect-expo-sqlite
- react-native-mmkv — https://github.com/mrousavy/react-native-mmkv
- Styling comparison (NativeWind / Unistyles / Tamagui) — https://reactnativerelay.com/article/react-native-styling-2026-nativewind-unistyles-tamagui-compared
- Open Food Facts API & licensing — https://openfoodfacts.github.io/openfoodfacts-server/api/ · https://wiki.openfoodfacts.org/ODBL_License
- USDA FoodData Central API guide — https://fdc.nal.usda.gov/api-guide
- Supabase free-tier limits — https://makerkit.dev/blog/saas/supabase-pricing
- Apple App Store Review Guidelines (5.1.3) — https://developer.apple.com/app-store/review/guidelines/
