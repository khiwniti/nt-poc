import { describe, it, expect } from 'vitest';
import { ANIMATION_CONFIG, ZONE_COLORS } from '../config';

describe('Animation Config', () => {
  it('defines color transition config', () => {
    expect(ANIMATION_CONFIG.colorTransition).toBeDefined();
    expect(ANIMATION_CONFIG.colorTransition.duration).toBe(300);
    expect(ANIMATION_CONFIG.colorTransition.easing).toBe('easeInOut');
  });

  it('defines position/scale config', () => {
    expect(ANIMATION_CONFIG.positionScale).toBeDefined();
    expect(ANIMATION_CONFIG.positionScale.duration).toBeGreaterThan(0);
    expect(ANIMATION_CONFIG.positionScale.easing).toBe('easeInOut');
  });

  it('defines alert pulse config', () => {
    expect(ANIMATION_CONFIG.alertPulse).toBeDefined();
    expect(ANIMATION_CONFIG.alertPulse.duration).toBe(1000);
    expect(ANIMATION_CONFIG.alertPulse.easing).toBe('easeInOut');
  });

  it('defines target FPS', () => {
    expect(ANIMATION_CONFIG.targetFPS).toBe(60);
  });

  it('defines zone colors', () => {
    expect(ZONE_COLORS.green).toBe('#00ff00');
    expect(ZONE_COLORS.yellow).toBe('#ffff00');
    expect(ZONE_COLORS.red).toBe('#ff0000');
    expect(ZONE_COLORS.default).toBe('#808080');
  });
});
