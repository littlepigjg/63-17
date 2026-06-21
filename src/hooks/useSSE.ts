import { useEffect, useCallback, useRef, useState } from 'react';
import { sseManager } from './sseManager';
import { useDocumentVisibility } from './useDocumentVisibility';
import type { SSEEvent, SSEFilter, SSEEventType, EventSeverity } from './types';
import { matchSSEEvent } from './types';

interface UseSSEOptions {
  filter?: SSEFilter;
  onMessage?: (event: SSEEvent) => void;
  onConfigChanged?: (event: SSEEvent) => void;
  onRefresh?: (event: SSEEvent) => void;
  onLogCreated?: (event: SSEEvent) => void;
  onClientOnline?: (event: SSEEvent) => void;
  onClientOffline?: (event: SSEEvent) => void;
  onError?: (event: SSEEvent) => void;
  onSystem?: (event: SSEEvent) => void;
  onConnected?: (clientId: string) => void;
  enabled?: boolean;
  onVisibilityChange?: (isVisible: boolean) => void;
}

let listenerIdCounter = 0;
const generateListenerId = () => `sse_${++listenerIdCounter}_${Date.now()}`;

export function useSSE(options: UseSSEOptions = {}) {
  const {
    filter,
    onMessage,
    onConfigChanged,
    onRefresh,
    onLogCreated,
    onClientOnline,
    onClientOffline,
    onError,
    onSystem,
    onConnected,
    enabled = true,
    onVisibilityChange,
  } = options;

  const [isConnected, setIsConnected] = useState(false);
  const [clientId, setClientId] = useState<string | null>(null);
  const listenerIdRef = useRef<string | null>(null);
  const { isVisible } = useDocumentVisibility();

  const handleMessage = useCallback(
    (event: SSEEvent) => {
      if (!enabled) return;

      if (filter && !matchSSEEvent(event, filter)) return;

      onMessage?.(event);

      const eventType = event.type as SSEEventType;

      if (eventType === 'connected') {
        setIsConnected(true);
        const cid = event.clientId as string;
        setClientId(cid);
        onConnected?.(cid);
      } else if (eventType === 'config_changed') {
        onConfigChanged?.(event);
      } else if (eventType === 'refresh') {
        onRefresh?.(event);
      } else if (eventType === 'log_created') {
        onLogCreated?.(event);
      } else if (eventType === 'client_online') {
        onClientOnline?.(event);
      } else if (eventType === 'client_offline') {
        onClientOffline?.(event);
      } else if (eventType === 'error') {
        onError?.(event);
      } else if (eventType === 'system') {
        onSystem?.(event);
      }
    },
    [enabled, filter, onMessage, onConfigChanged, onRefresh, onLogCreated, onClientOnline, onClientOffline, onError, onSystem, onConnected],
  );

  useEffect(() => {
    if (!enabled) {
      if (listenerIdRef.current) {
        listenerIdRef.current = null;
      }
      setIsConnected(false);
      setClientId(null);
      return;
    }

    const listenerId = generateListenerId();
    listenerIdRef.current = listenerId;

    const unsubscribe = sseManager.subscribe(listenerId, handleMessage);

    setIsConnected(sseManager.isConnected());
    setClientId(sseManager.getClientId());

    return () => {
      unsubscribe();
      listenerIdRef.current = null;
      setIsConnected(false);
      setClientId(null);
    };
  }, [enabled, handleMessage]);

  useEffect(() => {
    if (onVisibilityChange) {
      onVisibilityChange(isVisible);
    }
  }, [isVisible, onVisibilityChange]);

  const reconnect = useCallback(() => {
    sseManager.disconnect();
    setTimeout(() => {
      sseManager.connect();
    }, 100);
  }, []);

  return {
    isConnected,
    isVisible,
    clientId,
    reconnect,
  };
}

export type { SSEEvent, SSEFilter, SSEEventType, EventSeverity };
