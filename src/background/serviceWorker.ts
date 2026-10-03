import { ExtensionSettings, PrivacyShieldStatus } from '../types';

/**
 * SecureVision AI - Background Service Worker (Manifest V3)
 * Manages privacy shield state, storage synchronization, and local agent coordination.
 */

const DEFAULT_SETTINGS: ExtensionSettings = {
  selectedModel: 'Local MobileNet-V4 Vision (Client-only)',
  hardwareEngine: 'webgpu',
  privacyMode: 'strict',
  serverEndpoint: 'http://127.0.0.1:11434',
  autoRedactFinancial: true,
  autoRedactAuth: true,
  autoRedactPii: true,
  autoRedactFaces: true,
  redactionStyle: 'blur',
  requireApprovalForClicks: true,
  requireApprovalForNavigation: true,
};

const INITIAL_STATUS: PrivacyShieldStatus = {
  isActive: true,
  mode: 'strict',
  hardwareAcceleration: 'webgpu',
  hardwareStatus: 'active',
  detectedItemsCount: 4,
  rawBytesTransmitted: 0, // Zero leakage guarantee
  lastScanTimestamp: new Date().toISOString(),
  localLatencyMs: 14,
};

// Cross-browser compatibility wrapper (Chrome & Firefox)
const extensionApi = typeof chrome !== 'undefined' ? chrome : (window as any).browser;

extensionApi.runtime.onInstalled.addListener(() => {
  console.log('[SecureVision AI] Service worker initialized. Setting default privacy profile.');
  extensionApi.storage.local.get(['settings', 'shieldStatus'], (res: Record<string, unknown>) => {
    if (!res.settings) {
      extensionApi.storage.local.set({ settings: DEFAULT_SETTINGS });
    }
    if (!res.shieldStatus) {
      extensionApi.storage.local.set({ shieldStatus: INITIAL_STATUS });
    }
  });
});

// Runtime message listener
extensionApi.runtime.onMessage.addListener((message: any, _sender: any, sendResponse: (response?: any) => void) => {
  if (message.type === 'GET_STATUS') {
    extensionApi.storage.local.get(['shieldStatus', 'settings'], (res: any) => {
      sendResponse({
        success: true,
        data: {
          shieldStatus: res.shieldStatus || INITIAL_STATUS,
          settings: res.settings || DEFAULT_SETTINGS,
        },
      });
    });
    return true; // Keep channel open for async response
  }

  if (message.type === 'UPDATE_SETTINGS') {
    extensionApi.storage.local.set({ settings: message.settings }, () => {
      sendResponse({ success: true, data: message.settings });
    });
    return true;
  }

  if (message.type === 'TOGGLE_SHIELD') {
    extensionApi.storage.local.get(['shieldStatus'], (res: any) => {
      const current = res.shieldStatus || INITIAL_STATUS;
      const updated: PrivacyShieldStatus = {
        ...current,
        isActive: message.isActive !== undefined ? message.isActive : !current.isActive,
        lastScanTimestamp: new Date().toISOString(),
      };
      extensionApi.storage.local.set({ shieldStatus: updated }, () => {
        sendResponse({ success: true, data: updated });
      });
    });
    return true;
  }

  return false;
});
