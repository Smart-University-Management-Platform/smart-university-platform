module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  roots: ['<rootDir>/src'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'mjs'],
  setupFilesAfterEnv: ['<rootDir>/src/setupTests.ts'],
  transform: {
    '^.+\\.(ts|tsx)$': ['ts-jest', {
      tsconfig: 'tsconfig.json',
      useESM: false,
      diagnostics: {
        ignoreCodes: [151001]
      }
    }],
    '^.+\\.(js|mjs)$': 'babel-jest'
  },
  transformIgnorePatterns: [
    'node_modules/(?!(msw|@mswjs|until-async|@bundled-es-modules|headers-polyfill|outvariant|strict-event-emitter|path-to-regexp)/)'
  ],
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
    // Path alias mapping for @/ -> src/
    '^@/(.*)$': '<rootDir>/src/$1',
    // MSW v2 has issues with Jest - mock the node-specific modules
    '^msw/node$': '<rootDir>/src/__mocks__/msw-node.ts'
  }
};