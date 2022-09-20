# web-vitals

> A modular library for measuring the [Web Vitals](https://web.dev/vitals/) metrics on real users.

This was vendored from: https://github.com/GoogleChrome/web-vitals: v3.0.2

The commit SHA used is: [10b584593060ede911f409e01ef7871fe662d226](https://github.com/GoogleChrome/web-vitals/tree/10b584593060ede911f409e01ef7871fe662d226)

Current vendored web vitals are:

- LCP (Largest Contentful Paint)
- FID (First Input Delay)
- CLS (Cumulative Layout Shift)
- INP (Interaction to next paint) [Experimental]

## Notable Changes from web-vitals library

This vendored web-vitals library is meant to be used in conjunction with the `@sentry/tracing` `BrowserTracing` integration.
As such:
- Logic around `BFCache` and multiple reports were removed from the library as our web-vitals only report once per pageload.
- We handle thresholds for metrics upstream in our ingestion so they've been removed to conserve size.

## License

[Apache 2.0](https://github.com/GoogleChrome/web-vitals/blob/master/LICENSE)

## CHANGELOG

- Partially Bumped from Web Vitals v2.1.0 to v3.0.2

https://github.com/getsentry/sentry-javascript/pull/3781
- Bumped from Web Vitals v0.2.4 to v2.1.0

https://github.com/getsentry/sentry-javascript/pull/3515
- Remove support for Time to First Byte (TTFB)

https://github.com/getsentry/sentry-javascript/pull/2964
- Added support for Cumulative Layout Shift (CLS) and Time to First Byte (TTFB)

https://github.com/getsentry/sentry-javascript/pull/2909
- Added support for FID (First Input Delay) and LCP (Largest Contentful Paint)
