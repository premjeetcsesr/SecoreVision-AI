import '@testing-library/jest-dom';

// Setup browser extension mock APIs for Vitest / Node test runner
const storageMock = (() => {
  let store: Record<string, unknown> = {};
  return {
    get: (keys: string | string[] | Record<string, unknown>, callback?: (items: Record<string, unknown>) => void) => {
      const result: Record<string, unknown> = {};
      if (typeof keys === 'string') {
        result[keys] = store[keys];
      } else if (Array.isArray(keys)) {
        keys.forEach((k) => {
          result[k] = store[k];
        });
      } else {
        Object.keys(keys).forEach((k) => {
          result[k] = store[k] ?? keys[k];
        });
      }
      if (callback) callback(result);
      return Promise.resolve(result);
    },
    set: (items: Record<string, unknown>, callback?: () => void) => {
      store = { ...store, ...items };
      if (callback) callback();
      return Promise.resolve();
    },
    clear: () => {
      store = {};
    },
  };
})();

// Assign chrome mock
(globalThis as unknown as { chrome: unknown }).chrome = {
  runtime: {
    sendMessage: (_message: unknown, callback?: (response: unknown) => void) => {
      if (callback) callback({ success: true });
      return Promise.resolve({ success: true });
    },
    onMessage: {
      addListener: () => {},
      removeListener: () => {},
    },
    getURL: (path: string) => `chrome-extension://mock-id/${path}`,
  },
  storage: {
    local: storageMock,
    sync: storageMock,
  },
  tabs: {
    query: (_queryInfo: unknown, callback?: (tabs: unknown[]) => void) => {
      const mockTabs = [
        {
          id: 1,
          url: 'https://checkout.secure-bank.example/portal/payment',
          title: 'Secure Checkout Portal',
        },
      ];
      if (callback) callback(mockTabs);
      return Promise.resolve(mockTabs);
    },
    create: (_createProperties: unknown) => Promise.resolve({ id: 2 }),
  },
} as any;
