module.exports = {
  // this is the package root, even when tests are being run at the repo level
  rootDir: process.cwd(),
  testEnvironment: './sentry.env.js',
  testEnvironmentOptions: {
    sentryConfig: {
      // `init` will be passed to `Sentry.init()`
      init: {
        dsn: 'https://4957b5a52f3240069a795d67cc283ded@o447951.ingest.sentry.io/4503919927754752',
        environment: process.env.CI ? 'ci' : 'local',
        tracesSampleRate: 1.0,
      },

      transactionOptions: {
        // `tags` will be used for the test suite transaction
        tags: {
          branch: process.env.GITHUB_REF,
          commit: process.env.GITHUB_SHA,
        },
      },
    },
  },
  collectCoverage: true,
  transform: {
    '^.+\\.ts$': 'ts-jest',
    '^.+\\.tsx$': 'ts-jest',
  },
  coverageDirectory: '<rootDir>/coverage',
  moduleFileExtensions: ['js', 'ts', 'tsx'],
  testMatch: ['<rootDir>/**/*.test.ts', '<rootDir>/**/*.test.tsx'],
  globals: {
    'ts-jest': {
      tsconfig: '<rootDir>/tsconfig.test.json',
    },
    __DEBUG_BUILD__: true,
  },
  testPathIgnorePatterns: ['<rootDir>/build/', '<rootDir>/node_modules/'],
};
