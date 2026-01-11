import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { FacilityMap } from '../FacilityMap';
import '@testing-library/jest-dom';

vi.mock('leaflet', () => ({
  default: {
    Icon: {
      Default: {
        prototype: {},
        mergeOptions: vi.fn(),
      },
    },
    divIcon: vi.fn(() => ({})),
    latLngBounds: vi.fn(() => ({
      isValid: () => true,
    })),
  },
}));

vi.mock('react-leaflet', () => ({
  MapContainer: ({ children }: any) => <div data-testid="map-container">{children}</div>,
  TileLayer: () => <div data-testid="tile-layer" />,
  Marker: ({ children }: any) => <div data-testid="marker">{children}</div>,
  Popup: ({ children }: any) => <div data-testid="popup">{children}</div>,
  useMap: () => ({
    setView: vi.fn(),
    fitBounds: vi.fn(),
    getContainer: () => document.createElement('div'),
    touchZoom: { enable: vi.fn() },
    doubleClickZoom: { enable: vi.fn() },
  }),
}));

const mockFacilities = [
  {
    id: '1',
    name: 'North Campus',
    location: 'Building A',
    latitude: 40.7128,
    longitude: -74.0060,
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
  });

  it('renders map container', () => {
    render(<FacilityMap facilities={mockFacilities} />);
    expect(screen.getByTestId('map-container')).toBeInTheDocument();
  });

  it('renders markers for each facility', () => {
    render(<FacilityMap facilities={mockFacilities} />);
    const markers = screen.getAllByTestId('marker');
    expect(markers).toHaveLength(mockFacilities.length);
  });

  it('renders in mobile mode with correct styling', () => {
    const { container } = render(<FacilityMap facilities={mockFacilities} isMobile={true} />);
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper.style.height).toBe('100vh');
  });

  it('renders in desktop mode with correct height', () => {
    const { container } = render(<FacilityMap facilities={mockFacilities} isMobile={false} />);
    const wrapper = container.firstChild as HTMLElement;
    expect(wrapper.style.height).toBe('600px');
  });

  it('calls onMarkerClick when provided', async () => {
    const onMarkerClick = vi.fn();
    render(<FacilityMap facilities={mockFacilities} onMarkerClick={onMarkerClick} />);
    expect(onMarkerClick).not.toHaveBeenCalled();
  });

  it('handles empty facilities array', () => {
    render(<FacilityMap facilities={[]} />);
    expect(screen.getByTestId('map-container')).toBeInTheDocument();
  });
});
