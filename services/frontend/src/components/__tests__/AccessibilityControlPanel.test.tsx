import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AccessibilityControlPanel } from '../AccessibilityControlPanel';
import { useAccessibilityStore } from '../../stores/accessibilityStore';

vi.mock('../../stores/accessibilityStore', () => ({
  useAccessibilityStore: vi.fn(),
}));

describe('AccessibilityControlPanel', () => {
  const mockStore = {
    highContrastEnabled: false,
    colorScheme: 'standard' as const,
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
  };

  beforeEach(() => {
    vi.mocked(useAccessibilityStore).mockReturnValue(mockStore);
  });

  it('should render accessibility settings panel', () => {
    render(<AccessibilityControlPanel />);
    
    expect(screen.getByText('Accessibility Settings')).toBeInTheDocument();
    expect(screen.getByLabelText('Color Scheme')).toBeInTheDocument();
  });

  it('should toggle high contrast mode', () => {
    render(<AccessibilityControlPanel />);
    
    const checkbox = screen.getByLabelText('High Contrast Mode');
    fireEvent.click(checkbox);
    
    expect(mockStore.setHighContrastEnabled).toHaveBeenCalledWith(true);
  });

  it('should change color scheme', () => {
    render(<AccessibilityControlPanel />);
    
    const select = screen.getByLabelText('Color Scheme');
    fireEvent.change(select, { target: { value: 'high-contrast' } });
    
    expect(mockStore.setColorScheme).toHaveBeenCalledWith('high-contrast');
  });

  it('should toggle keyboard navigation', () => {
    render(<AccessibilityControlPanel />);
    
    const checkbox = screen.getByLabelText('Enable keyboard controls');
    fireEvent.click(checkbox);
    
    expect(mockStore.setKeyboardNavigationEnabled).toHaveBeenCalledWith(false);
  });

  it('should show keyboard shortcuts when enabled', () => {
    render(<AccessibilityControlPanel />);
    
    expect(screen.getByText(/Arrow keys: Rotate view/)).toBeInTheDocument();
  });

  it('should have proper ARIA labels', () => {
    render(<AccessibilityControlPanel />);
    
    const region = screen.getByRole('region', { name: '3D View Accessibility Controls' });
    expect(region).toBeInTheDocument();
  });

  it('should indicate WCAG compliance', () => {
    render(<AccessibilityControlPanel />);
    
    expect(screen.getByText('WCAG 2.1 AA Compliant')).toBeInTheDocument();
  });
});
