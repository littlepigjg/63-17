import { useState, useEffect } from 'react';
import { X, Plus } from 'lucide-react';
import type { SSESubscriptionRule, SSEEventType, EventSeverity } from '@/hooks/types';
import { useProjects } from '@/hooks';
import {
  EVENT_TYPE_OPTIONS,
  SEVERITY_OPTIONS,
  ENVIRONMENT_OPTIONS,
} from '@/hooks/useSubscriptionRules';

interface RuleEditorProps {
  rule?: SSESubscriptionRule;
  onSave: (rule: Omit<SSESubscriptionRule, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onCancel: () => void;
}

export default function RuleEditor({ rule, onSave, onCancel }: RuleEditorProps) {
  const { projects } = useProjects();
  const [name, setName] = useState('');
  const [enabled, setEnabled] = useState(true);
  const [eventTypes, setEventTypes] = useState<SSEEventType[]>([]);
  const [selectedProjects, setSelectedProjects] = useState<string[]>([]);
  const [environments, setEnvironments] = useState<string[]>([]);
  const [severity, setSeverity] = useState<EventSeverity[]>([]);
  const [keywords, setKeywords] = useState<string[]>([]);
  const [keywordInput, setKeywordInput] = useState('');

  useEffect(() => {
    if (rule) {
      setName(rule.name);
      setEnabled(rule.enabled);
      setEventTypes(rule.eventTypes || []);
      setSelectedProjects(rule.projects || []);
      setEnvironments(rule.environments || []);
      setSeverity(rule.severity || []);
      setKeywords(rule.keywords || []);
    }
  }, [rule]);

  const handleEventTypeToggle = (type: SSEEventType) => {
    setEventTypes(prev =>
      prev.includes(type)
        ? prev.filter(t => t !== type)
        : [...prev, type]
    );
  };

  const handleProjectToggle = (projectName: string) => {
    setSelectedProjects(prev =>
      prev.includes(projectName)
        ? prev.filter(p => p !== projectName)
        : [...prev, projectName]
    );
  };

  const handleEnvironmentToggle = (env: string) => {
    setEnvironments(prev =>
      prev.includes(env)
        ? prev.filter(e => e !== env)
        : [...prev, env]
    );
  };

  const handleSeverityToggle = (sev: EventSeverity) => {
    setSeverity(prev =>
      prev.includes(sev)
        ? prev.filter(s => s !== sev)
        : [...prev, sev]
    );
  };

  const handleAddKeyword = () => {
    const trimmed = keywordInput.trim();
    if (trimmed && !keywords.includes(trimmed)) {
      setKeywords([...keywords, trimmed]);
      setKeywordInput('');
    }
  };

  const handleRemoveKeyword = (keyword: string) => {
    setKeywords(keywords.filter(k => k !== keyword));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    onSave({
      name: name.trim(),
      enabled,
      eventTypes: eventTypes.length > 0 ? eventTypes : undefined,
      projects: selectedProjects.length > 0 ? selectedProjects : undefined,
      environments: environments.length > 0 ? environments : undefined,
      severity: severity.length > 0 ? severity : undefined,
      keywords: keywords.length > 0 ? keywords : undefined,
    });
  };

  const getSummary = () => {
    const parts: string[] = [];
    if (eventTypes.length > 0) {
      const labels = eventTypes.map(t => EVENT_TYPE_OPTIONS.find(o => o.value === t)?.label || t);
      parts.push(`事件: ${labels.join(', ')}`);
    }
    if (selectedProjects.length > 0) {
      parts.push(`项目: ${selectedProjects.join(', ')}`);
    }
    if (environments.length > 0) {
      parts.push(`环境: ${environments.join(', ')}`);
    }
    if (severity.length > 0) {
      parts.push(`级别: ${severity.join(', ')}`);
    }
    if (keywords.length > 0) {
      parts.push(`关键词: ${keywords.join(', ')}`);
    }
    return parts.length > 0 ? parts.join(' | ') : '匹配所有事件';
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex-1 mr-4">
          <label className="block text-xs font-medium text-[#94A3B8] mb-1.5">规则名称</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="例如：生产环境错误日志"
            className="w-full px-3 py-2 bg-[#0F172A] border border-[#334155] rounded-lg text-sm text-[#F1F5F9] placeholder-[#64748B] focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20"
          />
        </div>
        <div className="flex items-center gap-2 pt-5">
          <span className="text-xs text-[#94A3B8]">启用</span>
          <button
            type="button"
            onClick={() => setEnabled(!enabled)}
            className={`relative w-11 h-6 rounded-full transition-colors ${
              enabled ? 'bg-emerald-500' : 'bg-[#334155]'
            }`}
          >
            <span
              className={`absolute top-0.5 w-5 h-5 bg-white rounded-full transition-transform ${
                enabled ? 'translate-x-5.5' : 'translate-x-0.5'
              }`}
              style={{ transform: enabled ? 'translateX(22px)' : 'translateX(2px)' }}
            />
          </button>
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-[#94A3B8] mb-2">事件类型</label>
        <div className="flex flex-wrap gap-2">
          {EVENT_TYPE_OPTIONS.map(option => (
            <button
              key={option.value}
              type="button"
              onClick={() => handleEventTypeToggle(option.value)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                eventTypes.includes(option.value)
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  : 'bg-[#0F172A] text-[#64748B] border border-[#334155] hover:text-[#94A3B8]'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-[#94A3B8] mb-2">项目</label>
        {projects.length === 0 ? (
          <p className="text-xs text-[#64748B]">暂无项目</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {projects.map(project => (
              <button
                key={project.id}
                type="button"
                onClick={() => handleProjectToggle(project.name)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                  selectedProjects.includes(project.name)
                    ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                    : 'bg-[#0F172A] text-[#64748B] border border-[#334155] hover:text-[#94A3B8]'
                }`}
              >
                {project.name}
              </button>
            ))}
          </div>
        )}
      </div>

      <div>
        <label className="block text-xs font-medium text-[#94A3B8] mb-2">环境</label>
        <div className="flex flex-wrap gap-2">
          {ENVIRONMENT_OPTIONS.map(option => (
            <button
              key={option.value}
              type="button"
              onClick={() => handleEnvironmentToggle(option.value)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                environments.includes(option.value)
                  ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                  : 'bg-[#0F172A] text-[#64748B] border border-[#334155] hover:text-[#94A3B8]'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-[#94A3B8] mb-2">严重程度</label>
        <div className="flex flex-wrap gap-2">
          {SEVERITY_OPTIONS.map(option => (
            <button
              key={option.value}
              type="button"
              onClick={() => handleSeverityToggle(option.value)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                severity.includes(option.value)
                  ? option.color + ' border border-current/30'
                  : 'bg-[#0F172A] text-[#64748B] border border-[#334155] hover:text-[#94A3B8]'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-xs font-medium text-[#94A3B8] mb-2">关键词过滤</label>
        <div className="flex gap-2 mb-2">
          <input
            type="text"
            value={keywordInput}
            onChange={(e) => setKeywordInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddKeyword())}
            placeholder="输入关键词后按回车添加"
            className="flex-1 px-3 py-2 bg-[#0F172A] border border-[#334155] rounded-lg text-sm text-[#F1F5F9] placeholder-[#64748B] focus:outline-none focus:border-emerald-500/50 focus:ring-1 focus:ring-emerald-500/20"
          />
          <button
            type="button"
            onClick={handleAddKeyword}
            className="px-3 py-2 bg-emerald-500/15 text-emerald-400 rounded-lg hover:bg-emerald-500/25 transition-colors"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
        {keywords.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {keywords.map(keyword => (
              <span
                key={keyword}
                className="inline-flex items-center gap-1 px-2 py-1 bg-[#0F172A] border border-[#334155] rounded text-xs text-[#94A3B8]"
              >
                {keyword}
                <button
                  type="button"
                  onClick={() => handleRemoveKeyword(keyword)}
                  className="text-[#64748B] hover:text-rose-400 transition-colors"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="p-3 bg-[#0F172A] rounded-lg border border-[#334155]">
        <p className="text-xs text-[#64748B] mb-1">规则预览</p>
        <p className="text-xs text-[#94A3B8]">{getSummary()}</p>
      </div>

      <div className="flex gap-3 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 px-4 py-2.5 bg-[#0F172A] border border-[#334155] text-[#94A3B8] rounded-lg hover:bg-[#334155]/50 transition-colors text-sm font-medium"
        >
          取消
        </button>
        <button
          type="submit"
          disabled={!name.trim()}
          className="flex-1 px-4 py-2.5 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
        >
          {rule ? '保存修改' : '创建规则'}
        </button>
      </div>
    </form>
  );
}
