import * as puppeteer from 'puppeteer';

export {CLS};

class CLS {
  constructor(
      private _page: puppeteer.Page) {}

  public async setup(): Promise<void> {
    await this._page.evaluateOnNewDocument(`{
      window.cumulativeLayoutShiftScore = 0;

      const observer = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (!entry.hadRecentInput) {
            window.cumulativeLayoutShiftScore += entry.value;
          }
        }
      });

      observer.observe({type: 'layout-shift', buffered: true});

      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') {
          observer.takeRecords();
          observer.disconnect();
        }
      });
    }`);
  }

  public async collect(): Promise<number> {
    const result = await this._page.evaluate('window.cumulativeLayoutShiftScore');
    return result as number;
  }
}
