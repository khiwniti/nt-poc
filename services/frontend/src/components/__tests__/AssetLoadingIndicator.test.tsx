import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { AssetLoadingIndicator } from '../AssetLoadingIndicator';

describe('AssetLoadingIndicator', () => {
  it('should render loading state with progress', () => {
    render(
      <AssetLoadingIndicator
        isLoading={true}
        progress={50}
        error={null}
        assetName="Test Model"
      />
    );

    expect(screen.getByText('Loading Test Model...')).toBeDefined();
    expect(screen.getByText('50%')).toBeDefined();
  });

  it('should render error state with retry button', () => {
    const onRetry = vi.fn();
    
    render(
      <AssetLoadingIndicator
        isLoading={false}
        progress={0}
        error="Network error"
        assetName="Test Model"
        onRetry={onRetry}
      />
    );

    expect(screen.getByText('Failed to load Test Model')).toBeDefined();
    expect(screen.getByText('Network error')).toBeDefined();
    
    const retryButton = screen.getByText('Retry');
    expect(retryButton).toBeDefined();
    
    fireEvent.click(retryButton);
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('should render error state without retry button when onRetry is not provided', () => {
    render(
      <AssetLoadingIndicator
        isLoading={false}
        progress={0}
        error="Network error"
        assetName="Test Model"
      />
    );

    expect(screen.getByText('Failed to load Test Model')).toBeDefined();
    expect(screen.queryByText('Retry')).toBeNull();
  });

  it('should render nothing when not loading and no error', () => {
    const { container } = render(
      <AssetLoadingIndicator
        isLoading={false}
        progress={100}
        error={null}
      />
    );

    expect(container.firstChild).toBeNull();
  });

  it('should use default asset name when not provided', () => {
    render(
      <AssetLoadingIndicator
        isLoading={true}
        progress={25}
        error={null}
      />
    );

    expect(screen.getByText('Loading Asset...')).toBeDefined();
  });

  it('should update progress bar width based on progress', () => {
    const { rerender, container } = render(
      <AssetLoadingIndicator
        isLoading={true}
        progress={30}
        error={null}
      />
    );

    let progressBar = container.querySelector('[style*="width: 30%"]');
    expect(progressBar).not.toBeNull();

    rerender(
      <AssetLoadingIndicator
        isLoading={true}
        progress={70}
        error={null}
      />
    );

    progressBar = container.querySelector('[style*="width: 70%"]');
    expect(progressBar).not.toBeNull();
  });

  it('should round progress percentage for display', () => {
    render(
      <AssetLoadingIndicator
        isLoading={true}
        progress={45.7}
        error={null}
      />
    );

    expect(screen.getByText('46%')).toBeDefined();
  });
});
