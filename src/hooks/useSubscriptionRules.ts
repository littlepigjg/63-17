import { useState, useEffect, useCallback } from 'react';
import { sseManager } from './sseManager';
import type { SSESubscriptionRule, SSEEventType, EventSeverity } from './types';

export function useSubscriptionRules() {
  const [rules, setRules] = useState<SSESubscriptionRule[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    setRules(sseManager.getSubscriptionRules());
    setIsInitialized(true);
  }, []);

  const refreshRules = useCallback(() => {
    setRules(sseManager.getSubscriptionRules());
  }, []);

  const addRule = useCallback((rule: Omit<SSESubscriptionRule, 'id' | 'createdAt' | 'updatedAt'>) => {
    const newRule = sseManager.addSubscriptionRule(rule);
    refreshRules();
    return newRule;
  }, [refreshRules]);

  const updateRule = useCallback((id: string, updates: Partial<Omit<SSESubscriptionRule, 'id' | 'createdAt'>>) => {
    const success = sseManager.updateSubscriptionRule(id, updates);
    if (success) {
      refreshRules();
    }
    return success;
  }, [refreshRules]);

  const deleteRule = useCallback((id: string) => {
    const success = sseManager.deleteSubscriptionRule(id);
    if (success) {
      refreshRules();
    }
    return success;
  }, [refreshRules]);

  const toggleRule = useCallback((id: string) => {
    const success = sseManager.toggleRuleEnabled(id);
    if (success) {
      refreshRules();
    }
    return success;
  }, [refreshRules]);

  const setAllRules = useCallback((newRules: SSESubscriptionRule[]) => {
    sseManager.setSubscriptionRules(newRules);
    refreshRules();
  }, [refreshRules]);

  const clearAllRules = useCallback(() => {
    sseManager.clearAllRules();
    refreshRules();
  }, [refreshRules]);

  const resetToDefaults = useCallback(() => {
    sseManager.resetToDefaults();
    refreshRules();
  }, [refreshRules]);

  const exportRules = useCallback(() => {
    return sseManager.exportRules();
  }, []);

  const importRules = useCallback((jsonString: string) => {
    const success = sseManager.importRules(jsonString);
    if (success) {
      refreshRules();
    }
    return success;
  }, [refreshRules]);

  const enabledRulesCount = rules.filter(r => r.enabled).length;
  const totalRulesCount = rules.length;

  return {
    rules,
    isInitialized,
    addRule,
    updateRule,
    deleteRule,
    toggleRule,
    setAllRules,
    clearAllRules,
    resetToDefaults,
    exportRules,
    importRules,
    enabledRulesCount,
    totalRulesCount,
    refreshRules,
  };
}

export const EVENT_TYPE_OPTIONS: Array<{ value: SSEEventType; label: string }> = [
  { value: 'connected', label: '连接成功' },
  { value: 'config_changed', label: '配置变更' },
  { value: 'refresh', label: '刷新通知' },
  { value: 'log_created', label: '日志创建' },
  { value: 'client_online', label: '客户端上线' },
  { value: 'client_offline', label: '客户端离线' },
  { value: 'error', label: '错误事件' },
  { value: 'system', label: '系统通知' },
];

export const SEVERITY_OPTIONS: Array<{ value: EventSeverity; label: string; color: string }> = [
  { value: 'info', label: '信息', color: 'bg-blue-500/20 text-blue-400' },
  { value: 'warning', label: '警告', color: 'bg-amber-500/20 text-amber-400' },
  { value: 'error', label: '错误', color: 'bg-rose-500/20 text-rose-400' },
  { value: 'critical', label: '严重', color: 'bg-red-600/30 text-red-400' },
];

export const ENVIRONMENT_OPTIONS = [
  { value: 'development', label: '开发环境' },
  { value: 'testing', label: '测试环境' },
  { value: 'production', label: '生产环境' },
];
