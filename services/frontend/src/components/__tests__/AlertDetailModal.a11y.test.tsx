import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { axe } from '../a11y-utils';
import AlertDetailModal from '../../components/AlertDetailModal';

describe('AlertDetailModal Accessibility', () => {
  it('should not have any accessibility violations', async () => {
    const mockAlert = {
      id: 1,
      batteryId: 'BAT001',
      severity: 'critical',
      message: 'Critical alert message',
      timestamp: new Date().toISOString(),
      details: 'Detailed information about the alert',
    };

    const { container } = render(
      <AlertDetailModal alert={mockAlert} isOpen={true} onClose={() => {}} />
    );

    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });
});
