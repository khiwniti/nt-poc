import { createFacility, createBatterySystem, createAlert } from '../factories.js';

export interface AlertScenarioFixture {
  facility: any;
  batterySystem: any;
  criticalAlerts: any[];
  highAlerts: any[];
  mediumAlerts: any[];
  lowAlerts: any[];
  acknowledgedAlerts: any[];
  resolvedAlerts: any[];
}

export async function createAlertScenarioFixture(): Promise<AlertScenarioFixture> {
  const facility = await createFacility({
    name: 'Alert Monitoring Facility',
    status: 'active',
  });

  const batterySystem = await createBatterySystem({
    facility_id: facility.id,
    name: 'Alert Test Battery',
    status: 'online',
  });

  const criticalAlerts = [];
  const criticalAlert1 = await createAlert({
    battery_system_id: batterySystem.id,
    severity: 'critical',
    type: 'voltage',
    message: 'Voltage spike detected - immediate attention required',
    acknowledged: false,
    resolved: false,
  });
  criticalAlerts.push(criticalAlert1);

  const highAlerts = [];
  const highAlert1 = await createAlert({
    battery_system_id: batterySystem.id,
    severity: 'high',
    type: 'temperature',
    message: 'Temperature above safe threshold',
    acknowledged: false,
    resolved: false,
  });
  highAlerts.push(highAlert1);

  const highAlert2 = await createAlert({
    battery_system_id: batterySystem.id,
    severity: 'high',
    type: 'current',
    message: 'Abnormal current draw pattern',
    acknowledged: false,
    resolved: false,
  });
  highAlerts.push(highAlert2);

  const mediumAlerts = [];
  const mediumAlert1 = await createAlert({
    battery_system_id: batterySystem.id,
    severity: 'medium',
    type: 'soc',
    message: 'State of Charge declining faster than expected',
    acknowledged: false,
    resolved: false,
  });
  mediumAlerts.push(mediumAlert1);

  const lowAlerts = [];
  const lowAlert1 = await createAlert({
    battery_system_id: batterySystem.id,
    severity: 'low',
    type: 'power',
    message: 'Minor power fluctuation detected',
    acknowledged: false,
    resolved: false,
  });
  lowAlerts.push(lowAlert1);

  const acknowledgedAlerts = [];
  const ackAlert = await createAlert({
    battery_system_id: batterySystem.id,
    severity: 'medium',
    type: 'temperature',
    message: 'Temperature slightly elevated',
    acknowledged: true,
    acknowledged_at: new Date(Date.now() - 2 * 60 * 60 * 1000),
    acknowledged_by: 'operator@example.com',
    resolved: false,
  });
  acknowledgedAlerts.push(ackAlert);

  const resolvedAlerts = [];
  const resolvedAlert = await createAlert({
    battery_system_id: batterySystem.id,
    severity: 'high',
    type: 'voltage',
    message: 'Voltage anomaly detected',
    acknowledged: true,
    acknowledged_at: new Date(Date.now() - 24 * 60 * 60 * 1000),
    acknowledged_by: 'admin@example.com',
    resolved: true,
    resolved_at: new Date(Date.now() - 12 * 60 * 60 * 1000),
  });
  resolvedAlerts.push(resolvedAlert);

  return {
    facility,
    batterySystem,
    criticalAlerts,
    highAlerts,
    mediumAlerts,
    lowAlerts,
    acknowledgedAlerts,
    resolvedAlerts,
  };
}
