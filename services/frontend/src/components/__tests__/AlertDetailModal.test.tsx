import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AlertDetailModal } from '../AlertDetailModal';
import { alertsApi } from '../../api/alerts';

vi.mock('../../api/alerts');

const mockAlert = {
  id: 'alert-1',
  batterySystemId: 'battery-1',
  zoneId: 'zone-1',
  type: 'Temperature High',
  severity: 'critical' as const,
  status: 'active' as const,
  message: 'Temperature exceeded threshold',
  createdAt: Date.now() - 3600000,
  metadata: {
    threshold: 45,
    actualValue: 52,
  },
};

const mockSensorHistory = {
  readings: [
    { timestamp: Date.now() - 3600000, temperature: 25, voltage: 3.7, soc: 85 },
    { timestamp: Date.now() - 1800000, temperature: 35, voltage: 3.6, soc: 80 },
    { timestamp: Date.now(), temperature: 52, voltage: 3.5, soc: 75 },
  ],
  timeline: [
    {
      timestamp: Date.now() - 3600000,
      event: 'Alert Created',
      user: 'System',
    },
  ],
};

describe('AlertDetailModal', () => {
  const mockOnClose = vi.fn();
  const mockOnUpdate = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading state initially', () => {
    vi.mocked(alertsApi.getAlert).mockImplementation(() => new Promise(() => {}));
    vi.mocked(alertsApi.getSensorHistory).mockImplementation(() => new Promise(() => {}));

    render(<AlertDetailModal alertId="alert-1" onClose={mockOnClose} onUpdate={mockOnUpdate} />);

    expect(screen.getByText(/loading alert details/i)).toBeInTheDocument();
  });

  it('renders alert details correctly', async () => {
    vi.mocked(alertsApi.getAlert).mockResolvedValue({ data: mockAlert });
    vi.mocked(alertsApi.getSensorHistory).mockResolvedValue(mockSensorHistory);

    render(<AlertDetailModal alertId="alert-1" onClose={mockOnClose} onUpdate={mockOnUpdate} />);

    await waitFor(() => {
      expect(screen.getByText('Alert Details')).toBeInTheDocument();
    });

    expect(screen.getByText('alert-1')).toBeInTheDocument();
    expect(screen.getByText('CRITICAL')).toBeInTheDocument();
    expect(screen.getByText('ACTIVE')).toBeInTheDocument();
    expect(screen.getByText('Temperature High')).toBeInTheDocument();
    expect(screen.getByText('Temperature exceeded threshold')).toBeInTheDocument();
    expect(screen.getByText('battery-1')).toBeInTheDocument();
    expect(screen.getByText('zone-1')).toBeInTheDocument();
  });

  it('displays metadata correctly', async () => {
    vi.mocked(alertsApi.getAlert).mockResolvedValue({ data: mockAlert });
    vi.mocked(alertsApi.getSensorHistory).mockResolvedValue(mockSensorHistory);

    render(<AlertDetailModal alertId="alert-1" onClose={mockOnClose} onUpdate={mockOnUpdate} />);

    await waitFor(() => {
      expect(screen.getByText('45.00')).toBeInTheDocument();
      expect(screen.getByText('52.00')).toBeInTheDocument();
    });
  });

  it('shows acknowledge button for active alerts', async () => {
    vi.mocked(alertsApi.getAlert).mockResolvedValue({ data: mockAlert });
    vi.mocked(alertsApi.getSensorHistory).mockResolvedValue(mockSensorHistory);

    render(<AlertDetailModal alertId="alert-1" onClose={mockOnClose} onUpdate={mockOnUpdate} />);

    await waitFor(() => {
      expect(screen.getByText('Acknowledge Alert')).toBeInTheDocument();
    });
  });

  it('handles acknowledge action', async () => {
    const acknowledgedAlert = { ...mockAlert, status: 'acknowledged' as const, acknowledgedAt: Date.now() };
    vi.mocked(alertsApi.getAlert).mockResolvedValueOnce({ data: mockAlert });
    vi.mocked(alertsApi.getSensorHistory).mockResolvedValue(mockSensorHistory);
    vi.mocked(alertsApi.acknowledgeAlert).mockResolvedValue({ data: acknowledgedAlert });

    render(<AlertDetailModal alertId="alert-1" onClose={mockOnClose} onUpdate={mockOnUpdate} />);

    await waitFor(() => {
      expect(screen.getByText('Acknowledge Alert')).toBeInTheDocument();
    });

    const acknowledgeButton = screen.getByText('Acknowledge Alert');
    fireEvent.click(acknowledgeButton);

    await waitFor(() => {
      expect(alertsApi.acknowledgeAlert).toHaveBeenCalledWith('alert-1');
      expect(mockOnUpdate).toHaveBeenCalled();
    });
  });

  it('handles resolve action with notes', async () => {
    const resolvedAlert = { ...mockAlert, status: 'resolved' as const, resolvedAt: Date.now() };
    vi.mocked(alertsApi.getAlert).mockResolvedValueOnce({ data: mockAlert });
    vi.mocked(alertsApi.getSensorHistory).mockResolvedValue(mockSensorHistory);
    vi.mocked(alertsApi.resolveAlert).mockResolvedValue({ data: resolvedAlert });

    render(<AlertDetailModal alertId="alert-1" onClose={mockOnClose} onUpdate={mockOnUpdate} />);

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/describe the resolution/i)).toBeInTheDocument();
    });

    const notesInput = screen.getByPlaceholderText(/describe the resolution/i);
    const resolveButton = screen.getByText('Resolve Alert');

    expect(resolveButton).toBeDisabled();

    fireEvent.change(notesInput, { target: { value: 'Fixed temperature issue' } });

    await waitFor(() => {
      expect(resolveButton).not.toBeDisabled();
    });

    fireEvent.click(resolveButton);

    await waitFor(() => {
      expect(alertsApi.resolveAlert).toHaveBeenCalledWith('alert-1', 'Fixed temperature issue');
      expect(mockOnUpdate).toHaveBeenCalled();
    });
  });

  it('shows resolved status for resolved alerts', async () => {
    const resolvedAlert = { ...mockAlert, status: 'resolved' as const, resolvedAt: Date.now() };
    vi.mocked(alertsApi.getAlert).mockResolvedValue({ data: resolvedAlert });
    vi.mocked(alertsApi.getSensorHistory).mockResolvedValue(mockSensorHistory);

    render(<AlertDetailModal alertId="alert-1" onClose={mockOnClose} onUpdate={mockOnUpdate} />);

    await waitFor(() => {
      expect(screen.getByText(/this alert has been resolved/i)).toBeInTheDocument();
    });

    expect(screen.queryByText('Acknowledge Alert')).not.toBeInTheDocument();
    expect(screen.queryByText('Resolve Alert')).not.toBeInTheDocument();
  });

  it('closes modal when close button is clicked', async () => {
    vi.mocked(alertsApi.getAlert).mockResolvedValue({ data: mockAlert });
    vi.mocked(alertsApi.getSensorHistory).mockResolvedValue(mockSensorHistory);

    render(<AlertDetailModal alertId="alert-1" onClose={mockOnClose} onUpdate={mockOnUpdate} />);

    await waitFor(() => {
      expect(screen.getByText('Alert Details')).toBeInTheDocument();
    });

    const closeButton = screen.getByRole('button', { name: '' });
    fireEvent.click(closeButton);

    expect(mockOnClose).toHaveBeenCalled();
  });

  it('displays sensor history chart', async () => {
    vi.mocked(alertsApi.getAlert).mockResolvedValue({ data: mockAlert });
    vi.mocked(alertsApi.getSensorHistory).mockResolvedValue(mockSensorHistory);

    render(<AlertDetailModal alertId="alert-1" onClose={mockOnClose} onUpdate={mockOnUpdate} />);

    await waitFor(() => {
      expect(screen.getByText('Historical Context (Last 24 Hours)')).toBeInTheDocument();
    });
  });

  it('displays timeline events', async () => {
    vi.mocked(alertsApi.getAlert).mockResolvedValue({ data: mockAlert });
    vi.mocked(alertsApi.getSensorHistory).mockResolvedValue(mockSensorHistory);

    render(<AlertDetailModal alertId="alert-1" onClose={mockOnClose} onUpdate={mockOnUpdate} />);

    await waitFor(() => {
      expect(screen.getByText('Alert Timeline')).toBeInTheDocument();
      expect(screen.getByText('Alert Created')).toBeInTheDocument();
    });
  });

  it('handles API errors gracefully', async () => {
    vi.mocked(alertsApi.getAlert).mockRejectedValue(new Error('Failed to fetch'));
    vi.mocked(alertsApi.getSensorHistory).mockRejectedValue(new Error('Failed to fetch'));

    render(<AlertDetailModal alertId="alert-1" onClose={mockOnClose} onUpdate={mockOnUpdate} />);

    // The modal should close itself when there's a fatal error and alert is null
    await waitFor(() => {
      expect(screen.queryByText('Alert Details')).not.toBeInTheDocument();
    });
  });
});
