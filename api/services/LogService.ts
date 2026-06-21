import { logRepository } from '../repositories/LogRepository.js';
import crypto from 'crypto';
import type { LogEntry, LogType, EventSeverity } from '../../shared/types.js';
import { notifyService } from './NotifyService.js';

export class LogService {
  private getSeverityForLogType(type: LogType): EventSeverity {
    const severityMap: Record<string, EventSeverity> = {
      pull: 'info',
      change: 'info',
      encrypt: 'info',
      decrypt: 'info',
      client_register: 'info',
      notify: 'info',
    };
    return severityMap[type] || 'info';
  }

  async addLog(type: LogType, clientIp: string, clientName: string, project: string, environment: string, detail: string): Promise<LogEntry> {
    const entry: LogEntry = {
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      type,
      clientIp,
      clientName,
      project,
      environment,
      detail,
    };

    const savedEntry = await logRepository.addLog(entry);

    try {
      const severity = this.getSeverityForLogType(type);
      notifyService.notifyLogCreated(
        type,
        project,
        environment,
        clientName,
        detail,
        severity
      );
    } catch {
      // Ignore SSE notification errors
    }

    return savedEntry;
  }

  async getLogs(filters?: { type?: string; project?: string; from?: string; to?: string; limit?: number; offset?: number }) {
    return logRepository.getLogs(filters);
  }

  async getRecentLogs(count: number = 10) {
    return logRepository.getRecentLogs(count);
  }
}

export const logService = new LogService();
