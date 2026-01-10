import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ClusterMarker } from '../ClusterMarker';

describe('ClusterMarker', () => {
  it('renders with correct count', () => {
    render(<ClusterMarker count={5} healthBreakdown={{ healthy: 3, warning: 1, critical: 1 }} />);

    const marker = screen.getByTestId('cluster-marker');
    expect(marker).toBeInTheDocument();
    expect(marker).toHaveAttribute('data-count', '5');
  });

  it('displays the count number', () => {
    render(<ClusterMarker count={12} healthBreakdown={{ healthy: 10, warning: 2, critical: 0 }} />);

    expect(screen.getByText('12')).toBeInTheDocument();
  });

  it('has correct aria-label', () => {
    render(<ClusterMarker count={8} healthBreakdown={{ healthy: 5, warning: 2, critical: 1 }} />);

    const marker = screen.getByRole('button');
    expect(marker).toHaveAttribute('aria-label', 'Cluster of 8 facilities');
  });

  it('is keyboard accessible', () => {
    render(<ClusterMarker count={3} healthBreakdown={{ healthy: 1, warning: 1, critical: 1 }} />);

    const marker = screen.getByRole('button');
    expect(marker).toHaveAttribute('tabIndex', '0');
  });

  it('handles all healthy facilities', () => {
    render(<ClusterMarker count={5} healthBreakdown={{ healthy: 5, warning: 0, critical: 0 }} />);

    expect(screen.getByTestId('cluster-marker')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();
  });

  it('handles mixed health statuses', () => {
    render(<ClusterMarker count={10} healthBreakdown={{ healthy: 6, warning: 3, critical: 1 }} />);

    expect(screen.getByTestId('cluster-marker')).toBeInTheDocument();
    expect(screen.getByText('10')).toBeInTheDocument();
  });
});
