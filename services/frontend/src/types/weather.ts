export interface WeatherData {
  temperature: number;
  feelsLike: number;
  humidity: number;
  pressure: number;
  windSpeed: number;
  windDirection: number;
  description: string;
  icon: string;
  timestamp: number;
  alerts?: WeatherAlert[];
}

export interface WeatherAlert {
  severity: 'extreme' | 'high' | 'moderate';
  type: 'heat' | 'cold';
  message: string;
  temperature: number;
}

export interface WeatherForecast {
  date: string;
  temperature: {
    min: number;
    max: number;
    day: number;
    night: number;
  };
  humidity: number;
  windSpeed: number;
  description: string;
  icon: string;
  pop: number;
}

export interface FacilityWeather {
  facilityId: string;
  facilityName: string;
  latitude: number;
  longitude: number;
  weather: WeatherData | null;
}

export interface WeatherCorrelationData {
  date: string;
  temperature: number;
  humidity: number;
  avgSoC: number | null;
  avgSoH: number | null;
  alertCount: number;
}

export interface WeatherCorrelation {
  facilityId: string;
  facilityName: string;
  startDate: string;
  endDate: string;
  correlationData: WeatherCorrelationData[];
  correlation: {
    temperatureVsSoC: number;
    temperatureVsSoH: number;
    temperatureVsAlerts: number;
  };
}
