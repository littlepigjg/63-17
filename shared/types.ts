export interface ConfigItem {
  key: string;
  value: string;
  description: string;
  encrypted: boolean;
  iv?: string;
  tag?: string;
  updatedAt: string;
  updatedBy: string;
}

export interface Environment {
  name: string;
  configs: ConfigItem[];
}

export interface Project {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  updatedAt: string;
  environments: Environment[];
}

export interface LogEntry {
  id: string;
  timestamp: string;
  type: 'pull' | 'change' | 'encrypt' | 'decrypt' | 'client_register' | 'notify';
  clientIp: string;
  clientName: string;
  project: string;
  environment: string;
  detail: string;
}

export interface ClientInfo {
  id: string;
  name: string;
  ip: string;
  token: string;
  lastHeartbeat: string;
  online: boolean;
}

export interface ConfigData {
  encryptionKey: string;
  projects: Project[];
}

export interface LogsData {
  logs: LogEntry[];
}

export interface ClientsData {
  clients: ClientInfo[];
}

export interface PullResponse {
  configs: Record<string, string>;
  version: string;
  pulledAt: string;
}

export type LogType = LogEntry['type'];

export type EventSeverity = 'info' | 'warning' | 'error' | 'critical';

export type SSEEventType =
  | 'connected'
  | 'config_changed'
  | 'refresh'
  | 'log_created'
  | 'client_online'
  | 'client_offline'
  | 'error'
  | 'system';

export interface SSESubscriptionRule {
  id: string;
  name: string;
  enabled: boolean;
  eventTypes?: SSEEventType[];
  projects?: string[];
  environments?: string[];
  severity?: EventSeverity[];
  clientIds?: string[];
  keywords?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface SSEEventMessage {
  type: SSEEventType;
  project?: string;
  environment?: string;
  changedKeys?: string[];
  targetClient?: string;
  severity?: EventSeverity;
  clientId?: string;
  clientName?: string;
  logId?: string;
  logType?: LogType;
  detail?: string;
  timestamp: string;
  [key: string]: unknown;
}
