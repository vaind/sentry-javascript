import { BrowserClient } from '@sentry/browser';
import { getCurrentHub, Hub, Scope } from '@sentry/core';
import { Client, ReplayEvent } from '@sentry/types';

import { REPLAY_EVENT_NAME } from '../../../src/constants';
import { getReplayEvent } from '../../../src/util/getReplayEvent';
import { getDefaultBrowserClientOptions } from '../../utils/getDefaultBrowserClientOptions';

describe('getReplayEvent', () => {
  let hub: Hub;
  let client: Client;
  let scope: Scope;

  beforeEach(() => {
    hub = getCurrentHub();
    client = new BrowserClient(getDefaultBrowserClientOptions());
    hub.bindClient(client);

    client = hub.getClient()!;
    scope = hub.getScope()!;
  });

  it('works', async () => {
    expect(client).toBeDefined();
    expect(scope).toBeDefined();

    const replayId = 'replay-ID';
    const event: ReplayEvent = {
      // @ts-ignore private api
      type: REPLAY_EVENT_NAME,
      timestamp: 1670837008.634,
      error_ids: ['error-ID'],
      trace_ids: ['trace-ID'],
      urls: ['https://sentry.io/'],
      replay_id: replayId,
      event_id: replayId,
      segment_id: 3,
    };

    const replayEvent = await getReplayEvent({ scope, client, replayId, event });

    expect(replayEvent).toEqual({
      type: 'replay_event',
      timestamp: 1670837008.634,
      error_ids: ['error-ID'],
      trace_ids: ['trace-ID'],
      urls: ['https://sentry.io/'],
      replay_id: 'replay-ID',
      segment_id: 3,
      platform: 'javascript',
      event_id: 'replay-ID',
      environment: 'production',
      sdk: {
        name: 'sentry.javascript.integration.replay',
        version: 'version:Test',
      },
      sdkProcessingMetadata: {},
      breadcrumbs: undefined,
    });
  });
});
