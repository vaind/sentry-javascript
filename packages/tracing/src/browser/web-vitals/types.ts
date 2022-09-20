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

import { LayoutShift } from './getCLS';
import { LargestContentfulPaint } from './onLCP';

export interface Metric {
  // The name of the metric (in acronym form).
  name: 'CLS' | 'FCP' | 'FID' | 'INP' | 'LCP' | 'TTFB' | 'UpdatedCLS';

  // The current value of the metric.
  value: number;

  // The delta between the current value and the last-reported value.
  // On the first report, `delta` and `value` will always be the same.
  delta: number;

  // A unique ID representing this particular metric instance. This ID can
  // be used by an analytics tool to dedupe multiple values sent for the same
  // metric instance, or to group multiple deltas together and calculate a
  // total. It can also be used to differentiate multiple different metric
  // instances sent from the same page, which can happen if the page is
  // restored from the back/forward cache (in that case new metrics object
  // get created).
  id: string;

  // Any performance entries used in the metric value calculation.
  // Note, entries will be added to the array as the value changes.
  entries: (PerformanceEntry | FirstInputPolyfillEntry | NavigationTimingPolyfillEntry)[];
}

export interface ReportHandler {
  (metric: Metric): void;
}
export interface ReportCallback {
  (metric: Metric): void;
}

export interface ReportOpts {
  reportAllChanges?: boolean;
  durationThreshold?: number;
}

// https://wicg.github.io/event-timing/#sec-performance-event-timing
export interface PerformanceEventTiming extends PerformanceEntry {
  duration: DOMHighResTimeStamp;
  interactionId?: number;
  processingStart: number;
}

export type FirstInputPolyfillEntry = Omit<PerformanceEventTiming, 'processingEnd' | 'toJSON'>;

export interface FirstInputPolyfillCallback {
  (entry: FirstInputPolyfillEntry): void;
}

// http://wicg.github.io/netinfo/#navigatornetworkinformation-interface
export interface NavigatorNetworkInformation {
  readonly connection?: NetworkInformation;
}

// http://wicg.github.io/netinfo/#connection-types
type ConnectionType = 'bluetooth' | 'cellular' | 'ethernet' | 'mixed' | 'none' | 'other' | 'unknown' | 'wifi' | 'wimax';

// http://wicg.github.io/netinfo/#effectiveconnectiontype-enum
type EffectiveConnectionType = '2g' | '3g' | '4g' | 'slow-2g';

// http://wicg.github.io/netinfo/#dom-megabit
type Megabit = number;
// http://wicg.github.io/netinfo/#dom-millisecond
type Millisecond = number;

// http://wicg.github.io/netinfo/#networkinformation-interface
interface NetworkInformation extends EventTarget {
  // http://wicg.github.io/netinfo/#type-attribute
  readonly type?: ConnectionType;
  // http://wicg.github.io/netinfo/#effectivetype-attribute
  readonly effectiveType?: EffectiveConnectionType;
  // http://wicg.github.io/netinfo/#downlinkmax-attribute
  readonly downlinkMax?: Megabit;
  // http://wicg.github.io/netinfo/#downlink-attribute
  readonly downlink?: Megabit;
  // http://wicg.github.io/netinfo/#rtt-attribute
  readonly rtt?: Millisecond;
  // http://wicg.github.io/netinfo/#savedata-attribute
  readonly saveData?: boolean;
  // http://wicg.github.io/netinfo/#handling-changes-to-the-underlying-connection
  onchange?: EventListener;
}

// https://w3c.github.io/device-memory/#sec-device-memory-js-api
export interface NavigatorDeviceMemory {
  readonly deviceMemory?: number;
}

export type NavigationTimingPolyfillEntry = Omit<
  PerformanceNavigationTiming,
  | 'initiatorType'
  | 'nextHopProtocol'
  | 'redirectCount'
  | 'transferSize'
  | 'encodedBodySize'
  | 'decodedBodySize'
  | 'toJSON'
>;

export interface WebVitalsGlobal {
  firstInputPolyfill: (onFirstInput: FirstInputPolyfillCallback) => void;
  resetFirstInputPolyfill: () => void;
  firstHiddenTime: number;
}

/**
 * An LCP-specific version of the Metric object.
 */
export interface LCPMetric extends Metric {
  name: 'LCP';
  entries: LargestContentfulPaint[];
}

/**
 * An FID-specific version of the Metric object.
 */
export interface FIDMetric extends Metric {
  name: 'FID';
  entries: (PerformanceEventTiming | FirstInputPolyfillEntry)[];
}

/**
 * A CLS-specific version of the Metric object.
 */
export interface CLSMetric extends Metric {
  name: 'CLS';
  entries: LayoutShift[];
}

/**
 * An INP-specific version of the Metric object.
 */
export interface INPMetric extends Metric {
  name: 'INP';
  entries: PerformanceEventTiming[];
}

declare global {
  interface Window {
    webVitals: WebVitalsGlobal;

    // Build flags:
    __WEB_VITALS_POLYFILL__: boolean;
  }
}
