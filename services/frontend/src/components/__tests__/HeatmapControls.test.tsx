import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { HeatmapControls } from '../HeatmapControls';

describe('HeatmapControls', () => {
  const defaultProps = {
    enabled: false,
    metric: 'temperature' as const,
    onToggle: vi.fn(),
    onMetricChange: vi.fn(),
  };

  it('renders the heatmap toggle', () => {
    render(<HeatmapControls {...defaultProps} />);
    expect(screen.getByText('Heatmap Overlay')).toBeInTheDocument();
  });

  it('shows metric options when enabled', () => {
    render(<HeatmapControls {...defaultProps} enabled={true} />);
    
    expect(screen.getByText('Temperature')).toBeInTheDocument();
    expect(screen.getByText('Voltage')).toBeInTheDocument();
    expect(screen.getByText('SoC')).toBeInTheDocument();
    expect(screen.getByText('SoH')).toBeInTheDocument();
  });

  it('hides metric options when disabled', () => {
    render(<HeatmapControls {...defaultProps} enabled={false} />);
    
    expect(screen.queryByText('Temperature')).not.toBeInTheDocument();
    expect(screen.queryByText('Voltage')).not.toBeInTheDocument();
  });

  it('calls onToggle when checkbox is clicked', () => {
    const onToggle = vi.fn();
    render(<HeatmapControls {...defaultProps} onToggle={onToggle} />);
    
    const checkbox = screen.getByRole('checkbox');
    fireEvent.click(checkbox);
    
    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  it('calls onMetricChange when metric button is clicked', () => {
    const onMetricChange = vi.fn();
    render(<HeatmapControls {...defaultProps} enabled={true} onMetricChange={onMetricChange} />);
    
    const voltageButton = screen.getByText('Voltage');
    fireEvent.click(voltageButton);
    
    expect(onMetricChange).toHaveBeenCalledWith('voltage');
  });

  it('highlights the selected metric', () => {
    render(<HeatmapControls {...defaultProps} enabled={true} metric="voltage" />);
    
    const voltageButton = screen.getByText('Voltage').closest('button');
    expect(voltageButton).toHaveStyle({ backgroundColor: '#E3F2FD' });
  });

  it('checkbox reflects enabled state', () => {
    const { rerender } = render(<HeatmapControls {...defaultProps} enabled={false} />);
    
    let checkbox = screen.getByRole('checkbox') as HTMLInputElement;
    expect(checkbox.checked).toBe(false);
    
    rerender(<HeatmapControls {...defaultProps} enabled={true} />);
    checkbox = screen.getByRole('checkbox') as HTMLInputElement;
    expect(checkbox.checked).toBe(true);
  });
});
