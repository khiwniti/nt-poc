import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AlertSoundSettings } from '../AlertSoundSettings';

// Mock the store
vi.mock('../../stores/alertSoundStore', () => ({
  useAlertSoundStore: () => ({
    settings: {
      enabled: true,
      volume: 0.7,
      respectReducedMotion: true,
    },
    setEnabled: vi.fn(),
    setVolume: vi.fn(),
    setRespectReducedMotion: vi.fn(),
  }),
}));

// Mock the sound player
vi.mock('../../utils/alertSounds', () => ({
  getAlertSoundPlayer: () => ({
    setVolume: vi.fn(),
    playSeverityBeep: vi.fn().mockResolvedValue(undefined),
    resume: vi.fn().mockResolvedValue(undefined),
  }),
}));

describe('AlertSoundSettings', () => {
  it('should render sound notification settings', () => {
    render(<AlertSoundSettings />);

    expect(screen.getByText('Alert Sound Notifications')).toBeInTheDocument();
    expect(screen.getByText('Sound Notifications')).toBeInTheDocument();
  });

  it('should display enabled status', () => {
    render(<AlertSoundSettings />);

    expect(screen.getByText('Enabled')).toBeInTheDocument();
  });

  it('should display mute button', () => {
    render(<AlertSoundSettings />);

    const muteButton = screen.getByRole('button', { name: /mute alerts/i });
    expect(muteButton).toBeInTheDocument();
  });

  it('should display volume slider', () => {
    render(<AlertSoundSettings />);

    const volumeSlider = screen.getByLabelText('Alert sound volume');
    expect(volumeSlider).toBeInTheDocument();
    expect(volumeSlider).toHaveAttribute('type', 'range');
  });

  it('should display volume percentage', () => {
    render(<AlertSoundSettings />);

    expect(screen.getByText(/Volume: 70%/)).toBeInTheDocument();
  });

  it('should display test sound buttons', () => {
    render(<AlertSoundSettings />);

    expect(screen.getByRole('button', { name: /critical/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /high/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /medium/i })).toBeInTheDocument();
  });

  it('should display reduced motion checkbox', () => {
    render(<AlertSoundSettings />);

    const checkbox = screen.getByRole('checkbox');
    expect(checkbox).toBeInTheDocument();
    expect(screen.getByText(/Respect reduced motion preference/)).toBeInTheDocument();
  });

  it('should handle volume changes', () => {
    render(<AlertSoundSettings />);

    const volumeSlider = screen.getByLabelText('Alert sound volume');
    fireEvent.change(volumeSlider, { target: { value: '0.5' } });

    // Note: The actual store update is mocked
  });
});
