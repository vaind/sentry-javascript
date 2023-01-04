import assert from 'assert';
import * as playwright from 'playwright';

import { CpuUsage, CpuUsageSampler, CpuUsageSerialized } from './perf/cpu.js';
import { JsHeapUsage, JsHeapUsageSampler, JsHeapUsageSerialized } from './perf/memory.js';
import { PerfMetricsSampler } from './perf/sampler.js';
import { Result } from './results/result.js';
import { Scenario, TestCase } from './scenarios.js';
import { consoleGroup } from './util/console.js';
import { WebVitals, WebVitalsCollector } from './vitals/index.js';

const cpuThrottling = 4;
const networkConditions = 'Fast 3G';

// Same as puppeteer-core PredefinedNetworkConditions
const PredefinedNetworkConditions = Object.freeze({
  'Slow 3G': {
    download: ((500 * 1000) / 8) * 0.8,
    upload: ((500 * 1000) / 8) * 0.8,
    latency: 400 * 5,
    connectionType: 'cellular3g',
  },
  'Fast 3G': {
    download: ((1.6 * 1000 * 1000) / 8) * 0.9,
    upload: ((750 * 1000) / 8) * 0.9,
    latency: 150 * 3.75,
    connectionType: 'cellular3g',
  },
});

export class Metrics {
  constructor(public readonly vitals: WebVitals, public readonly cpu: CpuUsage, public readonly memory: JsHeapUsage) { }

  public static fromJSON(data: Partial<{ vitals: Partial<WebVitals>, cpu: CpuUsageSerialized, memory: JsHeapUsageSerialized }>): Metrics {
    return new Metrics(
      WebVitals.fromJSON(data.vitals || {}),
      CpuUsage.fromJSON(data.cpu || {}),
      JsHeapUsage.fromJSON(data.memory || {}),
    );
  }
}

export interface MetricsCollectorOptions {
  headless: boolean;
}

export class MetricsCollector {
  private _options: MetricsCollectorOptions;

  constructor(options?: Partial<MetricsCollectorOptions>) {
    this._options = {
      headless: false,
      ...options
    };
  }

  public async execute(testCase: TestCase): Promise<Result> {
    console.log(`Executing test case ${testCase.name}`);
    return consoleGroup(async () => {
      const aResults = await this._collect(testCase, 'A', testCase.a);
      const bResults = await this._collect(testCase, 'B', testCase.b);
      return new Result(testCase.name, cpuThrottling, networkConditions, aResults, bResults);
    });
  }

  private async _collect(testCase: TestCase, name: string, scenario: Scenario): Promise<Metrics[]> {
    const label = `Scenario ${name} data collection (total ${testCase.runs} runs)`;
    for (let try_ = 1; try_ <= testCase.tries; try_++) {
      console.time(label);
      const results: Metrics[] = [];
      for (let run = 1; run <= testCase.runs; run++) {
        const innerLabel = `Scenario ${name} data collection, run ${run}/${testCase.runs}`;
        console.time(innerLabel);
        results.push(await this._run(scenario));
        console.timeEnd(innerLabel);
      }
      console.timeEnd(label);
      assert.strictEqual(results.length, testCase.runs);
      if (await testCase.shouldAccept(results)) {
        console.log(`Test case ${testCase.name}, scenario ${name} passed on try ${try_}/${testCase.tries}`);
        return results;
      } else if (try_ != testCase.tries) {
        console.log(`Test case ${testCase.name} failed on try ${try_}/${testCase.tries}, retrying`);
      } else {
        throw `Test case ${testCase.name}, scenario ${name} failed after ${testCase.tries} tries.`;
      }
    }
    // Unreachable code, if configured properly:
    console.assert(testCase.tries >= 1);
    return [];
  }

  private async _run(scenario: Scenario): Promise<Metrics> {
    const disposeCallbacks: (() => Promise<void>)[] = [];
    try {
      const browser = await playwright.chromium.launch({
        headless: this._options.headless,

      });
      disposeCallbacks.push(async () => browser.close());
      const page = await browser.newPage();

      const cdp = await page.context().newCDPSession(page);

      // Simulate throttling.
      await cdp.send('Network.emulateNetworkConditions', {
        offline: false,
        latency: PredefinedNetworkConditions[networkConditions].latency,
        uploadThroughput: PredefinedNetworkConditions[networkConditions].upload,
        downloadThroughput: PredefinedNetworkConditions[networkConditions].download,
      });
      await cdp.send('Emulation.setCPUThrottlingRate', { rate: cpuThrottling });

      // Collect CPU and memory info 10 times per second.
      const perfSampler = await PerfMetricsSampler.create(cdp, 100);
      disposeCallbacks.push(async () => perfSampler.stop());
      const cpuSampler = new CpuUsageSampler(perfSampler);
      const memSampler = new JsHeapUsageSampler(perfSampler);

      const vitalsCollector = await WebVitalsCollector.create(page);

      await scenario.run(browser, page);

      // NOTE: FID needs some interaction to actually show a value
      const vitals = await vitalsCollector.collect();

      return new Metrics(vitals, cpuSampler.getData(), memSampler.getData());
    } finally {
      disposeCallbacks.reverse().forEach((cb) => cb().catch(console.log));
    }
  }
}
