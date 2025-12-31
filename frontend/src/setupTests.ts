import '@testing-library/jest-dom';
import { TextEncoder, TextDecoder } from 'util';
import { ReadableStream, TransformStream, WritableStream } from 'stream/web';
import 'whatwg-fetch';

// Mock the config module to avoid import.meta.env issues in tests
jest.mock('./config', () => ({
  API_BASE_URL: 'http://localhost:8080'
}));

// Polyfill TextEncoder/TextDecoder for MSW in Jest
Object.assign(global, { TextEncoder, TextDecoder });

// Mock window.matchMedia for theme detection tests
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Polyfill Streams API for MSW in Jest/Node environment
Object.assign(global, { ReadableStream, TransformStream, WritableStream });

// Polyfill BroadcastChannel for MSW in Jest/Node environment
class BroadcastChannelPolyfill {
  name: string;
  onmessage: ((event: MessageEvent) => void) | null = null;
  
  constructor(name: string) {
    this.name = name;
  }
  
  postMessage(_message: unknown): void {
    // No-op for tests
  }
  
  close(): void {
    // No-op for tests
  }
  
  addEventListener(_type: string, _listener: EventListener): void {
    // No-op for tests
  }
  
  removeEventListener(_type: string, _listener: EventListener): void {
    // No-op for tests
  }
}

// @ts-ignore
global.BroadcastChannel = BroadcastChannelPolyfill;

// Polyfill AbortSignal.timeout for Node.js environments
if (!AbortSignal.timeout) {
  // @ts-ignore
  AbortSignal.timeout = (ms: number) => {
    const controller = new AbortController();
    setTimeout(() => controller.abort(), ms);
    return controller.signal;
  };
}

// Mock window.location for navigation tests
// jsdom doesn't fully support navigation, so we mock it
const mockLocation = {
  href: 'http://localhost/',
  origin: 'http://localhost',
  hostname: 'localhost',
  host: 'localhost',
  pathname: '/',
  search: '',
  hash: '',
  port: '',
  protocol: 'http:',
  assign: jest.fn(),
  replace: jest.fn(),
  reload: jest.fn(),
};

Object.defineProperty(window, 'location', {
  writable: true,
  value: mockLocation,
});

// Reset location before each test
beforeEach(() => {
  mockLocation.href = '';
  mockLocation.pathname = '/';
});