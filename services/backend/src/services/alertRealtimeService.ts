import type { Request, Response } from 'express';
import { randomUUID } from 'crypto';

export type AlertSeverity = 'critical' | 'warning' | 'info';
export type AlertStatus = 'active' | 'acknowledged' | 'resolved';

export interface Alert {
  id: string;
  facilityId?: string;
  zoneId?: string;
  batterySystemId?: string;
  type: string;
  severity: AlertSeverity;
  status: AlertStatus;
  message: string;
  createdAt: number;
  acknowledgedAt?: number | null;
  resolvedAt?: number | null;
  duration?: number | null;
  metadata?: Record<string, unknown>;
}

export interface CreateAlertInput {
  facilityId?: string;
  zoneId?: string;
  batterySystemId?: string;
  type: string;
  severity: AlertSeverity;
  message: string;
  metadata?: Record<string, unknown>;
}

interface StreamFilters {
  facilityIds?: string[];
  zoneIds?: string[];
}

interface StreamConnection {
  id: string;
  res: Response;
  filters: StreamFilters;
  heartbeatInterval: NodeJS.Timeout;
}

function toSseEvent(event: string, data: unknown): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

function matchesFilters(alert: Alert, filters: StreamFilters): boolean {
  if (filters.facilityIds?.length) {
    if (!alert.facilityId || !filters.facilityIds.includes(alert.facilityId)) return false;
  }
  if (filters.zoneIds?.length) {
    if (!alert.zoneId || !filters.zoneIds.includes(alert.zoneId)) return false;
  }
  return true;
}

class AlertRealtimeService {
  private connections = new Map<string, StreamConnection>();
  private recentAlerts: Alert[] = [];
  private readonly maxRecentAlerts = 500;
  private readonly heartbeatMs = 25000;

  getRecentAlerts(): Alert[] {
    return this.recentAlerts;
  }

  createAlert(input: CreateAlertInput): Alert {
    const alert: Alert = {
      id: `alert-${randomUUID()}`,
      facilityId: input.facilityId,
      zoneId: input.zoneId,
      batterySystemId: input.batterySystemId,
      type: input.type,
      severity: input.severity,
      status: 'active',
      message: input.message,
      createdAt: Date.now(),
      acknowledgedAt: null,
      resolvedAt: null,
      duration: null,
      metadata: input.metadata,
    };

    this.recentAlerts.unshift(alert);
    if (this.recentAlerts.length > this.maxRecentAlerts) {
      this.recentAlerts.length = this.maxRecentAlerts;
    }

    this.publishAlertCreated(alert);
    return alert;
  }

  subscribe(req: Request, res: Response, filters: StreamFilters): string {
    req.socket.setTimeout(0);

    res.status(200);
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();

    const id = `sse-${randomUUID()}`;

    res.write(
      toSseEvent('connected', {
        connectionId: id,
        filters,
        serverTime: Date.now(),
      })
    );

    const heartbeatInterval = setInterval(() => {
      res.write(toSseEvent('heartbeat', { serverTime: Date.now() }));
    }, this.heartbeatMs);

    this.connections.set(id, { id, res, filters, heartbeatInterval });

    const cleanup = () => this.unsubscribe(id);
    req.on('close', cleanup);
    req.on('aborted', cleanup);

    return id;
  }

  unsubscribe(connectionId: string): void {
    const conn = this.connections.get(connectionId);
    if (!conn) return;

    clearInterval(conn.heartbeatInterval);
    this.connections.delete(connectionId);

    try {
      conn.res.end();
    } catch {
      // ignore
    }
  }

  publishAlertCreated(alert: Alert): void {
    for (const conn of this.connections.values()) {
      if (!matchesFilters(alert, conn.filters)) continue;
      conn.res.write(toSseEvent('alert.created', alert));
    }
  }

  clearAlerts(): void {
    this.recentAlerts = [];
  }
}

export default new AlertRealtimeService();
