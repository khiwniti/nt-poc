import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { FacilityMarker } from '../FacilityMarker';

describe('FacilityMarker', () => {
  it('renders with accessible name and selected state', () => {
    render(
      <FacilityMarker
        facility={{ id: 'a', name: 'Facility A', coordinates: { latitude: 0, longitude: 0 } }}
        position={{ xPercent: 50, yPercent: 50 }}
        selected
      />
    );

    const marker = screen.getByRole('button', { name: 'Facility A' });
    expect(marker).toHaveAttribute('aria-pressed', 'true');
  });

  it('does nothing when clicked without onSelect', async () => {
    const user = userEvent.setup();
    render(
      <FacilityMarker
        facility={{ id: 'a', name: 'Facility A', coordinates: { latitude: 0, longitude: 0 } }}
        position={{ xPercent: 50, yPercent: 50 }}
      />
    );

    await user.click(screen.getByRole('button', { name: 'Facility A' }));
  });

  it('calls onSelect with facility id when clicked', async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();
    render(
      <FacilityMarker
        facility={{ id: 'a', name: 'Facility A', coordinates: { latitude: 0, longitude: 0 } }}
        position={{ xPercent: 50, yPercent: 50 }}
        onSelect={onSelect}
      />
    );

    await user.click(screen.getByRole('button', { name: 'Facility A' }));
    expect(onSelect).toHaveBeenCalledWith('a');
  });
});
