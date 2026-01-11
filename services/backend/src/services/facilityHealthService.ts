/**
 * Facility Health Service
 *
 * Aggregates alert data to calculate facility health status.
 * Health status determines marker colors on the map and provides
 * quick health overview for facility monitoring.
 */

export type HealthStatus = 'healthy' | 'warning' | 'critical' | 'offline';

export interface FacilityHealth {
  facilityId: string;
  status: HealthStatus;
  activeAlertCount: number;
  criticalCount: number;
  highCount: number;
  mediumCount: number;
  infoCount: number;
}

interface Facility {
  id: string;
  status: 'active' | 'inactive' | 'maintenance';
}

interface Alert {
  facilityId?: string;
  severity: string;
  status: string;
}

export class FacilityHealthService {
  /**
   * Calculate facility health based on active alerts and facility status
   *
   * Logic:
   * - Offline: facility status is 'maintenance' or 'inactive'
   * - Critical: any critical severity alerts
   * - Warning: any high severity alerts (no critical)
   * - Healthy: only medium/info alerts or no alerts
   *
   * @param facility - Facility data with status
   * @param activeAlerts - All alerts (will filter for this facility and active status)
   * @returns Facility health status with alert counts
   */
  calculateHealth(facility: Facility, activeAlerts: Alert[]): FacilityHealth {
    // Offline if facility is in maintenance or inactive
    if (facility.status === 'maintenance' || facility.status === 'inactive') {
      return {
        facilityId: facility.id,
        status: 'offline',
        activeAlertCount: 0,
        criticalCount: 0,
        highCount: 0,
        mediumCount: 0,
        infoCount: 0
      };
    }

    // Count alerts by severity (only active alerts for this facility)
    const severityCounts = {
      critical: 0,
      high: 0,
      medium: 0,
      info: 0
    };

    for (const alert of activeAlerts) {
      // Only count active alerts for this facility
      if (alert.status !== 'active') continue;
      if (alert.facilityId !== facility.id) continue;

      const severity = alert.severity.toLowerCase();
      if (severity in severityCounts) {
        (severityCounts as any)[severity]++;
      }
    }

    const activeCount = Object.values(severityCounts).reduce((a, b) => a + b, 0);

    // Determine overall health status
    let status: HealthStatus;
    if (severityCounts.critical > 0) {
      status = 'critical';
    } else if (severityCounts.high > 0) {
      status = 'warning';
    } else {
      status = 'healthy';
    }

    return {
      facilityId: facility.id,
      status,
      activeAlertCount: activeCount,
      criticalCount: severityCounts.critical,
      highCount: severityCounts.high,
      mediumCount: severityCounts.medium,
      infoCount: severityCounts.info
    };
  }

  /**
   * Calculate health for multiple facilities in bulk
   *
   * @param facilities - Array of facilities
   * @param allAlerts - All alerts across facilities
   * @returns Map of facilityId to FacilityHealth
   */
  calculateBulkHealth(facilities: Facility[], allAlerts: Alert[]): Map<string, FacilityHealth> {
    const healthMap = new Map<string, FacilityHealth>();

    for (const facility of facilities) {
      const health = this.calculateHealth(facility, allAlerts);
      healthMap.set(facility.id, health);
    }

    return healthMap;
  }
}

// Singleton instance
export const facilityHealthService = new FacilityHealthService();
