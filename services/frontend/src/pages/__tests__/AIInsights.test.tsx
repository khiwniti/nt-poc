import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AIInsights } from '../AIInsights';
import * as rulPredictionsApi from '../../api/rulPredictions';
import type { RULPrediction } from '../../types/rulPrediction';

// Mock the API module
vi.mock('../../api/rulPredictions', () => ({
  getRULPredictions: vi.fn(),
  getLatestRULPrediction: vi.fn(),
}));

// Mock the RULTrendChart component
vi.mock('../../components/RULTrendChart', () => ({
  RULTrendChart: ({ predictions }: { predictions: RULPrediction[] }) => (
    <div data-testid="rul-trend-chart">Chart with {predictions.length} predictions</div>
  ),
}));

describe('AIInsights', () => {
  const mockPredictions: RULPrediction[] = [
    {
      id: '1',
      batterySystemId: 'battery-123',
      predictedRUL: 120,
      confidence: 0.95,
      predictionDate: new Date('2024-01-01').toISOString(),
      modelVersion: 'v1.0.0',
      features: {},
      createdAt: new Date('2024-01-01').toISOString(),
    },
    {
      id: '2',
      batterySystemId: 'battery-123',
      predictedRUL: 100,
      confidence: 0.92,
      predictionDate: new Date('2024-01-15').toISOString(),
      modelVersion: 'v1.0.0',
      features: {},
      createdAt: new Date('2024-01-15').toISOString(),
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the page with input field and load button', () => {
    render(<AIInsights />);
    
    expect(screen.getByText('AI Insights - RUL Predictions')).toBeInTheDocument();
    expect(screen.getByLabelText('Battery System ID')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Load Predictions/i })).toBeInTheDocument();
  });

  it('loads predictions when button is clicked', async () => {
    const user = userEvent.setup();
    vi.mocked(rulPredictionsApi.getRULPredictions).mockResolvedValue(mockPredictions);
    
    render(<AIInsights />);
    
    const input = screen.getByLabelText('Battery System ID');
    const loadButton = screen.getByRole('button', { name: /Load Predictions/i });
    
    await user.type(input, 'battery-123');
    await user.click(loadButton);
    
    await waitFor(() => {
      expect(rulPredictionsApi.getRULPredictions).toHaveBeenCalledWith('battery-123', 100, 0);
    });
    
    expect(screen.getByTestId('rul-trend-chart')).toBeInTheDocument();
  });

  it('loads predictions when Enter key is pressed', async () => {
    const user = userEvent.setup();
    vi.mocked(rulPredictionsApi.getRULPredictions).mockResolvedValue(mockPredictions);
    
    render(<AIInsights />);
    
    const input = screen.getByLabelText('Battery System ID');
    
    await user.type(input, 'battery-123{Enter}');
    
    await waitFor(() => {
      expect(rulPredictionsApi.getRULPredictions).toHaveBeenCalledWith('battery-123', 100, 0);
    });
  });

  it('shows error when battery system ID is empty', async () => {
    const user = userEvent.setup();
    
    render(<AIInsights />);
    
    const loadButton = screen.getByRole('button', { name: /Load Predictions/i });
    await user.click(loadButton);
    
    expect(screen.getByText('Please enter a battery system ID')).toBeInTheDocument();
  });

  it('shows error message when API call fails', async () => {
    const user = userEvent.setup();
    vi.mocked(rulPredictionsApi.getRULPredictions).mockRejectedValue(new Error('API Error: Not Found'));
    
    render(<AIInsights />);
    
    const input = screen.getByLabelText('Battery System ID');
    const loadButton = screen.getByRole('button', { name: /Load Predictions/i });
    
    await user.type(input, 'battery-123');
    await user.click(loadButton);
    
    await waitFor(() => {
      expect(screen.getByText(/API Error: Not Found/)).toBeInTheDocument();
    });
  });

  it('shows error when no predictions found', async () => {
    const user = userEvent.setup();
    vi.mocked(rulPredictionsApi.getRULPredictions).mockResolvedValue([]);
    
    render(<AIInsights />);
    
    const input = screen.getByLabelText('Battery System ID');
    const loadButton = screen.getByRole('button', { name: /Load Predictions/i });
    
    await user.type(input, 'battery-123');
    await user.click(loadButton);
    
    await waitFor(() => {
      expect(screen.getByText('No predictions found for this battery system')).toBeInTheDocument();
    });
  });

  it('displays loading state while fetching predictions', async () => {
    const user = userEvent.setup();
    vi.mocked(rulPredictionsApi.getRULPredictions).mockImplementation(
      () => new Promise((resolve) => setTimeout(() => resolve(mockPredictions), 100))
    );
    
    render(<AIInsights />);
    
    const input = screen.getByLabelText('Battery System ID');
    const loadButton = screen.getByRole('button', { name: /Load Predictions/i });
    
    await user.type(input, 'battery-123');
    await user.click(loadButton);
    
    expect(screen.getByText('Loading...')).toBeInTheDocument();
    expect(loadButton).toBeDisabled();
    
    await waitFor(() => {
      expect(screen.getByTestId('rul-trend-chart')).toBeInTheDocument();
    });
  });

  it('clears previous errors when loading new predictions', async () => {
    const user = userEvent.setup();
    vi.mocked(rulPredictionsApi.getRULPredictions)
      .mockRejectedValueOnce(new Error('First error'))
      .mockResolvedValueOnce(mockPredictions);
    
    render(<AIInsights />);
    
    const input = screen.getByLabelText('Battery System ID');
    const loadButton = screen.getByRole('button', { name: /Load Predictions/i });
    
    // First attempt - error
    await user.type(input, 'battery-123');
    await user.click(loadButton);
    
    await waitFor(() => {
      expect(screen.getByText(/First error/)).toBeInTheDocument();
    });
    
    // Second attempt - success
    await user.click(loadButton);
    
    await waitFor(() => {
      expect(screen.queryByText(/First error/)).not.toBeInTheDocument();
      expect(screen.getByTestId('rul-trend-chart')).toBeInTheDocument();
    });
  });

  it('trims whitespace from battery system ID', async () => {
    const user = userEvent.setup();
    vi.mocked(rulPredictionsApi.getRULPredictions).mockResolvedValue(mockPredictions);
    
    render(<AIInsights />);
    
    const input = screen.getByLabelText('Battery System ID');
    const loadButton = screen.getByRole('button', { name: /Load Predictions/i });
    
    await user.type(input, '  battery-123  ');
    await user.click(loadButton);
    
    await waitFor(() => {
      expect(rulPredictionsApi.getRULPredictions).toHaveBeenCalledWith('  battery-123  ', 100, 0);
    });
  });

  it('shows empty state initially', () => {
    render(<AIInsights />);
    
    // Initially no empty state is shown, just the input form
    expect(screen.getByLabelText('Battery System ID')).toBeInTheDocument();
    expect(screen.queryByText(/No predictions loaded/)).not.toBeInTheDocument();
  });
});
