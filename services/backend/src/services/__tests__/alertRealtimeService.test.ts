import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { EventEmitter } from 'events';
import alertRealtimeService from '../alertRealtimeService';

function createFakeReq() {
  const req = new EventEmitter() as any;
  req.query = {};
  req.socket = { setTimeout: vi.fn() };
  return req;
}

function createFakeRes() {
  const headers: Record<string, string> = {};
  const writes: string[] = [];
  const res = {
    status: vi.fn().mockReturnThis(),
    setHeader: vi.fn((k: string, v: string) => {
      headers[k] = v;
    }),
    flushHeaders: vi.fn(),
    write: vi.fn((chunk: string) => {
      writes.push(chunk);
      return true;
    }),
    end: vi.fn(),
    _headers: headers,
    _writes: writes,
  } as any;
  return res;
}

describe('alertRealtimeService', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('streams connected + heartbeat events', () => {
    const req = createFakeReq();
    const res = createFakeRes();

    alertRealtimeService.subscribe(req, res, { facilityIds: ['facility-1'] });

    expect(res._headers['Content-Type']).toBe('text/event-stream');
    expect(res._writes.join('')).toContain('event: connected');

    vi.advanceTimersByTime(26000);
    expect(res._writes.join('')).toContain('event: heartbeat');

    req.emit('close');
    expect(res.end).toHaveBeenCalled();
  });

  it('filters alert.created by facility/zone', () => {
    const reqA = createFakeReq();
    const resA = createFakeRes();
    alertRealtimeService.subscribe(reqA, resA, { facilityIds: ['facility-a'] });

    const reqB = createFakeReq();
    const resB = createFakeRes();
    alertRealtimeService.subscribe(reqB, resB, { facilityIds: ['facility-b'], zoneIds: ['zone-1'] });

    const alert = alertRealtimeService.createAlert({
      facilityId: 'facility-b',
      zoneId: 'zone-1',
      batterySystemId: 'battery-1',
      type: 'Temperature High',
      severity: 'critical',
      message: 'Over threshold',
    });

    const writesA = resA._writes.join('');
    const writesB = resB._writes.join('');

    expect(writesB).toContain('event: alert.created');
    expect(writesB).toContain(alert.id);
    expect(writesA).not.toContain('event: alert.created');

    reqA.emit('close');
    reqB.emit('close');
  });
});
