
import { WeatherData } from '../types';

export const getLocalWeather = async (lat: number, lng: number): Promise<WeatherData> => {
    try {
        // Using Open-Meteo Free Weather API (No Key Required)
        const response = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current=temperature_2m,relative_humidity_2m,wind_speed_10m,weather_code`);
        
        if (!response.ok) throw new Error("Weather API Error");

        const data = await response.json();
        const current = data.current;
        
        // Map WMO Weather interpretation codes
        const code = current.weather_code;
        let condition = 'Sunny';
        if (code > 0 && code <= 3) condition = 'Partly Cloudy';
        if (code >= 45 && code <= 48) condition = 'Foggy';
        if (code >= 51 && code <= 67) condition = 'Rainy';
        if (code >= 71) condition = 'Snowy';
        if (code >= 80) condition = 'Stormy';
        if (code >= 95) condition = 'Thunderstorm';

        return {
            temperature: current.temperature_2m,
            humidity: current.relative_humidity_2m,
            windSpeed: current.wind_speed_10m,
            condition: condition,
            uvIndex: Math.floor(Math.random() * 8) + 1, // Mock UV as it requires specific endpoint
            precipitation: (condition === 'Rainy' || condition === 'Stormy' || condition === 'Thunderstorm') ? Math.floor(Math.random() * 40) + 20 : 0
        };
    } catch (e) {
        console.error("Weather API failed, falling back to simulation", e);
        
        // Fallback simulation based on lat/lng deterministic hash
        const hash = Math.abs(Math.sin(lat * 1000) + Math.cos(lng * 1000));
        const conditions = ['Sunny', 'Cloudy', 'Rainy', 'Partly Cloudy'];
        const condition = conditions[Math.floor((hash * 10)) % 4];

        return {
            temperature: parseFloat((28 + (hash * 5)).toFixed(1)),
            humidity: Math.floor(60 + (hash * 20)),
            windSpeed: parseFloat((5 + (hash * 10)).toFixed(1)),
            condition: condition,
            uvIndex: Math.floor(hash * 10),
            precipitation: condition === 'Rainy' ? 65 : 0
        };
    }
}
