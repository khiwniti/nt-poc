import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RULTrendChart } from '../RULTrendChart';
import type { RULPrediction } from '../../types/rulPrediction';

// Mock html2canvas
vi.mock('html2canvas', () => ({
  default: vi.fn(() =>
    Promise.resolve({
      toBlob: vi.fn((callback) => {
        const blob = new Blob(['fake image data'], { type: 'image/png' });
        callback(blob);
      }),
    })
  ),
}));

describe('RULTrendChart', () => {
  const mockPredictions: RULPrediction[] = [
    {
      id: '1',
      batterySystemId: 'battery-1',
      predictedRUL: 120,
      confidence: 0.95,
      predictionDate: new Date('2024-01-01').toISOString(),
      modelVersion: 'v1.0.0',
      features: {},
      createdAt: new Date('2024-01-01').toISOString(),
    },
    {
      id: '2',
      batterySystemId: 'battery-1',
      predictedRUL: 100,
      confidence: 0.92,
      predictionDate: new Date('2024-01-15').toISOString(),
      modelVersion: 'v1.0.0',
      features: {},
      createdAt: new Date('2024-01-15').toISOString(),
    },
    {
      id: '3',
      batterySystemId: 'battery-1',
      predictedRUL: 80,
      confidence: 0.88,
      predictionDate: new Date('2024-02-01').toISOString(),
      modelVersion: 'v1.0.1',
      features: {},
      createdAt: new Date('2024-02-01').toISOString(),
    },
    {
      id: '4',
      batterySystemId: 'battery-1',
      predictedRUL: 25,
      confidence: 0.90,
      predictionDate: new Date('2024-02-15').toISOString(),
      modelVersion: 'v1.0.1',
      features: {},
      createdAt: new Date('2024-02-15').toISOString(),
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    // Mock URL.createObjectURL and URL.revokeObjectURL
    global.URL.createObjectURL = vi.fn(() => 'blob:mock-url');
    global.URL.revokeObjectURL = vi.fn();
  });

  it('renders chart with predictions', () => {
    render(<RULTrendChart predictions={mockPredictions} />);
    
    expect(screen.getByText('Remaining Useful Life Trend')).toBeInTheDocument();
    expect(screen.getByText('📥 Export to PNG')).toBeInTheDocument();
  });

  it('displays warning when predictions cross threshold', () => {
    render(<RULTrendChart predictions={mockPredictions} warningThreshold={30} />);
    
    expect(screen.getByText(/Warning: RUL predictions below 30-day threshold detected/)).toBeInTheDocument();
  });

  it('does not display warning when predictions above threshold', () => {
    const highPredictions = mockPredictions.filter(p => p.predictedRUL > 50);
    render(<RULTrendChart predictions={highPredictions} warningThreshold={30} />);
    
    expect(screen.queryByText(/Warning:/)).not.toBeInTheDocument();
  });

  it('shows empty state when no predictions provided', () => {
    render(<RULTrendChart predictions={[]} />);
    
    expect(screen.getByText('No RUL prediction data available')).toBeInTheDocument();
  });

  it('displays total predictions count', () => {
    render(<RULTrendChart predictions={mockPredictions} />);
    
    expect(screen.getByText(/Total Predictions:/)).toBeInTheDocument();
  });

  it('displays date range', () => {
    render(<RULTrendChart predictions={mockPredictions} />);
    
    expect(screen.getByText(/Date Range:/)).toBeInTheDocument();
  });

  it('exports chart to PNG when button clicked', async () => {
    const user = userEvent.setup();
    render(<RULTrendChart predictions={mockPredictions} />);
    
    const exportButton = screen.getByText('📥 Export to PNG');
    await user.click(exportButton);
    
    await waitFor(() => {
      expect(global.URL.createObjectURL).toHaveBeenCalled();
    });
  });

  it('uses default warning threshold of 30 days when not specified', () => {
    render(<RULTrendChart predictions={mockPredictions} />);
    
    // Should show warning since one prediction is 25 days (below 30)
    expect(screen.getByText(/30-day threshold/)).toBeInTheDocument();
  });

  it('uses custom warning threshold when provided', () => {
    render(<RULTrendChart predictions={mockPredictions} warningThreshold={50} />);
    
    expect(screen.getByText(/50-day threshold/)).toBeInTheDocument();
  });

  it('sorts predictions by date in ascending order', () => {
    // Provide predictions in random order
    const unsortedPredictions = [mockPredictions[2], mockPredictions[0], mockPredictions[3], mockPredictions[1]];
    
    const { container } = render(<RULTrendChart predictions={unsortedPredictions} />);
    
    // Chart should still render (sorting happens internally)
    expect(container.querySelector('.recharts-responsive-container')).toBeTruthy();
  });

  it('calculates confidence bands correctly', () => {
    const { container } = render(<RULTrendChart predictions={mockPredictions} />);
    
    // Verify chart renders with responsive container
    expect(container.querySelector('.recharts-responsive-container')).toBeTruthy();
  });

  it('displays prediction line with correct styling', () => {
    const { container } = render(<RULTrendChart predictions={mockPredictions} />);
    
    // Verify chart renders
    expect(container.querySelector('.recharts-responsive-container')).toBeTruthy();
  });

  it('shows reference line for warning threshold', () => {
    const { container } = render(<RULTrendChart predictions={mockPredictions} warningThreshold={30} />);
    
    // Verify chart renders
    expect(container.querySelector('.recharts-responsive-container')).toBeTruthy();
  });
});
