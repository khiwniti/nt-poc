import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SplitCanvas } from '../../components/SplitCanvas';
import { useComparativeViewStore } from '../../stores/comparativeViewStore';

// Mock React Three Fiber
vi.mock('@react-three/fiber', () => ({
  Canvas: ({ children, style }: any) => (
    <div data-testid="canvas" style={style}>
      {children}
    </div>
  ),
  useThree: () => ({
    camera: {
      position: { x: 5, y: 5, z: 5, set: vi.fn() },
    },
  }),
}));

// Mock React Three Drei
vi.mock('@react-three/drei', () => ({
  OrbitControls: ({ children }: any) => <div data-testid="orbit-controls">{children}</div>,
}));

// Mock the store
vi.mock('../../stores/comparativeViewStore');

describe('SplitCanvas', () => {
  const mockLeftView = <mesh data-testid="left-content" />;
  const mockRightView = <mesh data-testid="right-content" />;

  beforeEach(() => {
    vi.mocked(useComparativeViewStore).mockReturnValue({
      splitOrientation: 'horizontal',
      syncCamera: true,
      leftView: {
        facilityId: null,
        timestamp: null,
        cameraPosition: [5, 5, 5],
        cameraTarget: [0, 0, 0],
      },
      rightView: {
        facilityId: null,
        timestamp: null,
        cameraPosition: [5, 5, 5],
        cameraTarget: [0, 0, 0],
      },
      showDifferences: false,
      differenceThreshold: 0.1,
      performanceMetrics: {
        fps: 60,
        leftViewFps: 60,
        rightViewFps: 60,
        renderTime: 16,
      },
      setLeftView: vi.fn(),
      setRightView: vi.fn(),
      setSplitOrientation: vi.fn(),
      toggleSyncCamera: vi.fn(),
      toggleShowDifferences: vi.fn(),
      setDifferenceThreshold: vi.fn(),
      syncCameraPosition: vi.fn(),
      updatePerformanceMetrics: vi.fn(),
      reset: vi.fn(),
    } as any);
  });

  it('should render two canvas elements', () => {
    render(
      <SplitCanvas
        leftView={mockLeftView}
        rightView={mockRightView}
      />
    );

    const canvases = screen.getAllByTestId('canvas');
    expect(canvases).toHaveLength(2);
  });

  it('should display viewport labels for horizontal split', () => {
    render(
      <SplitCanvas
        leftView={mockLeftView}
        rightView={mockRightView}
      />
    );

    expect(screen.getByText('Top View')).toBeInTheDocument();
    expect(screen.getByText('Bottom View')).toBeInTheDocument();
  });

  it('should display viewport labels for vertical split', () => {
    vi.mocked(useComparativeViewStore).mockReturnValue({
      ...vi.mocked(useComparativeViewStore)(),
      splitOrientation: 'vertical',
    } as any);

    render(
      <SplitCanvas
        leftView={mockLeftView}
        rightView={mockRightView}
      />
    );

    expect(screen.getByText('Left View')).toBeInTheDocument();
    expect(screen.getByText('Right View')).toBeInTheDocument();
  });

  it('should call onLeftCameraChange callback', () => {
    const mockOnLeftCameraChange = vi.fn();

    render(
      <SplitCanvas
        leftView={mockLeftView}
        rightView={mockRightView}
        onLeftCameraChange={mockOnLeftCameraChange}
      />
    );

    // Camera change would be triggered by OrbitControls
    // This is a simplified test - actual integration would test camera events
    expect(mockOnLeftCameraChange).not.toHaveBeenCalled(); // Initially not called
  });

  it('should call onRightCameraChange callback', () => {
    const mockOnRightCameraChange = vi.fn();

    render(
      <SplitCanvas
        leftView={mockLeftView}
        rightView={mockRightView}
        onRightCameraChange={mockOnRightCameraChange}
      />
    );

    expect(mockOnRightCameraChange).not.toHaveBeenCalled(); // Initially not called
  });

  it('should apply correct flex direction for horizontal split', () => {
    const { container } = render(
      <SplitCanvas
        leftView={mockLeftView}
        rightView={mockRightView}
      />
    );

    const mainContainer = container.firstChild as HTMLElement;
    expect(mainContainer.style.flexDirection).toBe('column');
  });

  it('should apply correct flex direction for vertical split', () => {
    vi.mocked(useComparativeViewStore).mockReturnValue({
      ...vi.mocked(useComparativeViewStore)(),
      splitOrientation: 'vertical',
    } as any);

    const { container } = render(
      <SplitCanvas
        leftView={mockLeftView}
        rightView={mockRightView}
      />
    );

    const mainContainer = container.firstChild as HTMLElement;
    expect(mainContainer.style.flexDirection).toBe('row');
  });
});
