import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FacilityMarker } from '../FacilityMarker';

describe('FacilityMarker', () => {
  const mockFacility = {
    id: 'a',
    name: 'Facility A',
    coordinates: { latitude: 10.1234, longitude: 20.5678 },
  };

  it('renders with accessible name and selected state', () => {
    render(
      <FacilityMarker
        facility={mockFacility}
        position={{ xPercent: 50, yPercent: 50 }}
        selected
      />
    );

    const marker = screen.getByRole('button');
    expect(marker).toHaveAttribute('aria-pressed', 'true');
    expect(marker).toHaveAttribute(
      'aria-label',
      expect.stringContaining('Facility A at latitude 10.1234, longitude 20.5678')
    );
  });

  it('includes selected state in aria-label when selected', () => {
    render(
      <FacilityMarker
        facility={mockFacility}
        position={{ xPercent: 50, yPercent: 50 }}
        selected
      />
    );

    const marker = screen.getByRole('button');
    expect(marker).toHaveAttribute('aria-label', expect.stringContaining('selected'));
  });

  it('includes focused state in aria-label when focused', () => {
    render(
      <FacilityMarker
        facility={mockFacility}
        position={{ xPercent: 50, yPercent: 50 }}
        focused
      />
    );

    const marker = screen.getByRole('button');
    expect(marker).toHaveAttribute('aria-label', expect.stringContaining('focused'));
  });

  it('does nothing when clicked without onSelect', async () => {
    const user = userEvent.setup();
    render(<FacilityMarker facility={mockFacility} position={{ xPercent: 50, yPercent: 50 }} />);

    await user.click(screen.getByRole('button'));
  });

  it('calls onSelect with facility id when clicked', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(
      <FacilityMarker
        facility={mockFacility}
        position={{ xPercent: 50, yPercent: 50 }}
        onSelect={onSelect}
      />
    );

    await user.click(screen.getByRole('button'));
    expect(onSelect).toHaveBeenCalledWith('a');
  });

  it('applies high contrast styles when highContrastMode is true', () => {
    render(
      <FacilityMarker
        facility={mockFacility}
        position={{ xPercent: 50, yPercent: 50 }}
        highContrastMode
      />
    );

    const marker = screen.getByRole('button');
    expect(marker.style.filter).toContain('brightness');
  });

  it('has coordinates in accessible description', () => {
    render(<FacilityMarker facility={mockFacility} position={{ xPercent: 50, yPercent: 50 }} />);

    const marker = screen.getByRole('button');
    expect(marker).toHaveAttribute('aria-describedby', 'marker-coords-a');
    expect(screen.getByText(/latitude 10\.1234, longitude 20\.5678/)).toBeInTheDocument();
  });

  it('respects tabIndex prop', () => {
    render(
      <FacilityMarker facility={mockFacility} position={{ xPercent: 50, yPercent: 50 }} tabIndex={-1} />
    );

    const marker = screen.getByRole('button');
    expect(marker).toHaveAttribute('tabIndex', '-1');
  });
});
