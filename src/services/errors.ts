import * as Sentry from '@sentry/react-native';

const dsn = process.env.EXPO_PUBLIC_SENTRY_DSN;

// Health values must never reach Sentry (PLAN 13.1), so no PII and no breadcrumb payloads.
export function initErrorReporting() {
  if (!dsn) return;
  Sentry.init({
    dsn,
    sendDefaultPii: false,
    beforeBreadcrumb: (crumb) => ({ ...crumb, data: undefined }),
  });
}
