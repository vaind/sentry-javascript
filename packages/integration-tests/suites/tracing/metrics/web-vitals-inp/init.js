import * as Sentry from '@sentry/browser';
import { Integrations } from '@sentry/tracing';

window.Sentry = Sentry;

Sentry.init({
  dsn: 'https://public@dsn.ingest.sentry.io/1337',
  integrations: [
    new Integrations.BrowserTracing({
      idleTimeout: 9000,
      _experiments: {
        enableINP: true,
      },
      _metricOptions: {
        _reportAllChanges: true,
      },
    }),
  ],
  tracesSampleRate: 1,
});
