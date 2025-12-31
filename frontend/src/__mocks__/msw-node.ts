/**
 * Mock for msw/node module.
 * 
 * MSW v2 has issues with Jest due to its ESM-first approach.
 * This mock provides a minimal setupServer implementation for tests.
 * 
 * NOTE: This mock doesn't actually intercept HTTP requests. Tests using MSW
 * will need to be refactored to use axios-mock-adapter or similar.
 * For now, tests that depend on MSW will be skipped.
 */

// Type definition for handler
interface MockHandler {
  method: string;
  path: string | RegExp;
  resolver: () => unknown;
}

// Store handlers
let handlers: MockHandler[] = [];

export const setupServer = (...initialHandlers: MockHandler[]) => {
  handlers = initialHandlers;
  
  return {
    listen: jest.fn(() => {
      // MSW v2 is not compatible with Jest - tests using this mock
      // should be skipped or refactored to use axios-mock-adapter
      console.warn('MSW mock: listen() called but HTTP interception is not available');
    }),
    close: jest.fn(),
    resetHandlers: jest.fn((...newHandlers: MockHandler[]) => {
      if (newHandlers.length > 0) {
        handlers = newHandlers;
      }
    }),
    use: jest.fn((...additionalHandlers: MockHandler[]) => {
      handlers = [...handlers, ...additionalHandlers];
    }),
    restoreHandlers: jest.fn(),
    listHandlers: jest.fn(() => handlers),
  };
};
