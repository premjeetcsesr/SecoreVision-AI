import { ExtensionSettings } from './index';

export type MessageType =
  | 'GET_STATUS'
  | 'STATUS_RESPONSE'
  | 'START_TASK'
  | 'STOP_TASK'
  | 'APPROVE_ACTION'
  | 'REDACT_ITEM_TOGGLE'
  | 'GET_TAB_INFO'
  | 'TAB_INFO_RESPONSE'
  | 'UPDATE_SETTINGS'
  | 'SETTINGS_UPDATED';

export interface BaseMessage {
  type: MessageType;
}

export interface GetStatusMessage extends BaseMessage {
  type: 'GET_STATUS';
}

export interface StartTaskMessage extends BaseMessage {
  type: 'START_TASK';
  prompt: string;
}

export interface StopTaskMessage extends BaseMessage {
  type: 'STOP_TASK';
  taskId: string;
}

export interface ApproveActionMessage extends BaseMessage {
  type: 'APPROVE_ACTION';
  taskId: string;
  actionId: string;
}

export interface RedactItemToggleMessage extends BaseMessage {
  type: 'REDACT_ITEM_TOGGLE';
  itemId: string;
  isRedacted: boolean;
}

export interface UpdateSettingsMessage extends BaseMessage {
  type: 'UPDATE_SETTINGS';
  settings: Partial<ExtensionSettings>;
}

export type ExtensionMessage =
  | GetStatusMessage
  | StartTaskMessage
  | StopTaskMessage
  | ApproveActionMessage
  | RedactItemToggleMessage
  | UpdateSettingsMessage
  | BaseMessage;

export interface MessageResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}
