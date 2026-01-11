import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { MapExportControls } from '../MapExportControls';

describe('MapExportControls', () => {
  it('should render export button', () => {
    const onExport = vi.fn();
    render(<MapExportControls onExport={onExport} />);

    expect(screen.getByTestId('export-button')).toBeInTheDocument();
    expect(screen.getByLabelText('Export map')).toBeInTheDocument();
  });

  it('should open menu on button click', () => {
    const onExport = vi.fn();
    render(<MapExportControls onExport={onExport} />);

    const button = screen.getByTestId('export-button');
    fireEvent.click(button);

    expect(screen.getByTestId('export-menu')).toBeInTheDocument();
    expect(screen.getByTestId('export-png')).toBeInTheDocument();
    expect(screen.getByTestId('export-geojson')).toBeInTheDocument();
    expect(screen.getByTestId('export-kml')).toBeInTheDocument();
  });

  it('should close menu after selecting format', () => {
    const onExport = vi.fn();
    render(<MapExportControls onExport={onExport} />);

    const button = screen.getByTestId('export-button');
    fireEvent.click(button);

    const pngOption = screen.getByTestId('export-png');
    fireEvent.click(pngOption);

    expect(onExport).toHaveBeenCalledWith('png');
    expect(screen.queryByTestId('export-menu')).not.toBeInTheDocument();
  });

  it('should call onExport with geojson format', () => {
    const onExport = vi.fn();
    render(<MapExportControls onExport={onExport} />);

    fireEvent.click(screen.getByTestId('export-button'));
    fireEvent.click(screen.getByTestId('export-geojson'));

    expect(onExport).toHaveBeenCalledWith('geojson');
  });

  it('should call onExport with kml format', () => {
    const onExport = vi.fn();
    render(<MapExportControls onExport={onExport} />);

    fireEvent.click(screen.getByTestId('export-button'));
    fireEvent.click(screen.getByTestId('export-kml'));

    expect(onExport).toHaveBeenCalledWith('kml');
  });

  it('should disable button when disabled prop is true', () => {
    const onExport = vi.fn();
    render(<MapExportControls onExport={onExport} disabled />);

    const button = screen.getByTestId('export-button') as HTMLButtonElement;
    expect(button.disabled).toBe(true);
  });

  it('should support keyboard navigation', () => {
    const onExport = vi.fn();
    render(<MapExportControls onExport={onExport} />);

    fireEvent.click(screen.getByTestId('export-button'));
    const pngOption = screen.getByTestId('export-png');

    fireEvent.keyDown(pngOption, { key: 'Enter' });
    expect(onExport).toHaveBeenCalledWith('png');
  });

  it('should support space key for selection', () => {
    const onExport = vi.fn();
    render(<MapExportControls onExport={onExport} />);

    fireEvent.click(screen.getByTestId('export-button'));
    const geojsonOption = screen.getByTestId('export-geojson');

    fireEvent.keyDown(geojsonOption, { key: ' ' });
    expect(onExport).toHaveBeenCalledWith('geojson');
  });

  it('should have proper ARIA attributes', () => {
    const onExport = vi.fn();
    render(<MapExportControls onExport={onExport} />);

    const button = screen.getByTestId('export-button');
    expect(button).toHaveAttribute('aria-label', 'Export map');
    expect(button).toHaveAttribute('aria-expanded', 'false');
    expect(button).toHaveAttribute('aria-haspopup', 'menu');
  });

  it('should update aria-expanded when menu is open', () => {
    const onExport = vi.fn();
    render(<MapExportControls onExport={onExport} />);

    const button = screen.getByTestId('export-button');
    fireEvent.click(button);

    expect(button).toHaveAttribute('aria-expanded', 'true');
  });

  it('should apply high contrast mode styles', () => {
    const onExport = vi.fn();
    render(<MapExportControls onExport={onExport} highContrastMode />);

    const button = screen.getByTestId('export-button') as HTMLButtonElement;
    expect(button.style.backgroundColor).toBe('rgb(255, 255, 255)');
    expect(button.style.color).toBe('rgb(0, 0, 0)');
  });

  it('should have menu items with menuitem role', () => {
    const onExport = vi.fn();
    render(<MapExportControls onExport={onExport} />);

    fireEvent.click(screen.getByTestId('export-button'));

    const menuItems = screen.getAllByRole('menuitem');
    expect(menuItems).toHaveLength(3);
  });
});
