const { RuleTester } = require('eslint');

const captureExceptionFromCoreRule = require('../../../src/rules/captureException-from-core.js');
const ruleTester = new RuleTester({
  parserOptions: {
    sourceType: 'module',
    ecmaVersion: 2015,
  },
});
ruleTester.run('captureException-from-core', captureExceptionFromCoreRule, {
  valid: [
    {
      // Solo import
      code: "import { captureException } from '@sentry/core';",
    },
    {
      // One import among many
      code: "import { captureException, Hub } from '@sentry/core';",
    },
    {
      // Full module import
      code: "import * as SentryCore from '@sentry/core'; SentryCore.captureException('');",
    },
    {
      // Full module import used inside a function
      code: "import * as SentryCore from '@sentry/core'; const func = () => SentryCore.captureException('');",
    },
  ],

  invalid: [
    {
      // Solo import from browser SDK
      code: "import { captureException } from '@sentry/browser';",
      errors: [{ messageId: 'errorMessage' }],
    },
    {
      // Solo import from node SDK
      code: "import { captureException } from '@sentry/node';",
      errors: [{ messageId: 'errorMessage' }],
    },
    {
      // Solo import from wrapper SDK
      code: "import { captureException } from '@sentry/nextjs';",
      errors: [{ messageId: 'errorMessage' }],
    },
    {
      // One import among many, from a non-core SDK
      code: "import { captureException, showReportDialog } from '@sentry/browser';",
      errors: [{ messageId: 'errorMessage' }],
    },
    {
      // Full module import, from a non-core SDK
      code: "import * as SentryBrowser from '@sentry/browser'; SentryBrowser.captureException('');",
      errors: [{ messageId: 'errorMessage' }],
    },
  ],
});
