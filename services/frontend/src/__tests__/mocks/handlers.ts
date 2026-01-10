import { http, HttpResponse } from 'msw';

// Mock data
const mockFacilities = [
  {
    id: 'fac-001',
    name: 'Bangkok DC',
    location: { lat: 13.7563, lng: 100.5018, address: '123 Rama IV' },
    timezone: 'Asia/Bangkok',
    totalZones: 12,
    status: 'active',
  },
  {
    id: 'fac-002',
    name: 'Singapore DC',
    location: { lat: 1.3521, lng: 103.8198, address: '456 Marina Bay' },
    timezone: 'Asia/Singapore',
    totalZones: 8,
    status: 'active',
  },
];

const mockBatterySystems = [
  {
    id: 'sys-001',
    facilityId: 'fac-001',
    name: 'Zone A Battery Bank',
    capacity: 100.0,
    currentSoC: 85.2,
    currentSoH: 96.5,
    status: 'operational',
    temperature: 25.3,
    voltage: 48.2,
  },
];

const mockAlerts = [
  {
    id: 'alert-001',
    severity: 'critical',
    type: 'temperature',
    message: 'High temperature detected',
    facilityId: 'fac-001',
    batterySystemId: 'sys-001',
    timestamp: new Date().toISOString(),
    acknowledged: false,
  },
];

const mockMetrics = {
  totalCapacity: 500.0,
  averageSoC: 78.5,
  averageSoH: 94.2,
  totalPower: 125.3,
  activeAlerts: 3,
};

// API handlers
export const handlers = [
  // Auth endpoints
  http.post('/api/auth/login', () => {
    return HttpResponse.json({
      token: 'mock-jwt-token',
      user: { id: 'user-001', email: 'test@example.com', name: 'Test User' },
    });
  }),

  http.post('/api/auth/logout', () => {
    return HttpResponse.json({ success: true });
  }),

  // Facilities
  http.get('/api/facilities', () => {
    return HttpResponse.json(mockFacilities);
  }),

  http.get('/api/facilities/:id', ({ params }) => {
    const facility = mockFacilities.find((f) => f.id === params.id);
    return facility ? HttpResponse.json(facility) : new HttpResponse(null, { status: 404 });
  }),

  // Battery systems
  http.get('/api/facilities/:facilityId/battery-systems', () => {
    return HttpResponse.json(mockBatterySystems);
  }),

  http.get('/api/battery-systems/:id', ({ params }) => {
    const system = mockBatterySystems.find((s) => s.id === params.id);
    return system ? HttpResponse.json(system) : new HttpResponse(null, { status: 404 });
  }),

  // Alerts
  http.get('/api/alerts', () => {
    return HttpResponse.json(mockAlerts);
  }),

  http.patch('/api/alerts/:id/acknowledge', ({ params }) => {
    const alert = mockAlerts.find((a) => a.id === params.id);
    if (alert) {
      alert.acknowledged = true;
      return HttpResponse.json(alert);
    }
    return new HttpResponse(null, { status: 404 });
  }),

  // Metrics and KPIs
  http.get('/api/metrics/kpis', () => {
    return HttpResponse.json(mockMetrics);
  }),

  http.get('/api/metrics/historical', () => {
    return HttpResponse.json({
      data: Array.from({ length: 24 }, (_, i) => ({
        timestamp: new Date(Date.now() - (23 - i) * 60 * 60 * 1000).toISOString(),
        soc: 75 + Math.random() * 10,
        soh: 94 + Math.random() * 3,
        power: 100 + Math.random() * 50,
      })),
    });
  }),

  // RUL Predictions
  http.get('/api/predictions/rul/:batterySystemId', ({ params }) => {
    return HttpResponse.json({
      batterySystemId: params.batterySystemId,
      rulDays: 365 + Math.random() * 100,
      confidence: 0.85,
      predictedEndOfLife: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
      factors: [
        { name: 'Temperature', impact: 0.3 },
        { name: 'Cycle Count', impact: 0.4 },
        { name: 'Depth of Discharge', impact: 0.2 },
        { name: 'Age', impact: 0.1 },
      ],
    });
  }),

  // Reports
  http.get('/api/reports', () => {
    return HttpResponse.json([
      {
        id: 'report-001',
        title: 'Monthly Battery Performance Report',
        type: 'performance',
        generatedAt: new Date().toISOString(),
        status: 'completed',
      },
    ]);
  }),

  // Health check
  http.get('/api/health', () => {
    return HttpResponse.json({ status: 'ok', timestamp: new Date().toISOString() });
  }),
];
