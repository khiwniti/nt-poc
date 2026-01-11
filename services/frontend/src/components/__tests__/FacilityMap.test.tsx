import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { FacilityMap } from '../FacilityMap';
import '@testing-library/jest-dom';

vi.mock('mapbox-gl', () => ({
  default: {
    Map: vi.fn(() => ({
      on: vi.fn(),
      remove: vi.fn(),
      addControl: vi.fn(),
      addSource: vi.fn(),
      addLayer: vi.fn(),
      getSource: vi.fn(() => null),
      fitBounds: vi.fn(),
      easeTo: vi.fn(),
      getCanvas: vi.fn(() => ({
        style: { cursor: '' },
      })),
      queryRenderedFeatures: vi.fn(() => []),
      getZoom: vi.fn(() => 10),
    })),
    NavigationControl: vi.fn(),
    FullscreenControl: vi.fn(),
    ScaleControl: vi.fn(),
    GeolocateControl: vi.fn(),
    Marker: vi.fn(() => ({
      setLngLat: vi.fn().mockReturnThis(),
      addTo: vi.fn().mockReturnThis(),
      remove: vi.fn(),
    })),
    Popup: vi.fn(() => ({
      setLngLat: vi.fn().mockReturnThis(),
      setHTML: vi.fn().mockReturnThis(),
      addTo: vi.fn().mockReturnThis(),
    })),
    LngLatBounds: vi.fn(() => ({
      extend: vi.fn(),
      isEmpty: vi.fn(() => false),
    })),
  },
  accessToken: '',
}));

const mockFacilities = [
  {
    id: '1',
    name: 'North Campus',
    location: 'Building A',
    latitude: 40.7128,
    longitude: -74.006,
    status: 'active',
    total_zones: 4,
  },
  {
    id: '2',
    name: 'South Campus',
    location: 'Building B',
    latitude: 34.0522,
    longitude: -118.2437,
    status: 'maintenance',
    total_zones: 6,
  },
];

describe('FacilityMap', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    import.meta.env.VITE_MAPBOX_API_KEY = 'test-token';
  });

  it('renders map container', () => {
    const { container } = render(<FacilityMap facilities={mockFacilities} />);
    const mapDiv = container.querySelector('div');
    expect(mapDiv).toBeInTheDocument();
  });

  it('renders with correct height in mobile mode', () => {
    const { container } = render(<FacilityMap facilities={mockFacilities} isMobile={true} />);
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper.style.height).toBe('100vh');
  });

  it('renders with correct height in desktop mode', () => {
    const { container } = render(<FacilityMap facilities={mockFacilities} isMobile={false} />);
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper.style.height).toBe('600px');
  });

  it('calls onMarkerClick when provided', () => {
    const onMarkerClick = vi.fn();
    render(<FacilityMap facilities={mockFacilities} onMarkerClick={onMarkerClick} />);
    expect(onMarkerClick).not.toHaveBeenCalled();
  });

  it('handles empty facilities array', () => {
    const { container } = render(<FacilityMap facilities={[]} />);
    expect(container.firstChild).toBeInTheDocument();
  });

  it('shows warning when Mapbox token is missing', () => {
    import.meta.env.VITE_MAPBOX_API_KEY = '';
    render(<FacilityMap facilities={mockFacilities} />);
    expect(screen.getByText(/Mapbox token not configured/i)).toBeInTheDocument();
  });
});
