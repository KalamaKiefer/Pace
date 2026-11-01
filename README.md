# Pace

A weight-loss app that answers one question every day: am I on pace?

- [PLAN.md](PLAN.md) is the product and technical plan, with milestones in Section 12.
- [design/](design/) holds a copy of the [Pace design system](https://claude.ai/artifact/JMUqjqtManfKjSwphM91z8) tokens and brand book.

## Status

M0 Foundation: navigation skeleton, theme tokens, fonts, tooling. Screens are placeholders.

## Running it

Pace needs a development build, because it uses native modules Expo Go doesn't include.

```bash
npm install
```

```bash
cp .env.example .env.local
```

```bash
npm run ios
```

After the first build, `npm start` is enough until native dependencies change. If `pod install` fails with an encoding error, set `LANG=en_US.UTF-8` in your shell and try again.

## Checks

```bash
npm run typecheck
```

```bash
npm run lint
```

```bash
npm test
```

```bash
npm run doctor
```

## Updating the design tokens

`src/ui/theme/tokens.ts` mirrors `design/tokens.json`, and a test fails if they drift. When the design system changes, replace `design/tokens.json` with the new version and update `tokens.ts` until `npm test` passes.
