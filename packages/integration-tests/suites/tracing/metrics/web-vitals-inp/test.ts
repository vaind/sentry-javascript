import { expect } from '@playwright/test';
import { Event } from '@sentry/types';

import { sentryTest } from '../../../../utils/fixtures';
import { getFirstSentryEnvelopeRequest } from '../../../../utils/helpers';

sentryTest('should capture an INP vital.', async ({ browserName, getLocalTestPath, page }) => {
  // FID measurement is not generated on webkit
  if (browserName === 'webkit') {
    sentryTest.skip();
  }

  const url = await getLocalTestPath({ testDir: __dirname });

  await page.goto(url);
  // To trigger INP
  await page.click('#inp-btn');

  const eventData = await getFirstSentryEnvelopeRequest<Event>(page);

  expect(eventData.measurements).toBeDefined();
  expect(eventData.measurements?.inp?.value).toBeDefined();

  const inpSpan = eventData.spans?.filter(({ description }) => description === 'interaction to next paint')[0];

  expect(inpSpan).toBeDefined();
  expect(inpSpan?.op).toBe('web.vitals');
  expect(inpSpan?.parentSpanId).toBe(eventData.contexts?.trace_span_id);
});
