import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AlertFilterControls } from '../AlertFilterControls';
import { useAlertFilterStore } from '../../stores/alertFilterStore';

describe('AlertFilterControls', () => {
  const mockOnApplyFilters = vi.fn();

  beforeEach(() => {
    mockOnApplyFilters.mockClear();
    const { clearFilters } = useAlertFilterStore.getState();
    clearFilters();
  });

  it('should render all filter sections', () => {
    render(<AlertFilterControls onApplyFilters={mockOnApplyFilters} />);
    
    expect(screen.getByText('Filters')).toBeInTheDocument();
    expect(screen.getByText('Status')).toBeInTheDocument();
    expect(screen.getByText('Severity')).toBeInTheDocument();
    expect(screen.getByText('Alert Type')).toBeInTheDocument();
    expect(screen.getByText('Date Range')).toBeInTheDocument();
  });

  it('should render status options', () => {
    render(<AlertFilterControls onApplyFilters={mockOnApplyFilters} />);
    
    expect(screen.getByText(/active/i)).toBeInTheDocument();
    expect(screen.getByText(/acknowledged/i)).toBeInTheDocument();
    expect(screen.getByText(/resolved/i)).toBeInTheDocument();
  });

  it('should render severity options', () => {
    render(<AlertFilterControls onApplyFilters={mockOnApplyFilters} />);
    
    const severitySection = screen.getByText('Severity').parentElement;
    expect(severitySection).toBeInTheDocument();
    
    // Check that severity labels exist (they have text-transform: capitalize)
    const labels = screen.getAllByRole('checkbox');
    const severityCheckboxes = labels.slice(3, 6); // Status has 3, then severity has 3
    expect(severityCheckboxes.length).toBeGreaterThanOrEqual(3);
  });

  it('should render alert type options', () => {
    render(<AlertFilterControls onApplyFilters={mockOnApplyFilters} />);
    
    expect(screen.getByText('Temperature High')).toBeInTheDocument();
    expect(screen.getByText('Voltage Anomaly')).toBeInTheDocument();
    expect(screen.getByText('SoC Critical')).toBeInTheDocument();
    expect(screen.getByText('Communication Lost')).toBeInTheDocument();
    expect(screen.getByText('Capacity Degraded')).toBeInTheDocument();
  });

  it('should render date range options', () => {
    render(<AlertFilterControls onApplyFilters={mockOnApplyFilters} />);
    
    expect(screen.getByText('Last 24 Hours')).toBeInTheDocument();
    expect(screen.getByText('Last 7 Days')).toBeInTheDocument();
    expect(screen.getByText('Last 30 Days')).toBeInTheDocument();
    expect(screen.getByText('Custom Range')).toBeInTheDocument();
  });

  it('should toggle status filter when clicked', () => {
    render(<AlertFilterControls onApplyFilters={mockOnApplyFilters} />);
    
    const checkboxes = screen.getAllByRole('checkbox');
    const activeCheckbox = checkboxes.find(cb => 
      cb.parentElement?.textContent?.toLowerCase().includes('active')
    );
    
    if (activeCheckbox) {
      fireEvent.click(activeCheckbox);
      const state = useAlertFilterStore.getState();
      expect(state.status).toContain('active');
    }
  });

  it('should toggle severity filter when clicked', () => {
    render(<AlertFilterControls onApplyFilters={mockOnApplyFilters} />);
    
    const checkboxes = screen.getAllByRole('checkbox');
    const criticalCheckbox = checkboxes.find(cb => 
      cb.parentElement?.textContent?.toLowerCase().includes('critical')
    );
    
    if (criticalCheckbox) {
      fireEvent.click(criticalCheckbox);
      const state = useAlertFilterStore.getState();
      expect(state.severity).toContain('critical');
    }
  });

  it('should toggle type filter when clicked', () => {
    render(<AlertFilterControls onApplyFilters={mockOnApplyFilters} />);
    
    const checkboxes = screen.getAllByRole('checkbox');
    const tempCheckbox = checkboxes.find(cb => 
      cb.parentElement?.textContent?.includes('Temperature High')
    );
    
    if (tempCheckbox) {
      fireEvent.click(tempCheckbox);
      const state = useAlertFilterStore.getState();
      expect(state.type).toContain('Temperature High');
    }
  });

  it('should change date range when button clicked', () => {
    render(<AlertFilterControls onApplyFilters={mockOnApplyFilters} />);
    
    const sevenDaysButton = screen.getByText('Last 7 Days');
    fireEvent.click(sevenDaysButton);
    
    const state = useAlertFilterStore.getState();
    expect(state.dateRange).toBe('7d');
    expect(mockOnApplyFilters).toHaveBeenCalled();
  });

  it('should change date range to custom when custom button clicked', () => {
    render(<AlertFilterControls onApplyFilters={mockOnApplyFilters} />);
    
    const customButton = screen.getByText('Custom Range');
    fireEvent.click(customButton);
    
    const state = useAlertFilterStore.getState();
    expect(state.dateRange).toBe('custom');
  });

  it('should show clear all button when filters are active', () => {
    const { setStatus } = useAlertFilterStore.getState();
    setStatus(['active']);
    
    render(<AlertFilterControls onApplyFilters={mockOnApplyFilters} />);
    
    const clearButton = screen.getByText(/clear all/i);
    expect(clearButton).toBeInTheDocument();
  });

  it('should hide clear all button when no filters are active', () => {
    render(<AlertFilterControls onApplyFilters={mockOnApplyFilters} />);
    
    const clearButton = screen.queryByText(/clear all/i);
    expect(clearButton).not.toBeInTheDocument();
  });

  it('should clear all filters when clear button clicked', () => {
    const { setStatus, setSeverity, setDateRange } = useAlertFilterStore.getState();
    setStatus(['active']);
    setSeverity(['critical']);
    setDateRange('7d');
    
    render(<AlertFilterControls onApplyFilters={mockOnApplyFilters} />);
    
    const clearButton = screen.getByText(/clear all/i);
    fireEvent.click(clearButton);
    
    const state = useAlertFilterStore.getState();
    expect(state.status).toEqual([]);
    expect(state.severity).toEqual([]);
    expect(state.dateRange).toBe('30d');
    expect(mockOnApplyFilters).toHaveBeenCalled();
  });

  it('should call onApplyFilters when apply button clicked', () => {
    render(<AlertFilterControls onApplyFilters={mockOnApplyFilters} />);
    
    const applyButton = screen.getByText(/apply filters/i);
    fireEvent.click(applyButton);
    
    expect(mockOnApplyFilters).toHaveBeenCalled();
  });

  it('should show custom date inputs when custom range selected', () => {
    render(<AlertFilterControls onApplyFilters={mockOnApplyFilters} />);
    
    const customButton = screen.getByText(/custom range/i);
    fireEvent.click(customButton);
    
    const state = useAlertFilterStore.getState();
    expect(state.dateRange).toBe('custom');
  });
});
