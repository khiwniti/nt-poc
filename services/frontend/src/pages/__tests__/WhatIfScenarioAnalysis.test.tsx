import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { WhatIfScenarioAnalysis } from '../WhatIfScenarioAnalysis';
import * as whatIfApi from '../../api/whatIfScenario';

vi.mock('../../api/whatIfScenario');

describe('WhatIfScenarioAnalysis', () => {
  const mockCurrentPrediction = {
    rul: 180,
    healthScore: 85,
    confidence: 0.92,
    parameters: {
      temperature: 25,
      loadPercentage: 50,
      cycleFrequency: 1,
    },
  };

  const mockSimulatedPrediction = {
    rul: 150,
    healthScore: 75,
    confidence: 0.88,
    parameters: {
      temperature: 35,
      loadPercentage: 80,
      cycleFrequency: 2,
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the component with initial state', () => {
    render(<WhatIfScenarioAnalysis />);
    
    expect(screen.getByText('What-If Scenario Analysis')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Enter battery system UUID')).toBeInTheDocument();
    expect(screen.getByText('Load Current State')).toBeInTheDocument();
  });

  it('loads current prediction when button is clicked', async () => {
    vi.mocked(whatIfApi.getCurrentPrediction).mockResolvedValue(mockCurrentPrediction);
    vi.mocked(whatIfApi.getSavedScenarios).mockResolvedValue([]);

    render(<WhatIfScenarioAnalysis />);
    
    const input = screen.getByPlaceholderText('Enter battery system UUID');
    const button = screen.getByText('Load Current State');

    fireEvent.change(input, { target: { value: 'test-battery-id' } });
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByText('Current State')).toBeInTheDocument();
      expect(screen.getByText('180.0 days')).toBeInTheDocument();
      expect(screen.getByText('85.0')).toBeInTheDocument();
    });

    expect(whatIfApi.getCurrentPrediction).toHaveBeenCalledWith('test-battery-id');
  });

  it('shows error when battery ID is empty', async () => {
    render(<WhatIfScenarioAnalysis />);
    
    const button = screen.getByText('Load Current State');
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByText('Please enter a battery system ID')).toBeInTheDocument();
    });
  });

  it('displays parameter sliders after loading current prediction', async () => {
    vi.mocked(whatIfApi.getCurrentPrediction).mockResolvedValue(mockCurrentPrediction);
    vi.mocked(whatIfApi.getSavedScenarios).mockResolvedValue([]);

    render(<WhatIfScenarioAnalysis />);
    
    const input = screen.getByPlaceholderText('Enter battery system UUID');
    fireEvent.change(input, { target: { value: 'test-battery-id' } });
    
    const button = screen.getByText('Load Current State');
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByLabelText(/Temperature/)).toBeInTheDocument();
      expect(screen.getByLabelText(/Load Percentage/)).toBeInTheDocument();
      expect(screen.getByLabelText(/Cycle Frequency/)).toBeInTheDocument();
      expect(screen.getByText('▶ Run Simulation')).toBeInTheDocument();
    });
  });

  it('simulates scenario when parameters are changed and button clicked', async () => {
    vi.mocked(whatIfApi.getCurrentPrediction).mockResolvedValue(mockCurrentPrediction);
    vi.mocked(whatIfApi.simulateScenario).mockResolvedValue(mockSimulatedPrediction);
    vi.mocked(whatIfApi.getSavedScenarios).mockResolvedValue([]);

    render(<WhatIfScenarioAnalysis />);
    
    const input = screen.getByPlaceholderText('Enter battery system UUID');
    fireEvent.change(input, { target: { value: 'test-battery-id' } });
    
    fireEvent.click(screen.getByText('Load Current State'));

    await waitFor(() => {
      expect(screen.getByText('▶ Run Simulation')).toBeInTheDocument();
    });

    const tempSlider = screen.getByLabelText(/Temperature/);
    fireEvent.change(tempSlider, { target: { value: '35' } });

    const simulateButton = screen.getByText('▶ Run Simulation');
    fireEvent.click(simulateButton);

    await waitFor(() => {
      expect(screen.getByText('Simulated Scenario')).toBeInTheDocument();
      expect(screen.getByText('150.0 days')).toBeInTheDocument();
    });

    expect(whatIfApi.simulateScenario).toHaveBeenCalled();
  });

  it('displays comparison delta after simulation', async () => {
    vi.mocked(whatIfApi.getCurrentPrediction).mockResolvedValue(mockCurrentPrediction);
    vi.mocked(whatIfApi.simulateScenario).mockResolvedValue(mockSimulatedPrediction);
    vi.mocked(whatIfApi.getSavedScenarios).mockResolvedValue([]);

    render(<WhatIfScenarioAnalysis />);
    
    const input = screen.getByPlaceholderText('Enter battery system UUID');
    fireEvent.change(input, { target: { value: 'test-battery-id' } });
    
    fireEvent.click(screen.getByText('Load Current State'));

    await waitFor(() => {
      expect(screen.getByText('▶ Run Simulation')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('▶ Run Simulation'));

    await waitFor(() => {
      expect(screen.getByText('Impact Analysis')).toBeInTheDocument();
      expect(screen.getByText('RUL Change')).toBeInTheDocument();
      expect(screen.getByText('Health Change')).toBeInTheDocument();
      expect(screen.getByText('💾 Save Scenario')).toBeInTheDocument();
    });
  });

  it('opens save dialog when save scenario button is clicked', async () => {
    vi.mocked(whatIfApi.getCurrentPrediction).mockResolvedValue(mockCurrentPrediction);
    vi.mocked(whatIfApi.simulateScenario).mockResolvedValue(mockSimulatedPrediction);
    vi.mocked(whatIfApi.getSavedScenarios).mockResolvedValue([]);

    render(<WhatIfScenarioAnalysis />);
    
    const input = screen.getByPlaceholderText('Enter battery system UUID');
    fireEvent.change(input, { target: { value: 'test-battery-id' } });
    
    fireEvent.click(screen.getByText('Load Current State'));

    await waitFor(() => {
      expect(screen.getByText('▶ Run Simulation')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('▶ Run Simulation'));

    await waitFor(() => {
      expect(screen.getByText('💾 Save Scenario')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('💾 Save Scenario'));

    await waitFor(() => {
      expect(screen.getByText('Save Scenario')).toBeInTheDocument();
      expect(screen.getByPlaceholderText(/High Temperature Operation/)).toBeInTheDocument();
    });
  });

  it('saves scenario with name and description', async () => {
    vi.mocked(whatIfApi.getCurrentPrediction).mockResolvedValue(mockCurrentPrediction);
    vi.mocked(whatIfApi.simulateScenario).mockResolvedValue(mockSimulatedPrediction);
    vi.mocked(whatIfApi.getSavedScenarios).mockResolvedValue([]);
    vi.mocked(whatIfApi.saveScenario).mockResolvedValue({
      id: 'scenario-1',
      name: 'Test Scenario',
      description: 'Test description',
      parameters: mockSimulatedPrediction.parameters,
      prediction: mockSimulatedPrediction,
      createdAt: new Date().toISOString(),
    });

    render(<WhatIfScenarioAnalysis />);
    
    const input = screen.getByPlaceholderText('Enter battery system UUID');
    fireEvent.change(input, { target: { value: 'test-battery-id' } });
    
    fireEvent.click(screen.getByText('Load Current State'));

    await waitFor(() => {
      expect(screen.getByText('▶ Run Simulation')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('▶ Run Simulation'));

    await waitFor(() => {
      expect(screen.getByText('💾 Save Scenario')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('💾 Save Scenario'));

    await waitFor(() => {
      const nameInput = screen.getByPlaceholderText(/High Temperature Operation/);
      fireEvent.change(nameInput, { target: { value: 'Test Scenario' } });
    });

    const saveButton = screen.getAllByText('Save').find(el => el.tagName === 'BUTTON');
    fireEvent.click(saveButton!);

    await waitFor(() => {
      expect(whatIfApi.saveScenario).toHaveBeenCalled();
    });
  });

  it('loads saved scenarios for battery system', async () => {
    const savedScenarios = [
      {
        id: 'scenario-1',
        name: 'High Temperature',
        description: 'Test scenario',
        parameters: mockSimulatedPrediction.parameters,
        prediction: mockSimulatedPrediction,
        createdAt: new Date().toISOString(),
      },
    ];

    vi.mocked(whatIfApi.getCurrentPrediction).mockResolvedValue(mockCurrentPrediction);
    vi.mocked(whatIfApi.getSavedScenarios).mockResolvedValue(savedScenarios);

    render(<WhatIfScenarioAnalysis />);
    
    const input = screen.getByPlaceholderText('Enter battery system UUID');
    fireEvent.change(input, { target: { value: 'test-battery-id' } });
    
    fireEvent.click(screen.getByText('Load Current State'));

    await waitFor(() => {
      expect(screen.getByText('Saved Scenarios')).toBeInTheDocument();
      expect(screen.getByText('High Temperature')).toBeInTheDocument();
    });
  });

  it('deletes saved scenario when delete button is clicked', async () => {
    const savedScenarios = [
      {
        id: 'scenario-1',
        name: 'High Temperature',
        description: 'Test scenario',
        parameters: mockSimulatedPrediction.parameters,
        prediction: mockSimulatedPrediction,
        createdAt: new Date().toISOString(),
      },
    ];

    vi.mocked(whatIfApi.getCurrentPrediction).mockResolvedValue(mockCurrentPrediction);
    vi.mocked(whatIfApi.getSavedScenarios)
      .mockResolvedValueOnce(savedScenarios)
      .mockResolvedValueOnce([]);
    vi.mocked(whatIfApi.deleteScenario).mockResolvedValue();

    render(<WhatIfScenarioAnalysis />);
    
    const input = screen.getByPlaceholderText('Enter battery system UUID');
    fireEvent.change(input, { target: { value: 'test-battery-id' } });
    
    fireEvent.click(screen.getByText('Load Current State'));

    await waitFor(() => {
      expect(screen.getByText('High Temperature')).toBeInTheDocument();
    });

    const deleteButton = screen.getByText('🗑️');
    fireEvent.click(deleteButton);

    await waitFor(() => {
      expect(whatIfApi.deleteScenario).toHaveBeenCalledWith('scenario-1');
    });
  });
});
