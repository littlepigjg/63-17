import { useState } from 'react';
import { Filter, Plus, Edit2, Trash2, Download, Upload, RotateCcw, Power, PowerOff, Info } from 'lucide-react';
import Modal from './Modal';
import RuleEditor from './RuleEditor';
import { useSubscriptionRules, EVENT_TYPE_OPTIONS, SEVERITY_OPTIONS } from '@/hooks/useSubscriptionRules';
import { sseManager } from '@/hooks/sseManager';
import type { SSESubscriptionRule } from '@/hooks/types';
import { formatTime } from '@/utils/format';

interface EventFilterModalProps {
  open: boolean;
  onClose: () => void;
}

export default function EventFilterModal({ open, onClose }: EventFilterModalProps) {
  const {
    rules,
    isInitialized,
    addRule,
    updateRule,
    deleteRule,
    toggleRule,
    clearAllRules,
    resetToDefaults,
    exportRules,
    importRules,
    enabledRulesCount,
    totalRulesCount,
  } = useSubscriptionRules();

  const [showEditor, setShowEditor] = useState(false);
  const [editingRule, setEditingRule] = useState<SSESubscriptionRule | undefined>();
  const [showImport, setShowImport] = useState(false);
  const [importText, setImportText] = useState('');
  const [importError, setImportError] = useState('');
  const [filterSettings, setFilterSettings] = useState(sseManager.getFilterSettings());

  const handleAddRule = () => {
    setEditingRule(undefined);
    setShowEditor(true);
  };

  const handleEditRule = (rule: SSESubscriptionRule) => {
    setEditingRule(rule);
    setShowEditor(true);
  };

  const handleSaveRule = (ruleData: Omit<SSESubscriptionRule, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (editingRule) {
      updateRule(editingRule.id, ruleData);
    } else {
      addRule(ruleData);
    }
    setShowEditor(false);
    setEditingRule(undefined);
  };

  const handleExport = () => {
    const json = exportRules();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sse-rules-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = () => {
    setImportError('');
    const success = importRules(importText);
    if (success) {
      setShowImport(false);
      setImportText('');
    } else {
      setImportError('导入失败，请检查 JSON 格式是否正确');
    }
  };

  const handleToggleServerFilter = () => {
    const newValue = !filterSettings.serverFilter;
    sseManager.setServerFilterEnabled(newValue);
    setFilterSettings(sseManager.getFilterSettings());
  };

  const handleToggleClientFilter = () => {
    const newValue = !filterSettings.clientFilter;
    sseManager.setClientFilterEnabled(newValue);
    setFilterSettings(sseManager.getFilterSettings());
  };

  const getRuleSummary = (rule: SSESubscriptionRule) => {
    const parts: string[] = [];
    if (rule.eventTypes?.length) {
      const labels = rule.eventTypes.map(t => EVENT_TYPE_OPTIONS.find(o => o.value === t)?.label || t);
      parts.push(labels.join(', '));
    }
    if (rule.projects?.length) {
      parts.push(`项目: ${rule.projects.join(', ')}`);
    }
    if (rule.environments?.length) {
      parts.push(`环境: ${rule.environments.join(', ')}`);
    }
    if (rule.severity?.length) {
      parts.push(`级别: ${rule.severity.join(', ')}`);
    }
    if (rule.keywords?.length) {
      parts.push(`关键词: ${rule.keywords.join(', ')}`);
    }
    return parts.length > 0 ? parts.join(' | ') : '匹配所有事件';
  };

  const getSeverityBadge = (rule: SSESubscriptionRule) => {
    if (!rule.severity || rule.severity.length === 0) return null;
    const highest = rule.severity.includes('critical') ? 'critical' :
      rule.severity.includes('error') ? 'error' :
      rule.severity.includes('warning') ? 'warning' : 'info';
    const option = SEVERITY_OPTIONS.find(o => o.value === highest);
    if (!option) return null;
    return (
      <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium ${option.color}`}>
        {option.label}
      </span>
    );
  };

  if (showEditor) {
    return (
      <Modal
        open={open}
        onClose={() => { setShowEditor(false); setEditingRule(undefined); }}
        title={editingRule ? '编辑订阅规则' : '新建订阅规则'}
      >
        <RuleEditor
          rule={editingRule}
          onSave={handleSaveRule}
          onCancel={() => { setShowEditor(false); setEditingRule(undefined); }}
        />
      </Modal>
    );
  }

  if (showImport) {
    return (
      <Modal open={open} onClose={() => { setShowImport(false); setImportText(''); setImportError(''); }} title="导入订阅规则">
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-[#94A3B8] mb-1.5">粘贴 JSON 规则</label>
            <textarea
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
              placeholder='[{"name": "规则名称", "enabled": true, ...}]'
              rows={8}
              className="w-full px-3 py-2 bg-[#0F172A] border border-[#334155] rounded-lg text-sm text-[#F1F5F9] placeholder-[#64748B] focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20 font-mono"
            />
          </div>
          {importError && (
            <p className="text-xs text-rose-400">{importError}</p>
          )}
          <div className="flex gap-3">
            <button
              onClick={() => { setShowImport(false); setImportText(''); setImportError(''); }}
              className="flex-1 px-4 py-2.5 bg-[#0F172A] border border-[#334155] text-[#94A3B8] rounded-lg hover:bg-[#334155]/50 transition-colors text-sm font-medium"
            >
              取消
            </button>
            <button
              onClick={handleImport}
              disabled={!importText.trim()}
              className="flex-1 px-4 py-2.5 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
            >
              导入
            </button>
          </div>
        </div>
      </Modal>
    );
  }

  return (
    <Modal open={open} onClose={onClose} title="事件订阅过滤器">
      <div className="space-y-5 max-h-[70vh] overflow-y-auto">
        <div className="flex items-center justify-between p-3 bg-[#0F172A] rounded-lg border border-[#334155]">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-emerald-400" />
            <div>
              <p className="text-sm font-medium text-[#F1F5F9]">订阅规则</p>
              <p className="text-xs text-[#64748B]">
                已启用 {enabledRulesCount} / {totalRulesCount} 条规则
              </p>
            </div>
          </div>
          <button
            onClick={handleAddRule}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/15 text-emerald-400 rounded-lg hover:bg-emerald-500/25 transition-colors text-xs font-medium"
          >
            <Plus className="w-3.5 h-3.5" />
            新建规则
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={handleToggleServerFilter}
            className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
              filterSettings.serverFilter
                ? 'bg-emerald-500/10 border-emerald-500/30'
                : 'bg-[#0F172A] border-[#334155]'
            }`}
          >
            <div className="flex items-center gap-2">
              {filterSettings.serverFilter ? (
                <Power className="w-4 h-4 text-emerald-400" />
              ) : (
                <PowerOff className="w-4 h-4 text-[#64748B]" />
              )}
              <div className="text-left">
                <p className={`text-xs font-medium ${filterSettings.serverFilter ? 'text-emerald-400' : 'text-[#64748B]'}`}>
                  服务端过滤
                </p>
                <p className="text-[10px] text-[#64748B]">减少数据传输</p>
              </div>
            </div>
          </button>

          <button
            onClick={handleToggleClientFilter}
            className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
              filterSettings.clientFilter
                ? 'bg-emerald-500/10 border-emerald-500/30'
                : 'bg-[#0F172A] border-[#334155]'
            }`}
          >
            <div className="flex items-center gap-2">
              {filterSettings.clientFilter ? (
                <Power className="w-4 h-4 text-emerald-400" />
              ) : (
                <PowerOff className="w-4 h-4 text-[#64748B]" />
              )}
              <div className="text-left">
                <p className={`text-xs font-medium ${filterSettings.clientFilter ? 'text-emerald-400' : 'text-[#64748B]'}`}>
                  客户端过滤
                </p>
                <p className="text-[10px] text-[#64748B]">本地二次校验</p>
              </div>
            </div>
          </button>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={handleExport}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#0F172A] border border-[#334155] text-[#94A3B8] rounded-lg hover:bg-[#334155]/50 transition-colors text-xs"
          >
            <Download className="w-3.5 h-3.5" />
            导出
          </button>
          <button
            onClick={() => setShowImport(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#0F172A] border border-[#334155] text-[#94A3B8] rounded-lg hover:bg-[#334155]/50 transition-colors text-xs"
          >
            <Upload className="w-3.5 h-3.5" />
            导入
          </button>
          <button
            onClick={resetToDefaults}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#0F172A] border border-[#334155] text-[#94A3B8] rounded-lg hover:bg-[#334155]/50 transition-colors text-xs"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            恢复默认
          </button>
          <button
            onClick={clearAllRules}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-500/10 border border-rose-500/30 text-rose-400 rounded-lg hover:bg-rose-500/20 transition-colors text-xs"
          >
            <Trash2 className="w-3.5 h-3.5" />
            清空所有
          </button>
        </div>

        <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
          <div className="flex items-start gap-2">
            <Info className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs text-blue-400 font-medium">过滤规则说明</p>
              <p className="text-[11px] text-[#94A3B8] mt-0.5">
                启用的规则之间是"或"的关系，只要匹配任意一条规则就会接收事件。
                如果没有启用任何规则，将接收所有事件。规则保存在浏览器本地存储中。
              </p>
            </div>
          </div>
        </div>

        {!isInitialized ? (
          <div className="text-center py-8 text-[#64748B] text-sm">加载中...</div>
        ) : rules.length === 0 ? (
          <div className="text-center py-8">
            <Filter className="w-10 h-10 mx-auto mb-3 text-[#334155]" />
            <p className="text-sm text-[#64748B]">暂无订阅规则</p>
            <p className="text-xs text-[#475569] mt-1">点击上方"新建规则"创建您的第一条规则</p>
          </div>
        ) : (
          <div className="space-y-3">
            {rules.map(rule => (
              <div
                key={rule.id}
                className={`p-4 rounded-lg border transition-all ${
                  rule.enabled
                    ? 'bg-[#1E293B] border-[#334155]'
                    : 'bg-[#0F172A] border-[#334155]/50 opacity-60'
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => toggleRule(rule.id)}
                      className={`relative w-9 h-5 rounded-full transition-colors ${
                        rule.enabled ? 'bg-emerald-500' : 'bg-[#334155]'
                      }`}
                    >
                      <span
                        className="absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform"
                        style={{ transform: rule.enabled ? 'translateX(18px)' : 'translateX(2px)' }}
                      />
                    </button>
                    <span className="text-sm font-medium text-[#F1F5F9]">{rule.name}</span>
                    {getSeverityBadge(rule)}
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleEditRule(rule)}
                      className="p-1.5 text-[#64748B] hover:text-[#94A3B8] hover:bg-[#334155]/50 rounded transition-colors"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => deleteRule(rule.id)}
                      className="p-1.5 text-[#64748B] hover:text-rose-400 hover:bg-rose-500/10 rounded transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
                <p className="text-xs text-[#94A3B8] mb-2">{getRuleSummary(rule)}</p>
                <p className="text-[10px] text-[#64748B]">
                  更新于 {formatTime(rule.updatedAt)}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </Modal>
  );
}
