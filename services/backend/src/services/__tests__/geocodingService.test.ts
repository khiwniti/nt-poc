import { describe, it, expect, vi, beforeEach } from 'vitest';
import axios from 'axios';
import { GeocodingService } from '../geocodingService.js';

vi.mock('axios');
const mockedAxios = vi.mocked(axios);

describe('GeocodingService', () => {
  let service: GeocodingService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new GeocodingService('test-api-key');
  });

  describe('geocode', () => {
    it('should geocode an address successfully', async () => {
      const mockResponse = {
        data: {
          status: 'OK',
          results: [
            {
              geometry: {
                location: {
                  lat: 37.7749,
                  lng: -122.4194,
                },
              },
              formatted_address: '123 Main St, San Francisco, CA 94102, USA',
              address_components: [
                { types: ['locality'], long_name: 'San Francisco' },
                { types: ['country'], long_name: 'United States' },
              ],
            },
          ],
        },
      };

      mockedAxios.get.mockResolvedValue(mockResponse);

      const result = await service.geocode('123 Main St, San Francisco, CA');

      expect(result).toEqual({
        latitude: 37.7749,
        longitude: -122.4194,
        address: '123 Main St, San Francisco, CA 94102, USA',
        city: 'San Francisco',
        country: 'United States',
      });

      expect(mockedAxios.get).toHaveBeenCalledWith(
        'https://maps.googleapis.com/maps/api/geocode/json',
        {
          params: {
            address: '123 Main St, San Francisco, CA',
            key: 'test-api-key',
          },
        }
      );
    });

    it('should return null for invalid address', async () => {
      const mockResponse = {
        data: {
          status: 'ZERO_RESULTS',
          results: [],
        },
      };

      mockedAxios.get.mockResolvedValue(mockResponse);

      const result = await service.geocode('invalid address xyz123');

      expect(result).toBeNull();
    });

    it('should throw error when API key is not configured', async () => {
      const serviceWithoutKey = new GeocodingService('');

      await expect(serviceWithoutKey.geocode('123 Main St')).rejects.toThrow(
        'Google Maps API key not configured'
      );
    });

    it('should throw error on API failure', async () => {
      mockedAxios.get.mockRejectedValue(new Error('Network error'));

      await expect(service.geocode('123 Main St')).rejects.toThrow('Failed to geocode address');
    });
  });

  describe('reverseGeocode', () => {
    it('should reverse geocode coordinates successfully', async () => {
      const mockResponse = {
        data: {
          status: 'OK',
          results: [
            {
              formatted_address: '123 Main St, San Francisco, CA 94102, USA',
              address_components: [
                { types: ['locality'], long_name: 'San Francisco' },
                { types: ['country'], long_name: 'United States' },
              ],
            },
          ],
        },
      };

      mockedAxios.get.mockResolvedValue(mockResponse);

      const result = await service.reverseGeocode(37.7749, -122.4194);

      expect(result).toEqual({
        address: '123 Main St, San Francisco, CA 94102, USA',
        city: 'San Francisco',
        country: 'United States',
      });

      expect(mockedAxios.get).toHaveBeenCalledWith(
        'https://maps.googleapis.com/maps/api/geocode/json',
        {
          params: {
            latlng: '37.7749,-122.4194',
            key: 'test-api-key',
          },
        }
      );
    });

    it('should return null for invalid coordinates', async () => {
      const mockResponse = {
        data: {
          status: 'ZERO_RESULTS',
          results: [],
        },
      };

      mockedAxios.get.mockResolvedValue(mockResponse);

      const result = await service.reverseGeocode(999, 999);

      expect(result).toBeNull();
    });

    it('should throw error when API key is not configured', async () => {
      const serviceWithoutKey = new GeocodingService('');

      await expect(serviceWithoutKey.reverseGeocode(37.7749, -122.4194)).rejects.toThrow(
        'Google Maps API key not configured'
      );
    });

    it('should throw error on API failure', async () => {
      mockedAxios.get.mockRejectedValue(new Error('Network error'));

      await expect(service.reverseGeocode(37.7749, -122.4194)).rejects.toThrow(
        'Failed to reverse geocode coordinates'
      );
    });
  });

  describe('extractAddressComponent', () => {
    it('should extract city from address components', async () => {
      const mockResponse = {
        data: {
          status: 'OK',
          results: [
            {
              formatted_address: 'Test Address',
              geometry: { location: { lat: 0, lng: 0 } },
              address_components: [
                { types: ['locality'], long_name: 'New York' },
                { types: ['administrative_area_level_2'], long_name: 'Manhattan' },
                { types: ['country'], long_name: 'USA' },
              ],
            },
          ],
        },
      };

      mockedAxios.get.mockResolvedValue(mockResponse);

      const result = await service.geocode('test address');

      expect(result?.city).toBe('New York');
    });

    it('should fallback to administrative_area_level_2 if locality not found', async () => {
      const mockResponse = {
        data: {
          status: 'OK',
          results: [
            {
              formatted_address: 'Test Address',
              geometry: { location: { lat: 0, lng: 0 } },
              address_components: [
                { types: ['administrative_area_level_2'], long_name: 'County Name' },
                { types: ['country'], long_name: 'USA' },
              ],
            },
          ],
        },
      };

      mockedAxios.get.mockResolvedValue(mockResponse);

      const result = await service.geocode('test address');

      expect(result?.city).toBe('County Name');
    });
  });
});
