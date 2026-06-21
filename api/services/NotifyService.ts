import type { Response } from 'express';
import type { SSESubscriptionRule, SSEEventType, EventSeverity, LogType } from '../../shared/types.js';

interface SSEClient {
  id: string;
  res: Response;
  connectedAt: string;
  subscriptionRules: SSESubscriptionRule[];
}

export class NotifyService {
  private clients: Map<string, SSEClient> = new Map();

  addClient(id: string, res: Response, rules: SSESubscriptionRule[] = []): void {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      'Access-Control-Allow-Origin': '*',
    });

    const connectEvent = {
      type: 'connected' as SSEEventType,
      clientId: id,
      timestamp: new Date().toISOString(),
    };
    res.write(`data: ${JSON.stringify(connectEvent)}\n\n`);

    this.clients.set(id, {
      id,
      res,
      connectedAt: new Date().toISOString(),
      subscriptionRules: rules,
    });

    res.on('close', () => {
      this.clients.delete(id);
    });
  }

  setSubscriptionRules(clientId: string, rules: SSESubscriptionRule[]): boolean {
    const client = this.clients.get(clientId);
    if (!client) return false;

    client.subscriptionRules = rules;
    return true;
  }

  getSubscriptionRules(clientId: string): SSESubscriptionRule[] | null {
    const client = this.clients.get(clientId);
    return client ? client.subscriptionRules : null;
  }

  private matchEvent(client: SSEClient, event: Record<string, unknown>): boolean {
    const enabledRules = client.subscriptionRules.filter(r => r.enabled);
    if (enabledRules.length === 0) return true;

    return enabledRules.some(rule => this.matchRule(event, rule));
  }

  private matchRule(event: Record<string, unknown>, rule: SSESubscriptionRule): boolean {
    if (rule.eventTypes && rule.eventTypes.length > 0) {
      if (!rule.eventTypes.includes(event.type as SSEEventType)) return false;
    }

    if (rule.projects && rule.projects.length > 0) {
      const project = event.project as string | undefined;
      if (!project || !rule.projects.includes(project)) return false;
    }

    if (rule.environments && rule.environments.length > 0) {
      const environment = event.environment as string | undefined;
      if (!environment || !rule.environments.includes(environment)) return false;
    }

    if (rule.severity && rule.severity.length > 0) {
      const severity = event.severity as EventSeverity | undefined;
      if (!severity || !rule.severity.includes(severity)) return false;
    }

    if (rule.clientIds && rule.clientIds.length > 0) {
      const clientId = event.clientId as string | undefined;
      if (!clientId || !rule.clientIds.includes(clientId)) return false;
    }

    if (rule.keywords && rule.keywords.length > 0) {
      const eventText = `${event.detail || ''} ${event.type} ${event.project || ''} ${event.environment || ''} ${event.clientName || ''}`.toLowerCase();
      const hasMatch = rule.keywords.some(keyword =>
        eventText.includes(keyword.toLowerCase())
      );
      if (!hasMatch) return false;
    }

    return true;
  }

  private sendEvent(client: SSEClient, event: Record<string, unknown>): void {
    if (!this.matchEvent(client, event)) return;

    try {
      client.res.write(`data: ${JSON.stringify(event)}\n\n`);
    } catch {
      this.clients.delete(client.id);
    }
  }

  private broadcast(event: Record<string, unknown>, targetClientId?: string): void {
    const message = {
      ...event,
      timestamp: new Date().toISOString(),
    };

    for (const [, client] of this.clients) {
      if (!targetClientId || targetClientId === client.id || targetClientId === 'all') {
        this.sendEvent(client, message);
      }
    }
  }

  notifyChange(project: string, environment: string, changedKeys: string[]): void {
    const event = {
      type: 'config_changed' as SSEEventType,
      severity: 'info' as EventSeverity,
      project,
      environment,
      changedKeys,
      detail: `配置变更: ${changedKeys.join(', ')}`,
    };
    this.broadcast(event);
  }

  notifyRefresh(targetClientId?: string): void {
    const event = {
      type: 'refresh' as SSEEventType,
      severity: 'info' as EventSeverity,
      targetClient: targetClientId || 'all',
    };
    this.broadcast(event, targetClientId);
  }

  notifyLogCreated(
    logType: LogType,
    project: string,
    environment: string,
    clientName: string,
    detail: string,
    severity: EventSeverity = 'info'
  ): void {
    const event = {
      type: 'log_created' as SSEEventType,
      severity,
      logType,
      project,
      environment,
      clientName,
      detail,
    };
    this.broadcast(event);
  }

  notifyClientOnline(clientId: string, clientName: string, clientIp: string): void {
    const event = {
      type: 'client_online' as SSEEventType,
      severity: 'info' as EventSeverity,
      clientId,
      clientName,
      detail: `客户端 ${clientName} (${clientIp}) 已上线`,
    };
    this.broadcast(event);
  }

  notifyClientOffline(clientId: string, clientName: string): void {
    const event = {
      type: 'client_offline' as SSEEventType,
      severity: 'warning' as EventSeverity,
      clientId,
      clientName,
      detail: `客户端 ${clientName} 已离线`,
    };
    this.broadcast(event);
  }

  notifyError(errorType: string, detail: string, project?: string, environment?: string): void {
    const event = {
      type: 'error' as SSEEventType,
      severity: 'error' as EventSeverity,
      errorType,
      project,
      environment,
      detail,
    };
    this.broadcast(event);
  }

  notifySystem(message: string, severity: EventSeverity = 'info'): void {
    const event = {
      type: 'system' as SSEEventType,
      severity,
      detail: message,
    };
    this.broadcast(event);
  }

  getConnectedClients(): Array<{ id: string; connectedAt: string; ruleCount: number }> {
    return Array.from(this.clients.values()).map((c) => ({
      id: c.id,
      connectedAt: c.connectedAt,
      ruleCount: c.subscriptionRules.filter(r => r.enabled).length,
    }));
  }

  getClientCount(): number {
    return this.clients.size;
  }

  getFilterStats(): { totalClients: number; activeRules: number; eventsFiltered: number } {
    const activeRules = Array.from(this.clients.values()).reduce(
      (sum, c) => sum + c.subscriptionRules.filter(r => r.enabled).length,
      0
    );
    return {
      totalClients: this.clients.size,
      activeRules,
      eventsFiltered: 0,
    };
  }
}

export const notifyService = new NotifyService();
