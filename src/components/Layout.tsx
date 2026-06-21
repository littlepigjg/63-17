import { Outlet } from 'react-router-dom';
import { useState } from 'react';
import { Bell, BellOff, Settings } from 'lucide-react';
import Sidebar from './Sidebar';
import EventFilterModal from './EventFilterModal';
import { useAppStore } from '@/stores/appStore';
import { useSSE, useSubscriptionRules } from '@/hooks';

export default function Layout() {
  const { sidebarCollapsed } = useAppStore();
  const [showFilterModal, setShowFilterModal] = useState(false);
  const { isConnected } = useSSE();
  const { enabledRulesCount } = useSubscriptionRules();

  return (
    <div className="min-h-screen bg-[#0F172A]">
      <Sidebar />

      <div className={`fixed top-4 right-4 z-40 transition-all duration-200 ${
        sidebarCollapsed ? 'left-20' : 'left-60'
      }`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs ${
              isConnected
                ? 'bg-emerald-500/15 text-emerald-400'
                : 'bg-amber-500/15 text-amber-400'
            }`}>
              {isConnected ? (
                <Bell className="w-3.5 h-3.5 animate-pulse" />
              ) : (
                <BellOff className="w-3.5 h-3.5" />
              )}
              <span>{isConnected ? '实时连接' : '连接中断'}</span>
            </div>
          </div>

          <button
            onClick={() => setShowFilterModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#1E293B] border border-[#334155] text-[#94A3B8] rounded-full hover:bg-[#334155] hover:text-[#F1F5F9] transition-colors text-xs"
          >
            <Settings className="w-3.5 h-3.5" />
            <span>事件过滤</span>
            {enabledRulesCount > 0 && (
              <span className="ml-1 px-1.5 py-0.5 bg-emerald-500/20 text-emerald-400 rounded-full text-[10px] font-medium">
                {enabledRulesCount}
              </span>
            )}
          </button>
        </div>
      </div>

      <main
        className={`transition-all duration-200 pt-14 ${
          sidebarCollapsed ? 'ml-16' : 'ml-56'
        }`}
      >
        <div className="p-6 max-w-[1600px] mx-auto">
          <Outlet />
        </div>
      </main>

      <EventFilterModal
        open={showFilterModal}
        onClose={() => setShowFilterModal(false)}
      />
    </div>
  );
}
