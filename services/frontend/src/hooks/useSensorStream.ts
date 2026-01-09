import { useEffect, useRef } from 'react';

export interface SensorReading {
  voltage?: number;
  current?: number;
  temperature?: number;
  [key: string]: unknown;
}

export interface UseSensorStreamOptions {
  batterySystemId: string;
  onReading: (reading: SensorReading) => void;
  onError?: (error: Event) => void;
  enabled?: boolean;
}

const SSE_BASE_URL = import.meta.env.VITE_SSE_URL || '/api/sse';

export function useSensorStream({
  batterySystemId,
  onReading,
  onError,
  enabled = true,
}: UseSensorStreamOptions) {
  const eventSourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const url = `${SSE_BASE_URL}/sensors?batterySystemId=${batterySystemId}`;
    const eventSource = new EventSource(url);
    eventSourceRef.current = eventSource;

    eventSource.onmessage = (event) => {
      try {
        const reading = JSON.parse(event.data) as SensorReading;
        onReading(reading);
      } catch {
        // Ignore parse errors
      }
    };

    eventSource.onerror = (event) => {
      onError?.(event);
    };

    return () => {
      eventSource.close();
    };
  }, [batterySystemId, onReading, onError, enabled]);

  return {
    disconnect: () => eventSourceRef.current?.close(),
  };
}
