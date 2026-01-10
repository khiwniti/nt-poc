import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { axe } from '../../__tests__/a11y-utils';
import { AlertList } from '../AlertList';

describe('AlertList Accessibility', () => {
  it('should not have any accessibility violations', async () => {
    const mockAlerts = [
      {
        id: 'alert-1',
        batterySystemId: 'battery-1',
        zoneId: 'zone-1',
        type: 'Temperature High',
        severity: 'critical',
        status: 'active',
        message: 'High temperature detected',
        createdAt: Date.now(),
      },
    ];

    const { container } = render(<AlertList alerts={mockAlerts as any} onSelectAlert={() => {}} />);

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
