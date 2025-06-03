export default {
  globalSetup: process.env.SKIP_SETUP ? undefined : './test/jest.setup.js',
  globalTeardown: process.env.SKIP_TEARDOWN ? undefined : './test/jest.teardown.js',
  testEnvironment: 'node',
  testTimeout: 30000
}
