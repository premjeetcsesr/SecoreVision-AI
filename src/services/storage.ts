import { ExtensionSettings, PrivacyShieldStatus, SensitiveItem, Task, TabInfo } from '../types';

export const DEFAULT_SETTINGS: ExtensionSettings = {
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

export const DEFAULT_SHIELD_STATUS: PrivacyShieldStatus = {
  isActive: true,
  mode: 'strict',
  hardwareAcceleration: 'webgpu',
  hardwareStatus: 'active',
  detectedItemsCount: 0,
  rawBytesTransmitted: 0,
  lastScanTimestamp: 'Ready',
  localLatencyMs: 0,
};

export const DEFAULT_TAB_INFO: TabInfo = {
  url: '',
  title: 'Active Tab',
  domain: 'Current Browser Tab',
  isSecure: true,
  sensitiveFieldCount: 0,
};

const isExtension = typeof chrome !== 'undefined' && Boolean(chrome.storage?.local);

export async function getStoredSettings(): Promise<ExtensionSettings> {
  if (isExtension) {
    return new Promise((resolve) => {
      chrome.storage.local.get(['settings'], (res) => {
        resolve((res.settings as ExtensionSettings) || DEFAULT_SETTINGS);
      });
    });
  }
  try {
    const raw = localStorage.getItem('sv_settings');
    return raw ? JSON.parse(raw) : DEFAULT_SETTINGS;
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export async function saveStoredSettings(settings: ExtensionSettings): Promise<void> {
  if (isExtension) {
    return new Promise((resolve) => {
      chrome.storage.local.set({ settings }, () => resolve());
    });
  }
  try {
    localStorage.setItem('sv_settings', JSON.stringify(settings));
  } catch {
    // Ignore storage quota
  }
}

export async function getStoredShieldStatus(): Promise<PrivacyShieldStatus> {
  if (isExtension) {
    return new Promise((resolve) => {
      chrome.storage.local.get(['shieldStatus'], (res) => {
        resolve((res.shieldStatus as PrivacyShieldStatus) || DEFAULT_SHIELD_STATUS);
      });
    });
  }
  try {
    const raw = localStorage.getItem('sv_shield_status');
    return raw ? JSON.parse(raw) : DEFAULT_SHIELD_STATUS;
  } catch {
    return DEFAULT_SHIELD_STATUS;
  }
}

export async function saveStoredShieldStatus(shieldStatus: PrivacyShieldStatus): Promise<void> {
  if (isExtension) {
    return new Promise((resolve) => {
      chrome.storage.local.set({ shieldStatus }, () => resolve());
    });
  }
  try {
    localStorage.setItem('sv_shield_status', JSON.stringify(shieldStatus));
  } catch {
    // Ignore storage quota
  }
}

export async function getStoredTasks(): Promise<Task[]> {
  if (isExtension) {
    return new Promise((resolve) => {
      chrome.storage.local.get(['tasks'], (res) => {
        resolve((res.tasks as Task[]) || []);
      });
    });
  }
  try {
    const raw = localStorage.getItem('sv_tasks');
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export async function saveStoredTask(task: Task): Promise<void> {
  const current = await getStoredTasks();
  const exists = current.findIndex((t) => t.id === task.id);
  const updated = exists >= 0 ? current.map((t) => (t.id === task.id ? task : t)) : [task, ...current];

  if (isExtension) {
    return new Promise((resolve) => {
      chrome.storage.local.set({ tasks: updated }, () => resolve());
    });
  }
  try {
    localStorage.setItem('sv_tasks', JSON.stringify(updated));
  } catch {
    // Ignore storage quota
  }
}

export async function updateStoredTasks(updater: (tasks: Task[]) => Task[]): Promise<Task[]> {
  const current = await getStoredTasks();
  const updated = updater(current);
  if (isExtension) {
    await new Promise<void>((resolve) => {
      chrome.storage.local.set({ tasks: updated }, () => resolve());
    });
  } else {
    try {
      localStorage.setItem('sv_tasks', JSON.stringify(updated));
    } catch {
      // Ignore
    }
  }
  return updated;
}

export async function getStoredSensitiveItems(): Promise<SensitiveItem[]> {
  if (isExtension) {
    return new Promise((resolve) => {
      chrome.storage.local.get(['sensitiveItems'], (res) => {
        resolve((res.sensitiveItems as SensitiveItem[]) || []);
      });
    });
  }
  try {
    const raw = localStorage.getItem('sv_sensitive_items');
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export async function saveStoredSensitiveItems(items: SensitiveItem[]): Promise<void> {
  if (isExtension) {
    return new Promise((resolve) => {
      chrome.storage.local.set({ sensitiveItems: items }, () => resolve());
    });
  }
  try {
    localStorage.setItem('sv_sensitive_items', JSON.stringify(items));
  } catch {
    // Ignore storage quota
  }
}
