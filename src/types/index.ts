export type PrivacyMode = 'strict' | 'balanced' | 'audit';
export type HardwareEngine = 'webgpu' | 'wasm';
export type SensitiveCategory = 'financial' | 'auth' | 'pii' | 'medical' | 'custom';
export type RedactionMethod = 'blur' | 'blackout' | 'hash' | 'tokenize';

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface SensitiveItem {
  id: string;
  category: SensitiveCategory;
  label: string;
  originalPreview: string;
  redactedPreview: string;
  redactionMethod: RedactionMethod;
  confidence: number;
  isRedacted: boolean;
  boundingBox: BoundingBox;
  domSelector?: string;
}

export type TaskStatus = 
  | 'idle' 
  | 'scanning' 
  | 'redacting' 
  | 'planning' 
  | 'waiting_approval' 
  | 'executing' 
  | 'completed' 
  | 'failed' 
  | 'paused';

export type ActionType = 'read' | 'click' | 'type' | 'navigate' | 'scroll';
export type PrivacyRisk = 'safe' | 'low' | 'high';
export type ActionExecutionStatus = 'pending' | 'in_progress' | 'completed' | 'blocked';

export interface TaskAction {
  id: string;
  stepNumber: number;
  type: ActionType;
  description: string;
  targetElement?: string;
  requiresApproval: boolean;
  isApproved: boolean;
  status: ActionExecutionStatus;
  privacyRisk: PrivacyRisk;
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  level: 'info' | 'shield' | 'warning' | 'alert';
  message: string;
  detail?: string;
}

export interface Task {
  id: string;
  title: string;
  prompt: string;
  status: TaskStatus;
  pageUrl: string;
  pageDomain: string;
  startedAt: string;
  completedAt?: string;
  actions: TaskAction[];
  sensitiveItems: SensitiveItem[];
  auditLogs: AuditLogEntry[];
  privacyScore: number;
}

export interface PrivacyShieldStatus {
  isActive: boolean;
  mode: PrivacyMode;
  hardwareAcceleration: HardwareEngine;
  hardwareStatus: 'active' | 'fallback' | 'unsupported';
  detectedItemsCount: number;
  rawBytesTransmitted: number;
  lastScanTimestamp: string;
  localLatencyMs: number;
}

export interface ExtensionSettings {
  selectedModel: string;
  hardwareEngine: HardwareEngine;
  privacyMode: PrivacyMode;
  serverEndpoint: string;
  autoRedactFinancial: boolean;
  autoRedactAuth: boolean;
  autoRedactPii: boolean;
  autoRedactFaces: boolean;
  redactionStyle: RedactionMethod;
  requireApprovalForClicks: boolean;
  requireApprovalForNavigation: boolean;
}

export interface TabInfo {
  id?: number;
  url: string;
  title: string;
  domain: string;
  isSecure: boolean;
  sensitiveFieldCount: number;
}
