import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { HeatmapLegend } from '../HeatmapLegend';

describe('HeatmapLegend', () => {
  it('renders temperature legend correctly', () => {
    render(<HeatmapLegend metric="temperature" minValue={15} maxValue={35} />);
    
    expect(screen.getByText('Temperature')).toBeInTheDocument();
    expect(screen.getByText('15.0°C')).toBeInTheDocument();
    expect(screen.getByText('35.0°C')).toBeInTheDocument();
  });

  it('renders voltage legend correctly', () => {
    render(<HeatmapLegend metric="voltage" minValue={3.0} maxValue={4.2} />);
    
    expect(screen.getByText('Voltage')).toBeInTheDocument();
    expect(screen.getByText('3.0V')).toBeInTheDocument();
    expect(screen.getByText('4.2V')).toBeInTheDocument();
  });

  it('renders SoC legend correctly', () => {
    render(<HeatmapLegend metric="soc" minValue={20} maxValue={100} />);
    
    expect(screen.getByText('State of Charge')).toBeInTheDocument();
    expect(screen.getByText('20.0%')).toBeInTheDocument();
    expect(screen.getByText('100.0%')).toBeInTheDocument();
  });

  it('renders SoH legend correctly', () => {
    render(<HeatmapLegend metric="soh" minValue={70} maxValue={100} />);
    
    expect(screen.getByText('State of Health')).toBeInTheDocument();
    expect(screen.getByText('70.0%')).toBeInTheDocument();
    expect(screen.getByText('100.0%')).toBeInTheDocument();
  });

  it('displays middle value correctly', () => {
    render(<HeatmapLegend metric="temperature" minValue={10} maxValue={30} />);
    
    expect(screen.getByText('20.0°C')).toBeInTheDocument();
  });

  it('shows real-time facility distribution text', () => {
    render(<HeatmapLegend metric="temperature" minValue={15} maxValue={35} />);
    
    expect(screen.getByText('Real-time facility distribution')).toBeInTheDocument();
  });

  it('accepts custom unit override', () => {
    render(<HeatmapLegend metric="temperature" minValue={15} maxValue={35} unit="K" />);
    
    expect(screen.getByText('15.0K')).toBeInTheDocument();
    expect(screen.getByText('35.0K')).toBeInTheDocument();
  });
});
