import { ExtensionSettings, PrivacyShieldStatus, SensitiveItem, Task, TabInfo } from '../types';

export const MOCK_TAB_INFO: TabInfo = {
  url: '',
  title: 'Active Tab',
  domain: 'Active Webpage',
  isSecure: true,
  sensitiveFieldCount: 0,
};

export const MOCK_SENSITIVE_ITEMS: SensitiveItem[] = [];

export const MOCK_TASKS: Task[] = [];

export const MOCK_SHIELD_STATUS: PrivacyShieldStatus = {
  isActive: true,
  mode: 'strict',
  hardwareAcceleration: 'webgpu',
  hardwareStatus: 'active',
  detectedItemsCount: 0,
  rawBytesTransmitted: 0,
  lastScanTimestamp: 'Ready',
  localLatencyMs: 0,
};

export const MOCK_SETTINGS: ExtensionSettings = {
  selectedModel: 'Google Gemini 2.5 Flash (via FastAPI Gateway)',
  hardwareEngine: 'webgpu',
  privacyMode: 'strict',
  serverEndpoint: 'http://127.0.0.1:8000',
  autoRedactFinancial: true,
  autoRedactAuth: true,
  autoRedactPii: true,
  autoRedactFaces: true,
  redactionStyle: 'blur',
  requireApprovalForClicks: true,
  requireApprovalForNavigation: true,
};
