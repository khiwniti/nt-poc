export type HealthStatus = 'healthy' | 'warning' | 'critical';

export interface FacilityHealthMetrics {
  averageSoH?: number;
  averageSoC?: number;
  activeAlerts?: number;
  status?: string;
}

export function calculateFacilityHealth(metrics: FacilityHealthMetrics): HealthStatus {
  const soh = metrics.averageSoH ?? 100;
  const alerts = metrics.activeAlerts ?? 0;
  const status = metrics.status?.toLowerCase();

  if (status === 'inactive' || status === 'offline') {
    return 'critical';
  }

  if (alerts > 5 || soh < 60) {
    return 'critical';
  }

  if (alerts > 2 || soh < 80 || status === 'maintenance') {
    return 'warning';
  }

  return 'healthy';
}

export function getHealthColor(health: HealthStatus): string {
  switch (health) {
    case 'healthy':
      return '#10b981'; // green-500
    case 'warning':
      return '#f59e0b'; // amber-500
    case 'critical':
      return '#ef4444'; // red-500
  }
}

export function getHealthLabel(health: HealthStatus): string {
  switch (health) {
    case 'healthy':
      return 'Healthy';
    case 'warning':
      return 'Warning';
    case 'critical':
      return 'Critical';
  }
}
