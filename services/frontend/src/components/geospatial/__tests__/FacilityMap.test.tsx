import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FacilityMap } from '../FacilityMap';

describe('FacilityMap', () => {
  it('renders the map container and facility markers', () => {
    render(
      <FacilityMap
        facilities={[
          {
            id: 'facility-1',
            name: 'Bangkok Energy Facility',
            coordinates: { latitude: 13.7563, longitude: 100.5018 },
          },
        ]}
      />
    );

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
});
