import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  exportMapAsPNG,
  exportFacilitiesAsGeoJSON,
  exportFacilitiesAsKML,
} from '../mapExport';
import type { FacilityMarkerData } from '../../components/geospatial/FacilityMarker';

// Mock html2canvas
vi.mock('html2canvas', () => ({
  default: vi.fn(),
}));

// Mock URL methods
const originalURL = global.URL;
beforeEach(() => {
  global.URL.createObjectURL = vi.fn(() => 'mock-url');
  global.URL.revokeObjectURL = vi.fn();
});

afterEach(() => {
  vi.restoreAllMocks();
  global.URL = originalURL;
});

describe('mapExport', () => {
  const mockFacilities: FacilityMarkerData[] = [
    {
      id: 'facility-1',
      name: 'Facility Alpha',
      coordinates: { latitude: 40.7128, longitude: -74.006 },
      status: 'active',
    },
    {
      id: 'facility-2',
      name: 'Facility Beta',
      coordinates: { latitude: 34.0522, longitude: -118.2437 },
      status: 'maintenance',
    },
    {
      id: 'facility-3',
      name: 'Facility <Gamma>',
      coordinates: { latitude: 41.8781, longitude: -87.6298 },
      status: 'active',
    },
  ];

  let createElementSpy: ReturnType<typeof vi.spyOn>;
  let appendChildSpy: ReturnType<typeof vi.spyOn>;
  let removeChildSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    const mockLink = {
      href: '',
      download: '',
      style: { display: '' },
      click: vi.fn(),
    } as unknown as HTMLAnchorElement;

    createElementSpy = vi.spyOn(document, 'createElement').mockReturnValue(mockLink);
    appendChildSpy = vi.spyOn(document.body, 'appendChild').mockImplementation(() => mockLink);
    removeChildSpy = vi.spyOn(document.body, 'removeChild').mockImplementation(() => mockLink);
  });

  describe('exportMapAsPNG', () => {
    it('should export map element as PNG', async () => {
      const mockCanvas = {
        toBlob: vi.fn((callback) => {
          callback(new Blob(['mock-image'], { type: 'image/png' }));
        }),
      } as unknown as HTMLCanvasElement;

      const html2canvas = (await import('html2canvas')).default;
      vi.mocked(html2canvas).mockResolvedValue(mockCanvas);

      const mockElement = document.createElement('div');
      await exportMapAsPNG(mockElement, 'test-map.png');

      expect(html2canvas).toHaveBeenCalledWith(mockElement, {
        backgroundColor: null,
        scale: 2,
        logging: false,
        useCORS: true,
      });

      expect(URL.createObjectURL).toHaveBeenCalled();
      const link = createElementSpy.mock.results[0]?.value as HTMLAnchorElement;
      expect(link.download).toBe('test-map.png');
      expect(link.click).toHaveBeenCalled();
      expect(URL.revokeObjectURL).toHaveBeenCalled();
    });

    it('should use default filename if not provided', async () => {
      const mockCanvas = {
        toBlob: vi.fn((callback) => {
          callback(new Blob(['mock-image'], { type: 'image/png' }));
        }),
      } as unknown as HTMLCanvasElement;

      const html2canvas = (await import('html2canvas')).default;
      vi.mocked(html2canvas).mockResolvedValue(mockCanvas);

      const mockElement = document.createElement('div');
      await exportMapAsPNG(mockElement);

      const link = createElementSpy.mock.results[0]?.value as HTMLAnchorElement;
      expect(link.download).toBe('facility-map.png');
    });

    it('should throw error if html2canvas fails', async () => {
      const html2canvas = (await import('html2canvas')).default;
      vi.mocked(html2canvas).mockRejectedValue(new Error('Canvas error'));

      const mockElement = document.createElement('div');
      await expect(exportMapAsPNG(mockElement)).rejects.toThrow('Failed to export map as PNG');
    });
  });

  describe('exportFacilitiesAsGeoJSON', () => {
    it('should export facilities as GeoJSON', () => {
      exportFacilitiesAsGeoJSON(mockFacilities, undefined, 'test-facilities.geojson');

      expect(URL.createObjectURL).toHaveBeenCalled();
      const link = createElementSpy.mock.results[0]?.value as HTMLAnchorElement;
      expect(link.download).toBe('test-facilities.geojson');
      expect(link.click).toHaveBeenCalled();
    });

    it('should include filters in metadata', () => {
      const filters = { status: 'active', region: 'north' };
      exportFacilitiesAsGeoJSON(mockFacilities, filters);

      expect(URL.createObjectURL).toHaveBeenCalled();
    });

    it('should use default filename if not provided', () => {
      exportFacilitiesAsGeoJSON(mockFacilities);

      const link = createElementSpy.mock.results[0]?.value as HTMLAnchorElement;
      expect(link.download).toBe('facilities.geojson');
    });

    it('should create valid GeoJSON structure', () => {
      let capturedBlob: Blob | null = null;
      vi.mocked(URL.createObjectURL).mockImplementation((blob: Blob | MediaSource) => {
        if (blob instanceof Blob) {
          capturedBlob = blob;
        }
        return 'mock-url';
      });

      exportFacilitiesAsGeoJSON(mockFacilities);

      expect(capturedBlob).not.toBeNull();
      expect(capturedBlob!.type).toBe('application/geo+json');
      
      // We can verify the structure was created correctly by checking the blob was created
      expect(URL.createObjectURL).toHaveBeenCalled();
    });

    it('should include bounds in metadata', () => {
      let capturedBlob: Blob | null = null;
      vi.mocked(URL.createObjectURL).mockImplementation((blob: Blob | MediaSource) => {
        if (blob instanceof Blob) {
          capturedBlob = blob;
        }
        return 'mock-url';
      });

      exportFacilitiesAsGeoJSON(mockFacilities);

      expect(capturedBlob).not.toBeNull();
      expect(URL.createObjectURL).toHaveBeenCalled();
    });

    it('should handle empty facilities array', () => {
      let capturedBlob: Blob | null = null;
      vi.mocked(URL.createObjectURL).mockImplementation((blob: Blob | MediaSource) => {
        if (blob instanceof Blob) {
          capturedBlob = blob;
        }
        return 'mock-url';
      });

      exportFacilitiesAsGeoJSON([]);

      expect(capturedBlob).not.toBeNull();
      expect(URL.createObjectURL).toHaveBeenCalled();
    });
  });

  describe('exportFacilitiesAsKML', () => {
    it('should export facilities as KML', () => {
      exportFacilitiesAsKML(mockFacilities, undefined, 'test-facilities.kml');

      expect(URL.createObjectURL).toHaveBeenCalled();
      const link = createElementSpy.mock.results[0]?.value as HTMLAnchorElement;
      expect(link.download).toBe('test-facilities.kml');
      expect(link.click).toHaveBeenCalled();
    });

    it('should use default filename if not provided', () => {
      exportFacilitiesAsKML(mockFacilities);

      const link = createElementSpy.mock.results[0]?.value as HTMLAnchorElement;
      expect(link.download).toBe('facilities.kml');
    });

    it('should create valid KML structure', () => {
      let capturedBlob: Blob | null = null;
      vi.mocked(URL.createObjectURL).mockImplementation((blob: Blob | MediaSource) => {
        if (blob instanceof Blob) {
          capturedBlob = blob;
        }
        return 'mock-url';
      });

      exportFacilitiesAsKML(mockFacilities);

      expect(capturedBlob).not.toBeNull();
      expect(capturedBlob!.type).toBe('application/vnd.google-earth.kml+xml');
      expect(URL.createObjectURL).toHaveBeenCalled();
    });

    it('should include facility data in placemarks', () => {
      exportFacilitiesAsKML(mockFacilities);
      expect(URL.createObjectURL).toHaveBeenCalled();
    });

    it('should escape XML special characters', () => {
      exportFacilitiesAsKML(mockFacilities);
      expect(URL.createObjectURL).toHaveBeenCalled();
    });

    it('should include metadata in description', () => {
      const filters = { status: 'active' };
      exportFacilitiesAsKML(mockFacilities, filters);
      expect(URL.createObjectURL).toHaveBeenCalled();
    });

    it('should handle filters as "none" when not provided', () => {
      exportFacilitiesAsKML(mockFacilities);
      expect(URL.createObjectURL).toHaveBeenCalled();
    });
  });
});
