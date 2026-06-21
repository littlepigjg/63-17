import type { SSEEventType, SSESubscriptionRule, EventSeverity, SSEEventMessage } from '../../shared/types';

export type { SSEEventType, SSESubscriptionRule, EventSeverity, SSEEventMessage };

export interface SSEEvent {
  type: string;
  project?: string;
  environment?: string;
  changedKeys?: string[];
  targetClient?: string;
  severity?: EventSeverity;
  clientId?: string;
  clientName?: string;
  logId?: string;
  logType?: string;
  detail?: string;
  timestamp: string;
  [key: string]: unknown;
}

export type SSEListener = (event: SSEEvent) => void;

export interface SSEFilter {
  project?: string | null;
  environment?: string | null;
  eventTypes?: string[];
  severity?: EventSeverity[];
  keywords?: string[];
}

export function matchSSEEvent(event: SSEEvent, filter: SSEFilter): boolean {
  if (filter.eventTypes && filter.eventTypes.length > 0) {
    if (!filter.eventTypes.includes(event.type)) return false;
  }

  if (filter.project !== undefined && filter.project !== null) {
    if (event.project !== filter.project) return false;
  }

  if (filter.environment !== undefined && filter.environment !== null) {
    if (event.environment !== filter.environment) return false;
  }

  if (filter.severity && filter.severity.length > 0) {
    if (!event.severity || !filter.severity.includes(event.severity)) return false;
  }

  if (filter.keywords && filter.keywords.length > 0) {
    const eventText = `${event.detail || ''} ${event.type} ${event.project || ''} ${event.environment || ''}`.toLowerCase();
    const hasMatch = filter.keywords.some(keyword =>
      eventText.includes(keyword.toLowerCase())
    );
    if (!hasMatch) return false;
  }

  return true;
}

export function matchSubscriptionRule(event: SSEEvent, rule: SSESubscriptionRule): boolean {
  if (!rule.enabled) return false;

  if (rule.eventTypes && rule.eventTypes.length > 0) {
    if (!rule.eventTypes.includes(event.type as SSEEventType)) return false;
  }

  if (rule.projects && rule.projects.length > 0) {
    if (!event.project || !rule.projects.includes(event.project)) return false;
  }

  if (rule.environments && rule.environments.length > 0) {
    if (!event.environment || !rule.environments.includes(event.environment)) return false;
  }

  if (rule.severity && rule.severity.length > 0) {
    if (!event.severity || !rule.severity.includes(event.severity)) return false;
  }

  if (rule.clientIds && rule.clientIds.length > 0) {
    if (!event.clientId || !rule.clientIds.includes(event.clientId)) return false;
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

export function matchAnyRule(event: SSEEvent, rules: SSESubscriptionRule[]): boolean {
  const enabledRules = rules.filter(r => r.enabled);
  if (enabledRules.length === 0) return true;
  return enabledRules.some(rule => matchSubscriptionRule(event, rule));
}

export function mergeFilters(filters: SSEFilter[], rules: SSESubscriptionRule[]): SSEFilter {
  const merged: SSEFilter = {};

  const allEventTypes = new Set<string>();
  const allProjects = new Set<string>();
  const allEnvironments = new Set<string>();
  const allSeverity = new Set<EventSeverity>();
  const allKeywords = new Set<string>();

  filters.forEach(f => {
    f.eventTypes?.forEach(t => allEventTypes.add(t));
    if (f.project) allProjects.add(f.project);
    if (f.environment) allEnvironments.add(f.environment);
    f.severity?.forEach(s => allSeverity.add(s));
    f.keywords?.forEach(k => allKeywords.add(k));
  });

  rules.filter(r => r.enabled).forEach(r => {
    r.eventTypes?.forEach(t => allEventTypes.add(t));
    r.projects?.forEach(p => allProjects.add(p));
    r.environments?.forEach(e => allEnvironments.add(e));
    r.severity?.forEach(s => allSeverity.add(s));
    r.keywords?.forEach(k => allKeywords.add(k));
  });

  if (allEventTypes.size > 0) merged.eventTypes = Array.from(allEventTypes);
  if (allProjects.size === 1) merged.project = Array.from(allProjects)[0];
  if (allEnvironments.size === 1) merged.environment = Array.from(allEnvironments)[0];
  if (allSeverity.size > 0) merged.severity = Array.from(allSeverity);
  if (allKeywords.size > 0) merged.keywords = Array.from(allKeywords);

  return merged;
}
