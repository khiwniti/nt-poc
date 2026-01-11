import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { axe } from '../../__tests__/a11y-utils';
import { AccessibilityControlPanel } from '../AccessibilityControlPanel';
import { useAccessibilityStore } from '../../stores/accessibilityStore';

// Mock the store
vi.mock('../../stores/accessibilityStore', () => ({
  useAccessibilityStore: vi.fn(() => ({
    highContrastEnabled: false,
    colorScheme: 'standard',
    keyboardNavigationEnabled: true,
    screenReaderOptimized: false,
    reduceMotion: false,
    show3DLabels: true,
    use3DOutlines: true,
    setHighContrastEnabled: vi.fn(),
    setColorScheme: vi.fn(),
    setKeyboardNavigationEnabled: vi.fn(),
    setScreenReaderOptimized: vi.fn(),
    setReduceMotion: vi.fn(),
    setShow3DLabels: vi.fn(),
    setUse3DOutlines: vi.fn(),
  })),
}));

describe('AccessibilityControlPanel - Accessibility Tests', () => {
  it('should not have any accessibility violations', async () => {
    const { container } = render(<AccessibilityControlPanel />);
    const results = await axe(container);
    expect(results).toHaveNoViolations();
  });

  it('should have proper form labels', () => {
    const { getByLabelText } = render(<AccessibilityControlPanel />);
    
    expect(getByLabelText('Color Scheme')).toBeInTheDocument();
    expect(getByLabelText('High Contrast Mode')).toBeInTheDocument();
    expect(getByLabelText('Enable keyboard controls')).toBeInTheDocument();
  });

  it('should have status region for WCAG compliance', () => {
    const { getByRole } = render(<AccessibilityControlPanel />);
    
    const status = getByRole('status');
    expect(status).toHaveTextContent('WCAG 2.1 AA Compliant');
  });
});
