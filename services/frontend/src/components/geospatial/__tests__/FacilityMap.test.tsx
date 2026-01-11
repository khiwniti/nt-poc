import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FacilityMap } from '../FacilityMap';

const mockFacilities = [
  {
    id: 'facility-1',
    name: 'Bangkok Energy Facility',
    coordinates: { latitude: 13.7563, longitude: 100.5018 },
  },
  {
    id: 'facility-2',
    name: 'Singapore Power Plant',
    coordinates: { latitude: 1.3521, longitude: 103.8198 },
  },
];

describe('FacilityMap', () => {
  it('renders the map container and facility markers', () => {
    render(<FacilityMap facilities={[mockFacilities[0]]} />);

    expect(screen.getByTestId('facility-map')).toBeInTheDocument();
    expect(screen.getByTestId('facility-marker-facility-1')).toBeInTheDocument();
  });

  it('renders an empty map when no facilities are provided', () => {
    render(<FacilityMap facilities={[]} />);
    expect(screen.getByTestId('facility-map')).toBeInTheDocument();
    expect(screen.queryAllByRole('button')).toHaveLength(0);
  });

  it('accepts a string height', () => {
    render(<FacilityMap facilities={[]} height="100%" />);
    expect(screen.getByTestId('facility-map')).toHaveStyle({ height: '100%' });
  });

  it('updates markers when facilities prop changes', () => {
    const { rerender } = render(
      <FacilityMap
        facilities={[{ id: 'a', name: 'A', coordinates: { latitude: 0, longitude: 0 } }]}
      />
    );

    expect(screen.getByTestId('facility-marker-a')).toBeInTheDocument();
    expect(screen.queryByTestId('facility-marker-b')).not.toBeInTheDocument();

    rerender(
      <FacilityMap
        facilities={[
          { id: 'a', name: 'A', coordinates: { latitude: 0, longitude: 0 } },
          { id: 'b', name: 'B', coordinates: { latitude: 1, longitude: 1 } },
        ]}
      />
    );

    expect(screen.getByTestId('facility-marker-a')).toBeInTheDocument();
    expect(screen.getByTestId('facility-marker-b')).toBeInTheDocument();
  });

  it('calls onSelectFacility when a marker is clicked', async () => {
    const user = userEvent.setup();
    const onSelectFacility = vi.fn();

    render(
      <FacilityMap
        facilities={[{ id: 'a', name: 'A', coordinates: { latitude: 0, longitude: 0 } }]}
        onSelectFacility={onSelectFacility}
      />
    );

    await user.click(screen.getByTestId('facility-marker-a'));
    expect(onSelectFacility).toHaveBeenCalledWith('a');
  });

  it('has application role and proper aria attributes', () => {
    render(<FacilityMap facilities={mockFacilities} ariaLabel="Test map" />);

    const map = screen.getByTestId('facility-map');
    expect(map).toHaveAttribute('role', 'application');
    expect(map).toHaveAttribute('aria-label', expect.stringContaining('Test map'));
    expect(map).toHaveAttribute('tabIndex', '0');
  });

  it('includes keyboard navigation instructions', () => {
    render(<FacilityMap facilities={mockFacilities} />);

    expect(screen.getByText(/Use arrow keys to navigate/i)).toBeInTheDocument();
    expect(screen.getByText(/Interactive map with 2 facilities/i)).toBeInTheDocument();
  });

  it('has live region for announcements', () => {
    render(<FacilityMap facilities={mockFacilities} />);

    const liveRegion = screen.getByTestId('map-announcements');
    expect(liveRegion).toHaveAttribute('role', 'status');
    expect(liveRegion).toHaveAttribute('aria-live', 'polite');
    expect(liveRegion).toHaveAttribute('aria-atomic', 'true');
  });

  describe('Keyboard Navigation', () => {
    it('navigates to next facility with ArrowRight', async () => {
      const user = userEvent.setup();
      render(<FacilityMap facilities={mockFacilities} />);

      const map = screen.getByTestId('facility-map');
      await user.click(map);
      await user.keyboard('{ArrowRight}');

      const announcements = screen.getByTestId('map-announcements');
      expect(announcements).toHaveTextContent('Focused on Bangkok Energy Facility');
    });

    it('navigates to next facility with ArrowDown', async () => {
      const user = userEvent.setup();
      render(<FacilityMap facilities={mockFacilities} />);

      const map = screen.getByTestId('facility-map');
      await user.click(map);
      await user.keyboard('{ArrowDown}');

      const announcements = screen.getByTestId('map-announcements');
      expect(announcements).toHaveTextContent('Focused on Bangkok Energy Facility');
    });

    it('navigates to previous facility with ArrowLeft', async () => {
      const user = userEvent.setup();
      render(<FacilityMap facilities={mockFacilities} />);

      const map = screen.getByTestId('facility-map');
      await user.click(map);
      await user.keyboard('{ArrowLeft}');

      const announcements = screen.getByTestId('map-announcements');
      expect(announcements).toHaveTextContent('Focused on Singapore Power Plant');
    });

    it('navigates to previous facility with ArrowUp', async () => {
      const user = userEvent.setup();
      render(<FacilityMap facilities={mockFacilities} />);

      const map = screen.getByTestId('facility-map');
      await user.click(map);
      await user.keyboard('{ArrowUp}');

      const announcements = screen.getByTestId('map-announcements');
      expect(announcements).toHaveTextContent('Focused on Singapore Power Plant');
    });

    it('jumps to first facility with Home key', async () => {
      const user = userEvent.setup();
      render(<FacilityMap facilities={mockFacilities} />);

      const map = screen.getByTestId('facility-map');
      await user.click(map);
      await user.keyboard('{Home}');

      const announcements = screen.getByTestId('map-announcements');
      expect(announcements).toHaveTextContent('Focused on first facility: Bangkok Energy Facility');
    });

    it('jumps to last facility with End key', async () => {
      const user = userEvent.setup();
      render(<FacilityMap facilities={mockFacilities} />);

      const map = screen.getByTestId('facility-map');
      await user.click(map);
      await user.keyboard('{End}');

      const announcements = screen.getByTestId('map-announcements');
      expect(announcements).toHaveTextContent('Focused on last facility: Singapore Power Plant');
    });

    it('selects focused facility with Enter key', async () => {
      const user = userEvent.setup();
      const onSelectFacility = vi.fn();
      render(<FacilityMap facilities={mockFacilities} onSelectFacility={onSelectFacility} />);

      const map = screen.getByTestId('facility-map');
      await user.click(map);
      await user.keyboard('{ArrowRight}');
      await user.keyboard('{Enter}');

      expect(onSelectFacility).toHaveBeenCalledWith('facility-1');
      const announcements = screen.getByTestId('map-announcements');
      expect(announcements).toHaveTextContent('Selected Bangkok Energy Facility');
    });

    it('selects focused facility with Space key', async () => {
      const user = userEvent.setup();
      const onSelectFacility = vi.fn();
      render(<FacilityMap facilities={mockFacilities} onSelectFacility={onSelectFacility} />);

      const map = screen.getByTestId('facility-map');
      await user.click(map);
      await user.keyboard('{ArrowRight}');
      await user.keyboard(' ');

      expect(onSelectFacility).toHaveBeenCalledWith('facility-1');
    });

    it('zooms in with + key', async () => {
      const user = userEvent.setup();
      render(<FacilityMap facilities={mockFacilities} />);

      const map = screen.getByTestId('facility-map');
      await user.click(map);
      await user.keyboard('{+}');

      const announcements = screen.getByTestId('map-announcements');
      expect(announcements).toHaveTextContent(/Zoomed in to 120%/);
    });

    it('zooms in with = key', async () => {
      const user = userEvent.setup();
      render(<FacilityMap facilities={mockFacilities} />);

      const map = screen.getByTestId('facility-map');
      await user.click(map);
      await user.keyboard('{=}');

      const announcements = screen.getByTestId('map-announcements');
      expect(announcements).toHaveTextContent(/Zoomed in to 120%/);
    });

    it('zooms out with - key', async () => {
      const user = userEvent.setup();
      render(<FacilityMap facilities={mockFacilities} />);

      const map = screen.getByTestId('facility-map');
      await user.click(map);
      await user.keyboard('{-}');

      const announcements = screen.getByTestId('map-announcements');
      expect(announcements).toHaveTextContent(/Zoomed out to 80%/);
    });

    it('does not navigate when no facilities are present', async () => {
      const user = userEvent.setup();
      render(<FacilityMap facilities={[]} />);

      const map = screen.getByTestId('facility-map');
      await user.click(map);
      await user.keyboard('{ArrowRight}');

      const announcements = screen.getByTestId('map-announcements');
      expect(announcements).toHaveTextContent('');
    });
  });

  describe('High Contrast Mode', () => {
    it('applies high contrast background when enabled', () => {
      render(<FacilityMap facilities={mockFacilities} highContrastMode />);

      const map = screen.getByTestId('facility-map');
      expect(map).toHaveStyle({ background: '#000000' });
    });

    it('applies high contrast border when enabled', () => {
      render(<FacilityMap facilities={mockFacilities} highContrastMode />);

      const map = screen.getByTestId('facility-map');
      expect(map).toHaveStyle({ border: '2px solid #ffffff' });
    });
  });
});
