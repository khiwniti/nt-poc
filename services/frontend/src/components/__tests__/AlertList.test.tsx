import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AlertList } from '../AlertList';
import { alertsApi } from '../../api/alerts';

vi.mock('../../api/alerts');

const now = Date.now();

const baseAlert = {
  batterySystemId: 'battery-1',
  zoneId: 'zone-1',
  type: 'Temperature High',
  severity: 'warning' as const,
  status: 'active' as const,
  message: 'Temperature exceeded threshold',
  createdAt: now - 1000,
};

describe('AlertList', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders required columns', () => {
    render(
      <AlertList
        alerts={[
          { ...baseAlert, id: 'a1' },
          { ...baseAlert, id: 'a2', severity: 'critical', message: 'Critical alert', createdAt: now },
        ]}
      />
    );

    expect(screen.getByText(/severity/i)).toBeInTheDocument();
    expect(screen.getByText(/type/i)).toBeInTheDocument();
    expect(screen.getByText(/message/i)).toBeInTheDocument();
    expect(screen.getByText(/time/i)).toBeInTheDocument();
    expect(screen.getByText(/status/i)).toBeInTheDocument();
    expect(screen.getByText(/actions/i)).toBeInTheDocument();
  });

  it('supports pagination controls', () => {
    render(
      <AlertList
        alerts={[
          { ...baseAlert, id: 'a1', message: 'First alert', createdAt: now - 2000 },
          { ...baseAlert, id: 'a2', message: 'Second alert', createdAt: now - 1000 },
        ]}
        defaultPageSize={1}
      />
    );

    expect(screen.getByText('Second alert')).toBeInTheDocument();
    fireEvent.click(screen.getByLabelText(/next page/i));
    expect(screen.getByText('First alert')).toBeInTheDocument();
  });

  it('acknowledges selected active alerts (bulk)', async () => {
    vi.mocked(alertsApi.acknowledgeAlert).mockResolvedValue({ data: { ...baseAlert, id: 'a1', status: 'acknowledged' } as any });

    const onRefresh = vi.fn();
    render(
      <AlertList
        alerts={[
          { ...baseAlert, id: 'a1', status: 'active', message: 'Active alert' },
          { ...baseAlert, id: 'a2', status: 'acknowledged', message: 'Acked alert' },
        ]}
        onRefresh={onRefresh}
      />
    );

    fireEvent.click(screen.getByLabelText('Select alert a1'));
    fireEvent.click(screen.getByLabelText('Select alert a2'));

    fireEvent.click(screen.getByText(/acknowledge selected/i));

    await waitFor(() => {
      expect(alertsApi.acknowledgeAlert).toHaveBeenCalledTimes(1);
      expect(alertsApi.acknowledgeAlert).toHaveBeenCalledWith('a1');
      expect(onRefresh).toHaveBeenCalled();
    });
  });

  it('acknowledges a single active alert', async () => {
    vi.mocked(alertsApi.acknowledgeAlert).mockResolvedValue({ data: { ...baseAlert, id: 'a1', status: 'acknowledged' } as any });
    const onRefresh = vi.fn();

    render(<AlertList alerts={[{ ...baseAlert, id: 'a1', status: 'active' }]} onRefresh={onRefresh} />);

    fireEvent.click(screen.getByText('Acknowledge'));

    await waitFor(() => {
      expect(alertsApi.acknowledgeAlert).toHaveBeenCalledWith('a1');
      expect(onRefresh).toHaveBeenCalled();
    });
  });
});

