import type { SSEEvent, SSEListener, SSESubscriptionRule } from './types';
import { matchAnyRule } from './types';

const STORAGE_KEY = 'sse_subscription_rules';
const CLIENT_ID_KEY = 'sse_client_id';

class SSEManager {
  private eventSource: EventSource | null = null;
  private listeners: Map<string, SSEListener> = new Map();
  private reconnectTimer: number | null = null;
  private url: string;
  private reconnectDelay: number = 3000;
  private isConnecting: boolean = false;
  private clientId: string | null = null;
  private subscriptionRules: SSESubscriptionRule[] = [];
  private enableServerFilter: boolean = true;
  private enableClientFilter: boolean = true;

  constructor() {
    if (import.meta.env.DEV) {
      this.url = 'http://localhost:3001/api/events';
    } else {
      const baseUrl = import.meta.env.VITE_API_BASE_URL || '';
      this.url = baseUrl ? `${baseUrl}/api/events` : '/api/events';
    }

    this.loadRulesFromStorage();
    this.loadClientIdFromStorage();
  }

  private loadRulesFromStorage(): void {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        this.subscriptionRules = JSON.parse(stored);
      }
    } catch {
      this.subscriptionRules = [];
    }
  }

  private saveRulesToStorage(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.subscriptionRules));
    } catch {
      console.error('Failed to save subscription rules to localStorage');
    }
  }

  private loadClientIdFromStorage(): void {
    try {
      const stored = localStorage.getItem(CLIENT_ID_KEY);
      if (stored) {
        this.clientId = stored;
      }
    } catch {
      this.clientId = null;
    }
  }

  private saveClientIdToStorage(): void {
    try {
      if (this.clientId) {
        localStorage.setItem(CLIENT_ID_KEY, this.clientId);
      }
    } catch {
      console.error('Failed to save client ID to localStorage');
    }
  }

  private buildUrl(): string {
    const url = new URL(this.url, window.location.origin);
    return url.toString();
  }

  private getRulesHeader(): Record<string, string> {
    if (!this.enableServerFilter || this.subscriptionRules.length === 0) {
      return {};
    }
    try {
      const rulesStr = encodeURIComponent(JSON.stringify(this.subscriptionRules));
      return { 'X-SSE-Rules': rulesStr };
    } catch {
      return {};
    }
  }

  connect(): void {
    if (this.eventSource || this.isConnecting) return;

    this.isConnecting = true;

    try {
      const url = this.buildUrl();
      const eventSourceInitDict: EventSourceInit = {
        withCredentials: true,
      };

      const eventSource = new EventSource(url, eventSourceInitDict);
      this.eventSource = eventSource;

      eventSource.onmessage = (event: MessageEvent) => {
        try {
          const data: SSEEvent = JSON.parse(event.data);

          if (data.type === 'connected' && data.clientId) {
            this.clientId = data.clientId as string;
            this.saveClientIdToStorage();
          }

          if (this.enableClientFilter && !matchAnyRule(data, this.subscriptionRules)) {
            return;
          }

          this.emit(data);
        } catch {
          console.error('Failed to parse SSE message');
        }
      };

      eventSource.onerror = () => {
        this.disconnect();
        this.scheduleReconnect();
      };

      eventSource.onopen = () => {
        this.isConnecting = false;
      };
    } catch {
      this.isConnecting = false;
      this.scheduleReconnect();
    }
  }

  disconnect(): void {
    if (this.reconnectTimer) {
      window.clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }

    this.isConnecting = false;
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) {
      window.clearTimeout(this.reconnectTimer);
    }
    this.reconnectTimer = window.setTimeout(() => {
      this.connect();
    }, this.reconnectDelay);
  }

  subscribe(id: string, listener: SSEListener): () => void {
    this.listeners.set(id, listener);

    if (!this.eventSource) {
      this.connect();
    }

    return () => {
      this.listeners.delete(id);
      if (this.listeners.size === 0) {
        this.disconnect();
      }
    };
  }

  private emit(event: SSEEvent): void {
    for (const listener of this.listeners.values()) {
      try {
        listener(event);
      } catch (err) {
        console.error('SSE listener error:', err);
      }
    }
  }

  isConnected(): boolean {
    return this.eventSource !== null && this.eventSource.readyState === EventSource.OPEN;
  }

  getListenerCount(): number {
    return this.listeners.size;
  }

  getClientId(): string | null {
    return this.clientId;
  }

  getSubscriptionRules(): SSESubscriptionRule[] {
    return [...this.subscriptionRules];
  }

  setSubscriptionRules(rules: SSESubscriptionRule[]): void {
    this.subscriptionRules = rules;
    this.saveRulesToStorage();
    this.syncRulesToServer();
  }

  addSubscriptionRule(rule: Omit<SSESubscriptionRule, 'id' | 'createdAt' | 'updatedAt'>): SSESubscriptionRule {
    const newRule: SSESubscriptionRule = {
      ...rule,
      id: `rule_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.subscriptionRules.push(newRule);
    this.saveRulesToStorage();
    this.syncRulesToServer();
    return newRule;
  }

  updateSubscriptionRule(id: string, updates: Partial<Omit<SSESubscriptionRule, 'id' | 'createdAt'>>): boolean {
    const index = this.subscriptionRules.findIndex(r => r.id === id);
    if (index === -1) return false;

    this.subscriptionRules[index] = {
      ...this.subscriptionRules[index],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    this.saveRulesToStorage();
    this.syncRulesToServer();
    return true;
  }

  deleteSubscriptionRule(id: string): boolean {
    const index = this.subscriptionRules.findIndex(r => r.id === id);
    if (index === -1) return false;

    this.subscriptionRules.splice(index, 1);
    this.saveRulesToStorage();
    this.syncRulesToServer();
    return true;
  }

  toggleRuleEnabled(id: string): boolean {
    const rule = this.subscriptionRules.find(r => r.id === id);
    if (!rule) return false;

    rule.enabled = !rule.enabled;
    rule.updatedAt = new Date().toISOString();
    this.saveRulesToStorage();
    this.syncRulesToServer();
    return true;
  }

  private async syncRulesToServer(): Promise<void> {
    if (!this.clientId || !this.enableServerFilter) return;

    try {
      const baseUrl = import.meta.env.DEV
        ? 'http://localhost:3001'
        : import.meta.env.VITE_API_BASE_URL || '';

      await fetch(`${baseUrl}/api/events/${this.clientId}/rules`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ rules: this.subscriptionRules }),
      });
    } catch {
      console.error('Failed to sync rules to server');
    }
  }

  setServerFilterEnabled(enabled: boolean): void {
    this.enableServerFilter = enabled;
  }

  setClientFilterEnabled(enabled: boolean): void {
    this.enableClientFilter = enabled;
  }

  getFilterSettings(): { serverFilter: boolean; clientFilter: boolean } {
    return {
      serverFilter: this.enableServerFilter,
      clientFilter: this.enableClientFilter,
    };
  }

  clearAllRules(): void {
    this.subscriptionRules = [];
    this.saveRulesToStorage();
    this.syncRulesToServer();
  }

  exportRules(): string {
    return JSON.stringify(this.subscriptionRules, null, 2);
  }

  importRules(jsonString: string): boolean {
    try {
      const rules = JSON.parse(jsonString);
      if (!Array.isArray(rules)) return false;

      const validRules = rules.filter(r =>
        r && typeof r === 'object' &&
        typeof r.name === 'string' &&
        typeof r.enabled === 'boolean'
      );

      this.subscriptionRules = validRules.map((r, index) => ({
        ...r,
        id: r.id || `rule_imported_${Date.now()}_${index}`,
        createdAt: r.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }));

      this.saveRulesToStorage();
      this.syncRulesToServer();
      return true;
    } catch {
      return false;
    }
  }

  getDefaultRules(): SSESubscriptionRule[] {
    return [
      {
        id: 'default_errors',
        name: '错误日志',
        enabled: false,
        eventTypes: ['error', 'log_created'],
        severity: ['error', 'critical'],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'default_config',
        name: '配置变更',
        enabled: true,
        eventTypes: ['config_changed'],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      {
        id: 'default_client',
        name: '客户端状态',
        enabled: true,
        eventTypes: ['client_online', 'client_offline'],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];
  }

  resetToDefaults(): void {
    this.subscriptionRules = this.getDefaultRules();
    this.saveRulesToStorage();
    this.syncRulesToServer();
  }
}

export const sseManager = new SSEManager();
