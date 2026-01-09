export interface SensorReading {
  id?: number;
  batterySystemId: string;
  time: number;
  voltage?: number;
  current?: number;
  temperature?: number;
  [key: string]: unknown;
}

export interface Alert {
  id: string;
  batterySystemId?: string;
  status?: string;
  severity?: string;
  createdAt?: number;
  [key: string]: unknown;
}
