import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { FacilityMarker } from '../FacilityMarker';
import { HEALTH_STATUS_COLORS } from '../../types/facilityMap';

describe('FacilityMarker', () => {
  it('renders with healthy status', () => {
    render(<FacilityMarker healthStatus="healthy" />);
    const marker = screen.getByTestId('facility-marker');
    expect(marker).toBeInTheDocument();
    expect(marker).toHaveAttribute('data-health-status', 'healthy');
  });

  it('renders with warning status', () => {
    render(<FacilityMarker healthStatus="warning" />);
    const marker = screen.getByTestId('facility-marker');
    expect(marker).toHaveAttribute('data-health-status', 'warning');
  });

  it('renders with critical status', () => {
    render(<FacilityMarker healthStatus="critical" />);
    const marker = screen.getByTestId('facility-marker');
    expect(marker).toHaveAttribute('data-health-status', 'critical');
  });

  it('applies correct aria-label', () => {
    render(<FacilityMarker healthStatus="warning" />);
    const marker = screen.getByRole('button');
    expect(marker).toHaveAttribute('aria-label', 'Facility marker - warning status');
  });

  it('calls onMouseEnter and onMouseLeave handlers', () => {
    const onMouseEnter = vi.fn();
    const onMouseLeave = vi.fn();

    render(
      <FacilityMarker
        healthStatus="healthy"
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
      />
    );

    const marker = screen.getByTestId('facility-marker');
    fireEvent.mouseEnter(marker);
    expect(onMouseEnter).toHaveBeenCalledTimes(1);

    fireEvent.mouseLeave(marker);
    expect(onMouseLeave).toHaveBeenCalledTimes(1);
  });

  it('is keyboard accessible', () => {
    render(<FacilityMarker healthStatus="healthy" />);
    const marker = screen.getByRole('button');
    expect(marker).toHaveAttribute('tabIndex', '0');
  });
});

describe('HEALTH_STATUS_COLORS', () => {
  it('has correct colors for each status', () => {
    expect(HEALTH_STATUS_COLORS.healthy).toBe('#22c55e');
    expect(HEALTH_STATUS_COLORS.warning).toBe('#eab308');
    expect(HEALTH_STATUS_COLORS.critical).toBe('#ef4444');
  });
});
