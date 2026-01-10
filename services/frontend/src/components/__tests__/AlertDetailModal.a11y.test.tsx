import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { axe } from '../../__tests__/a11y-utils';
import { AlertDetailModal } from '../AlertDetailModal';
import { alertsApi } from '../../api/alerts';

vi.mock('../../api/alerts');

describe('AlertDetailModal Accessibility', () => {
  it('should not have any accessibility violations', async () => {
    const mockAlert = {
      id: 'alert-1',
      batterySystemId: 'battery-1',
      zoneId: 'zone-1',
      type: 'Temperature High',
      severity: 'critical',
      status: 'active',
      message: 'Critical alert message',
      createdAt: Date.now() - 3600000,
      metadata: {
        threshold: 45,
        actualValue: 52,
      },
    };

    const mockSensorHistory = { readings: [], timeline: [] };

    vi.mocked(alertsApi.getAlert).mockResolvedValue({ data: mockAlert as any });
    vi.mocked(alertsApi.getSensorHistory).mockResolvedValue(mockSensorHistory);

    const { container } = render(<AlertDetailModal alertId="alert-1" onClose={() => {}} />);
    await waitFor(() => expect(screen.getByText('Alert Details')).toBeInTheDocument());

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
