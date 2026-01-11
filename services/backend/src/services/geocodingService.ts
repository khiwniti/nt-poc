import axios from 'axios';

export interface GeocodeResult {
  latitude: number;
  longitude: number;
  address: string;
  city: string;
  country: string;
}

export interface ReverseGeocodeResult {
  address: string;
  city: string;
  country: string;
}

/**
 * Geocoding service using Google Maps Geocoding API
 * Converts addresses to coordinates and vice versa
 */
export class GeocodingService {
  private apiKey: string;
  private baseUrl = 'https://maps.googleapis.com/maps/api/geocode/json';

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.GOOGLE_MAPS_API_KEY || '';
    if (!this.apiKey) {
      console.warn('Google Maps API key not configured. Geocoding features will not work.');
    }
  }

  /**
   * Geocode an address to get latitude and longitude
   * @param address Full address string
   * @returns GeocodeResult with coordinates and parsed address components
   */
  async geocode(address: string): Promise<GeocodeResult | null> {
    if (!this.apiKey) {
      throw new Error('Google Maps API key not configured');
    }

    try {
      const response = await axios.get(this.baseUrl, {
        params: {
          address,
          key: this.apiKey,
        },
      });

      if (response.data.status !== 'OK' || !response.data.results?.[0]) {
        console.error('Geocoding failed:', response.data.status);
        return null;
      }

      const result = response.data.results[0];
      const location = result.geometry.location;
      
      // Parse address components
      const addressComponents = result.address_components;
      const city = this.extractAddressComponent(addressComponents, ['locality', 'administrative_area_level_2']);
      const country = this.extractAddressComponent(addressComponents, ['country']);

      return {
        latitude: location.lat,
        longitude: location.lng,
        address: result.formatted_address,
        city: city || '',
        country: country || '',
      };
    } catch (error) {
      console.error('Error geocoding address:', error);
      throw new Error('Failed to geocode address');
    }
  }

  /**
   * Reverse geocode coordinates to get address
   * @param latitude Latitude coordinate
   * @param longitude Longitude coordinate
   * @returns ReverseGeocodeResult with address components
   */
  async reverseGeocode(latitude: number, longitude: number): Promise<ReverseGeocodeResult | null> {
    if (!this.apiKey) {
      throw new Error('Google Maps API key not configured');
    }

    try {
      const response = await axios.get(this.baseUrl, {
        params: {
          latlng: `${latitude},${longitude}`,
          key: this.apiKey,
        },
      });

      if (response.data.status !== 'OK' || !response.data.results?.[0]) {
        console.error('Reverse geocoding failed:', response.data.status);
        return null;
      }

      const result = response.data.results[0];
      const addressComponents = result.address_components;
      
      const city = this.extractAddressComponent(addressComponents, ['locality', 'administrative_area_level_2']);
      const country = this.extractAddressComponent(addressComponents, ['country']);

      return {
        address: result.formatted_address,
        city: city || '',
        country: country || '',
      };
    } catch (error) {
      console.error('Error reverse geocoding:', error);
      throw new Error('Failed to reverse geocode coordinates');
    }
  }

  /**
   * Extract address component by type
   * @param components Address components from Google Maps API
   * @param types Array of component types to search for
   * @returns Component value or empty string
   */
  private extractAddressComponent(components: any[], types: string[]): string {
    for (const type of types) {
      const component = components.find((c) => c.types.includes(type));
      if (component) {
        return component.long_name;
      }
    }
    return '';
  }
}

// Singleton instance
export const geocodingService = new GeocodingService();
