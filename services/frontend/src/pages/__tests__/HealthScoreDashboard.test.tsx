import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { HealthScoreDashboard } from '../HealthScoreDashboard';
import * as batteryHealthApi from '../../api/batteryHealth';

vi.mock('../../api/batteryHealth');
vi.mock('recharts', () => ({
  ResponsiveContainer: ({ children }: any) => <div>{children}</div>,
  BarChart: ({ children }: any) => <div>{children}</div>,
  LineChart: ({ children }: any) => <div>{children}</div>,
  Bar: () => <div />,
  Line: () => <div />,
  XAxis: () => <div />,
  YAxis: () => <div />,
  CartesianGrid: () => <div />,
  Tooltip: () => <div />,
  Legend: () => <div />,
  Cell: () => <div />,
}));

describe('HealthScoreDashboard', () => {
  const mockSummary = {
    totalBatteries: 10,
    avgHealthScore: 82.5,
    atRiskCount: 2,
    healthyCount: 5,
    warningCount: 3,
  };

  const mockDistribution = [
    { bucket: '90-100', bucket_midpoint: 95, count: 5 },
    { bucket: '80-89', bucket_midpoint: 85, count: 3 },
    { bucket: '60-69', bucket_midpoint: 65, count: 2 },
  ];

  const mockAtRiskBatteries = [
    {
      id: 'bat-1',
      name: 'Battery 1',
      zone: 'Zone A',
      capacity_kwh: 100,
      health_score: 65,
      last_reading: '2024-01-10T10:00:00Z',
    },
    {
      id: 'bat-2',
      name: 'Battery 2',
      zone: 'Zone B',
      capacity_kwh: 150,
      health_score: 68,
      last_reading: '2024-01-10T10:00:00Z',
    },
  ];

  const mockTrend = [
    { date: '2024-01-01', avg_health_score: 85 },
    { date: '2024-01-02', avg_health_score: 84 },
    { date: '2024-01-03', avg_health_score: 83 },
  ];

  const mockZoneStats = [
    {
      zone: 'Zone A',
      battery_count: 4,
      avg_health_score: 75,
      min_health_score: 65,
      max_health_score: 85,
      at_risk_count: 1,
    },
    {
      zone: 'Zone B',
      battery_count: 6,
      avg_health_score: 87,
      min_health_score: 68,
      max_health_score: 95,
      at_risk_count: 1,
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the component with initial state', () => {
    render(<HealthScoreDashboard />);
    
    expect(screen.getByText('Health Score Dashboard')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Enter facility ID')).toBeInTheDocument();
    expect(screen.getByText('Load Dashboard')).toBeInTheDocument();
  });

  it('loads dashboard data when button is clicked', async () => {
    vi.mocked(batteryHealthApi.getHealthSummary).mockResolvedValue(mockSummary);
    vi.mocked(batteryHealthApi.getHealthDistribution).mockResolvedValue(mockDistribution);
    vi.mocked(batteryHealthApi.getAtRiskBatteries).mockResolvedValue({
      data: mockAtRiskBatteries,
      total: 2,
      threshold: 70,
    });
    vi.mocked(batteryHealthApi.getHealthTrend).mockResolvedValue(mockTrend);
    vi.mocked(batteryHealthApi.getZoneHealthStats).mockResolvedValue({
      data: mockZoneStats,
      total: 2,
    });

    render(<HealthScoreDashboard />);
    
    const input = screen.getByPlaceholderText('Enter facility ID');
    const button = screen.getByText('Load Dashboard');
    
    fireEvent.change(input, { target: { value: 'facility-123' } });
    fireEvent.click(button);

    await waitFor(() => {
      expect(batteryHealthApi.getHealthSummary).toHaveBeenCalledWith('facility-123');
    });

    expect(await screen.findByText('10')).toBeInTheDocument(); // Total Batteries
    expect(await screen.findByText('82.5')).toBeInTheDocument(); // Avg Health Score
    expect(await screen.findByText('5')).toBeInTheDocument(); // Healthy count
  });

  it('displays at-risk batteries list', async () => {
    vi.mocked(batteryHealthApi.getHealthSummary).mockResolvedValue(mockSummary);
    vi.mocked(batteryHealthApi.getHealthDistribution).mockResolvedValue(mockDistribution);
    vi.mocked(batteryHealthApi.getAtRiskBatteries).mockResolvedValue({
      data: mockAtRiskBatteries,
      total: 2,
      threshold: 70,
    });
    vi.mocked(batteryHealthApi.getHealthTrend).mockResolvedValue(mockTrend);
    vi.mocked(batteryHealthApi.getZoneHealthStats).mockResolvedValue({
      data: mockZoneStats,
      total: 2,
    });

    render(<HealthScoreDashboard />);
    
    const input = screen.getByPlaceholderText('Enter facility ID');
    fireEvent.change(input, { target: { value: 'facility-123' } });
    fireEvent.click(screen.getByText('Load Dashboard'));

    expect(await screen.findByText(/At-Risk Batteries/)).toBeInTheDocument();
    expect(await screen.findByText('Battery 1')).toBeInTheDocument();
    expect(await screen.findByText('Battery 2')).toBeInTheDocument();
  });

  it('displays zone health statistics', async () => {
    vi.mocked(batteryHealthApi.getHealthSummary).mockResolvedValue(mockSummary);
    vi.mocked(batteryHealthApi.getHealthDistribution).mockResolvedValue(mockDistribution);
    vi.mocked(batteryHealthApi.getAtRiskBatteries).mockResolvedValue({
      data: [],
      total: 0,
      threshold: 70,
    });
    vi.mocked(batteryHealthApi.getHealthTrend).mockResolvedValue(mockTrend);
    vi.mocked(batteryHealthApi.getZoneHealthStats).mockResolvedValue({
      data: mockZoneStats,
      total: 2,
    });

    render(<HealthScoreDashboard />);
    
    const input = screen.getByPlaceholderText('Enter facility ID');
    fireEvent.change(input, { target: { value: 'facility-123' } });
    fireEvent.click(screen.getByText('Load Dashboard'));

    expect(await screen.findByText('Zone-Level Health Aggregation')).toBeInTheDocument();
    expect(await screen.findByText('Zone A')).toBeInTheDocument();
    expect(await screen.findByText('Zone B')).toBeInTheDocument();
  });

  it('shows error message on API failure', async () => {
    vi.mocked(batteryHealthApi.getHealthSummary).mockRejectedValue(new Error('API Error'));

    render(<HealthScoreDashboard />);
    
    const input = screen.getByPlaceholderText('Enter facility ID');
    fireEvent.change(input, { target: { value: 'facility-123' } });
    fireEvent.click(screen.getByText('Load Dashboard'));

    expect(await screen.findByText('API Error')).toBeInTheDocument();
  });

  it('requires facility ID before loading', async () => {
    render(<HealthScoreDashboard />);
    
    const button = screen.getByText('Load Dashboard');
    fireEvent.click(button);

    expect(await screen.findByText('Please enter a facility ID')).toBeInTheDocument();
    expect(batteryHealthApi.getHealthSummary).not.toHaveBeenCalled();
  });

  it('enables export button after data is loaded', async () => {
    vi.mocked(batteryHealthApi.getHealthSummary).mockResolvedValue(mockSummary);
    vi.mocked(batteryHealthApi.getHealthDistribution).mockResolvedValue(mockDistribution);
    vi.mocked(batteryHealthApi.getAtRiskBatteries).mockResolvedValue({
      data: mockAtRiskBatteries,
      total: 2,
      threshold: 70,
    });
    vi.mocked(batteryHealthApi.getHealthTrend).mockResolvedValue(mockTrend);
    vi.mocked(batteryHealthApi.getZoneHealthStats).mockResolvedValue({
      data: mockZoneStats,
      total: 2,
    });

    render(<HealthScoreDashboard />);
    
    const input = screen.getByPlaceholderText('Enter facility ID');
    fireEvent.change(input, { target: { value: 'facility-123' } });
    fireEvent.click(screen.getByText('Load Dashboard'));

    expect(await screen.findByText('Export Report')).toBeInTheDocument();
  });
});
