import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { axe } from '../a11y-utils';
import AlertList from '../../components/AlertList';

describe('AlertList Accessibility', () => {
  it('should not have any accessibility violations', async () => {
    const mockAlerts = [
      {
        id: 1,
        batteryId: 'BAT001',
        severity: 'high',
        message: 'High temperature detected',
        timestamp: new Date().toISOString(),
      },
    ];

    const { container } = render(<AlertList alerts={mockAlerts} onAlertClick={() => {}} />);

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
