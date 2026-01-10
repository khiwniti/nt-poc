import { useCallback, useEffect, useRef, useState } from 'react';
import type { Alert } from '../api/alerts';

export type AlertStreamConnectionState =
  | 'disabled'
  | 'connecting'
  | 'open'
  | 'reconnecting'
  | 'closed'
  | 'error';

export interface UseAlertStreamOptions {
  facilityId?: string;
  facility?: string;
  severity?: Alert['severity'] | Array<Alert['severity']>;
  onAlert: (alert: Alert) => void;
  onError?: (error: Event) => void;
  enabled?: boolean;
  endpoint?: string;
  withCredentials?: boolean;
  reconnectBaseDelayMs?: number;
  reconnectMaxDelayMs?: number;
  maxReconnectAttempts?: number;
}

export interface UseAlertStreamResult {
  state: AlertStreamConnectionState;
  reconnectAttempts: number;
  lastEventAt: number | null;
  lastErrorAt: number | null;
  disconnect: () => void;
  reconnect: () => void;
}

const SSE_BASE_URL = import.meta.env.VITE_SSE_URL || '/api/sse';

function normalizeSeverity(severity?: UseAlertStreamOptions['severity']): Array<Alert['severity']> {
  if (!severity) return [];
  return Array.isArray(severity) ? severity : [severity];
}

function getAlertFacilityId(alert: Alert): string | undefined {
  const maybeAny = alert as unknown as {
    facilityId?: string;
    facility?: { id?: string };
    metadata?: { facilityId?: string };
  };
  return maybeAny.facilityId ?? maybeAny.facility?.id ?? maybeAny.metadata?.facilityId;
}

export function useAlertStream({
  facilityId,
  facility,
  severity,
  onAlert,
  onError,
  enabled = true,
  endpoint,
  withCredentials,
  reconnectBaseDelayMs = 1000,
  reconnectMaxDelayMs = 30000,
  maxReconnectAttempts,
}: UseAlertStreamOptions): UseAlertStreamResult {
  const [state, setState] = useState<AlertStreamConnectionState>(enabled ? 'connecting' : 'disabled');
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  const [lastEventAt, setLastEventAt] = useState<number | null>(null);
  const [lastErrorAt, setLastErrorAt] = useState<number | null>(null);

  const eventSourceRef = useRef<EventSource | null>(null);
  const reconnectTimeoutIdRef = useRef<number | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const manuallyDisconnectedRef = useRef(false);
  const unmountedRef = useRef(false);

  const onAlertRef = useRef(onAlert);
  const onErrorRef = useRef(onError);

  useEffect(() => {
    onAlertRef.current = onAlert;
  }, [onAlert]);

  useEffect(() => {
    onErrorRef.current = onError;
  }, [onError]);

  const clearReconnectTimer = useCallback(() => {
    if (reconnectTimeoutIdRef.current != null) {
      window.clearTimeout(reconnectTimeoutIdRef.current);
      reconnectTimeoutIdRef.current = null;
    }
  }, []);

  const closeCurrent = useCallback(() => {
    eventSourceRef.current?.close();
    eventSourceRef.current = null;
  }, []);

  const buildUrl = useCallback(() => {
    const url = new URL(endpoint || `${SSE_BASE_URL}/alerts`, window.location.origin);
    const effectiveFacilityId = facilityId || facility;
    if (effectiveFacilityId) url.searchParams.set('facilityId', effectiveFacilityId);

    const severityValues = normalizeSeverity(severity);
    if (severityValues.length > 0) {
      url.searchParams.set('severity', severityValues.join(','));
    }

    if (endpoint) return url.toString();
    if (SSE_BASE_URL.startsWith('http://') || SSE_BASE_URL.startsWith('https://')) {
      return url.toString();
    }
    return `${url.pathname}${url.search}`;
  }, [endpoint, facility, facilityId, severity]);

  const connect = useCallback(
    (nextState: AlertStreamConnectionState) => {
      if (unmountedRef.current || manuallyDisconnectedRef.current || !enabled) return;

      clearReconnectTimer();
      closeCurrent();

      setState(nextState);

      const url = buildUrl();
      const eventSource = new EventSource(url, withCredentials != null ? { withCredentials } : undefined);
      eventSourceRef.current = eventSource;

      eventSource.onopen = () => {
        if (unmountedRef.current) return;
        reconnectAttemptsRef.current = 0;
        setReconnectAttempts(0);
        setState('open');
      };

      eventSource.onmessage = (event) => {
        if (unmountedRef.current) return;
        try {
          const alert = JSON.parse(event.data) as Alert;

          const severityValues = normalizeSeverity(severity);
          if (severityValues.length > 0 && !severityValues.includes(alert.severity)) {
            return;
          }

          const effectiveFacilityId = facilityId || facility;
          if (effectiveFacilityId) {
            const alertFacilityId = getAlertFacilityId(alert);
            if (alertFacilityId && alertFacilityId !== effectiveFacilityId) {
              return;
            }
          }

          setLastEventAt(Date.now());
          onAlertRef.current(alert);
        } catch {
          // Ignore parse errors
        }
      };

      eventSource.onerror = (event) => {
        if (unmountedRef.current) return;

        setLastErrorAt(Date.now());

        const currentAttempts = reconnectAttemptsRef.current;
        const nextAttempts = currentAttempts + 1;
        reconnectAttemptsRef.current = nextAttempts;
        setReconnectAttempts(nextAttempts);

        onErrorRef.current?.(event);

        if (maxReconnectAttempts != null && nextAttempts > maxReconnectAttempts) {
          setState('error');
          return;
        }

        if (reconnectTimeoutIdRef.current != null) {
          return;
        }

        const delay = Math.min(reconnectMaxDelayMs, reconnectBaseDelayMs * 2 ** currentAttempts);
        setState('reconnecting');
        closeCurrent();

        reconnectTimeoutIdRef.current = window.setTimeout(() => {
          reconnectTimeoutIdRef.current = null;
          connect('reconnecting');
        }, delay);
      };
    },
    [
      buildUrl,
      clearReconnectTimer,
      closeCurrent,
      enabled,
      facility,
      facilityId,
      maxReconnectAttempts,
      reconnectBaseDelayMs,
      reconnectMaxDelayMs,
      severity,
      withCredentials,
    ]
  );

  useEffect(() => {
    unmountedRef.current = false;

    if (!enabled) {
      clearReconnectTimer();
      closeCurrent();
      setState('disabled');
      return () => {
        unmountedRef.current = true;
      };
    }

    manuallyDisconnectedRef.current = false;
    connect('connecting');

    return () => {
      unmountedRef.current = true;
      clearReconnectTimer();
      closeCurrent();
    };
  }, [clearReconnectTimer, closeCurrent, connect, enabled]);

  const disconnect = useCallback(() => {
    manuallyDisconnectedRef.current = true;
    clearReconnectTimer();
    closeCurrent();
    setState('closed');
  }, [clearReconnectTimer, closeCurrent]);

  const reconnect = useCallback(() => {
    manuallyDisconnectedRef.current = false;
    reconnectAttemptsRef.current = 0;
    setReconnectAttempts(0);
    connect('connecting');
  }, [connect]);

  return {
    state,
    reconnectAttempts,
    lastEventAt,
    lastErrorAt,
    disconnect,
    reconnect,
  };
}
