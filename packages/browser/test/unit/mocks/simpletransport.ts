import { createTransport } from '@sentry/core';
import { Transport } from '@sentry/types';
import { resolvedSyncPromise } from '@sentry/utils';

export function makeSimpleTransport(): Transport {
  return createTransport({ recordDroppedEvent: () => undefined }, () => resolvedSyncPromise({}));
}
