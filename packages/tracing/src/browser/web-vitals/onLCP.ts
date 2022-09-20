/*
 * Copyright 2020 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { bindReporter } from './lib/bindReporter';
import { getVisibilityWatcher } from './lib/getVisibilityWatcher';
import { initMetric } from './lib/initMetric';
import { observe } from './lib/observe';
import { onHidden } from './lib/onHidden';
import { LCPMetric, ReportHandler, ReportOpts } from './types';

// https://wicg.github.io/largest-contentful-paint/#sec-largest-contentful-paint-interface
export interface LargestContentfulPaint extends PerformanceEntry {
  renderTime: DOMHighResTimeStamp;
  loadTime: DOMHighResTimeStamp;
  size: number;
  id: string;
  url: string;
  element?: Element;
  toJSON(): Record<string, string>;
}

const reportedMetricIDs: Record<string, boolean> = {};

export const onLCP = (onReport: ReportHandler, opts: ReportOpts = {}): void => {
  const visibilityWatcher = getVisibilityWatcher();
  const metric = initMetric('LCP');
  let report: ReturnType<typeof bindReporter>;

  const handleEntries = (entries: LCPMetric['entries']): void => {
    const lastEntry = entries[entries.length - 1] as LargestContentfulPaint;
    if (lastEntry) {
      // This is modified from the web vitals library to preserve behaviour before we make a breaking change.
      // This simply uses startTime in lieu of subtracting activationStart from the navigation entry.
      const value = lastEntry.startTime;

      // Only report if the page wasn't hidden prior to LCP.
      if (value < visibilityWatcher.firstHiddenTime) {
        metric.value = value;
        metric.entries = [lastEntry];
        report();
      }
    }
  };

  const po = observe('largest-contentful-paint', handleEntries);

  if (po) {
    report = bindReporter(onReport, metric, opts.reportAllChanges);

    const stopListening = (): void => {
      if (!reportedMetricIDs[metric.id]) {
        handleEntries(po.takeRecords() as LCPMetric['entries']);
        po.disconnect();
        reportedMetricIDs[metric.id] = true;
        report(true);
      }
    };

    // Stop listening after input. Note: while scrolling is an input that
    // stop LCP observation, it's unreliable since it can be programmatically
    // generated. See: https://github.com/GoogleChrome/web-vitals/issues/75
    ['keydown', 'click'].forEach(type => {
      addEventListener(type, stopListening, { once: true, capture: true });
    });

    onHidden(stopListening, true);
  }
};
