import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { OfflineBanner } from '../OfflineBanner';
import * as useOnlineStatusModule from '../../hooks/useOnlineStatus';

vi.mock('../../hooks/useOnlineStatus');

describe('OfflineBanner', () => {
  it('should not render when online', () => {
    vi.spyOn(useOnlineStatusModule, 'useOnlineStatus').mockReturnValue(true);
    
    const { container } = render(<OfflineBanner />);
    
    expect(container.firstChild).toBeNull();
  });

  it('should render banner when offline', () => {
    vi.spyOn(useOnlineStatusModule, 'useOnlineStatus').mockReturnValue(false);
    
    render(<OfflineBanner />);
    
    expect(screen.getByText(/you are offline/i)).toBeTruthy();
  });

  it('should display wifi off icon when offline', () => {
    vi.spyOn(useOnlineStatusModule, 'useOnlineStatus').mockReturnValue(false);
    
    const { container } = render(<OfflineBanner />);
    
    expect(container.querySelector('svg')).toBeTruthy();
  });
});
