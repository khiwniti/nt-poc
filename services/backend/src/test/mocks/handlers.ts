import { http, HttpResponse } from 'msw';

// External API mocks (weather, ML models, etc.)
export const externalHandlers = [
  // Mock weather API
  http.get('https://api.openweathermap.org/data/2.5/weather', () => {
    return HttpResponse.json({
      main: {
        temp: 25.5,
        humidity: 60,
      },
      weather: [
        {
          main: 'Clear',
          description: 'clear sky',
        },
      ],
    });
  }),

  // Mock ML model prediction API
  http.post('/ml/predict/rul', () => {
    return HttpResponse.json({
      rulDays: 365,
      confidence: 0.85,
      factors: {
        temperature: 0.3,
        cycleCount: 0.4,
        dod: 0.2,
        age: 0.1,
      },
    });
  }),

  // Mock Sentry
  http.post(/sentry\.io/, () => {
    return new HttpResponse(null, { status: 200 });
  }),
];
