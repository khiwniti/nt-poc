# T128: Alert Sound Notifications - Quick Reference

## What Was Implemented

Alert sound notifications with different sounds for severity levels, mute toggle, volume control, and accessibility support.

## How to Use

### For End Users

1. **Enable/Disable Sounds**
   - Go to Settings (link in header)
   - Click "Mute" or "Unmute" button
   - Sounds are enabled by default

2. **Adjust Volume**
   - Go to Settings
   - Use the volume slider (0-100%)
   - Changes apply immediately

3. **Test Sounds**
   - Go to Settings
   - Click test buttons: Critical, High, or Medium
   - Hear the sound that will play for each severity

4. **Accessibility Options**
   - Go to Settings
   - Check/uncheck "Respect reduced motion preference"
   - If enabled, sounds won't play when system has reduced motion preference

### For Developers

#### Import and Use the Hook

```typescript
import { useAlertSoundNotification } from '../hooks/useAlertSoundNotification';

function MyAlertsComponent() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  
  // Automatically plays sounds for new alerts
  useAlertSoundNotification(alerts);
  
  // ... rest of component
}
```

#### Access Settings Store

```typescript
import { useAlertSoundStore } from '../stores/alertSoundStore';

function MyComponent() {
  const soundStore = useAlertSoundStore();
  
  // Read settings
  const { enabled, volume, respectReducedMotion } = soundStore.settings;
  
  // Update settings
  soundStore.setEnabled(false);
  soundStore.setVolume(0.5);
  soundStore.toggleMute();
  
  // Check if sound should play
  const shouldPlay = soundStore.shouldPlaySound();
}
```

#### Play Sounds Manually

```typescript
import { getAlertSoundPlayer } from '../utils/alertSounds';

async function playCriticalAlert() {
  const player = getAlertSoundPlayer();
  await player.resume(); // Required by browser
  await player.playSeverityBeep('critical');
}
```

## File Locations

### Source Files
- `src/utils/alertSounds.ts` - Sound player implementation
- `src/stores/alertSoundStore.ts` - Settings state management
- `src/hooks/useAlertSoundNotification.ts` - React hook for notifications
- `src/components/AlertSoundSettings.tsx` - Settings UI component
- `src/pages/SettingsPage.tsx` - Settings page

### Test Files
- `src/hooks/__tests__/useAlertSoundNotification.test.ts`
- `src/stores/__tests__/alertSoundStore.test.ts`
- `src/components/__tests__/AlertSoundSettings.test.tsx`
- `e2e/alert-sound-notifications.spec.ts`

### Documentation
- `T128_IMPLEMENTATION_SUMMARY.md` - Detailed implementation notes
- `T128_ACCEPTANCE_CHECKLIST.md` - Acceptance criteria checklist
- `T128_QUICK_REFERENCE.md` - This file

## Sound Specifications

### Severity to Sound Mapping

| Severity | Frequency | Pattern | Use Case |
|----------|-----------|---------|----------|
| Critical | 880 Hz    | Double beep | Critical alerts requiring immediate attention |
| High     | 659 Hz    | Single beep | High priority alerts |
| Warning  | 659 Hz    | Single beep | Warning alerts (same as high) |
| Medium   | 523 Hz    | Single beep | Medium priority alerts |
| Info     | 523 Hz    | Single beep | Informational alerts (same as medium) |
| Low      | 440 Hz    | Single beep | Low priority alerts |

### Sound Duration
- Critical: 300ms per beep (2 beeps with 100ms gap)
- High/Warning: 250ms
- Medium/Info: 200ms
- Low: 150ms

## Settings Storage

Settings are automatically persisted to `localStorage` under the key `alert-sound-settings`.

### Storage Format
```json
{
  "state": {
    "settings": {
      "enabled": true,
      "volume": 0.7,
      "respectReducedMotion": true
    }
  },
  "version": 0
}
```

## Accessibility Features

### Reduced Motion Support
- Detects `prefers-reduced-motion: reduce` media query
- Respects user preference when enabled in settings
- Shows warning message when sounds are disabled

### Keyboard Navigation
- All controls are keyboard accessible
- Proper tab order
- Focus indicators

### Screen Reader Support
- ARIA labels on all controls
- Semantic HTML structure
- Status announcements

## Browser Compatibility

### Supported Browsers
- Chrome 70+
- Firefox 68+
- Safari 14+
- Edge 79+

### Fallback Behavior
- Web Audio API: Primary method (better control)
- HTML5 Audio: Fallback for older browsers
- Graceful degradation if no audio support

## Performance Characteristics

- **Memory**: ~50KB (singleton pattern)
- **CPU**: Minimal (event-driven)
- **Network**: None (sounds generated locally)
- **Storage**: ~200 bytes (settings only)

## Common Tasks

### Add New Severity Level

1. Update `AlertSeverity` type in `alertSounds.ts`
2. Add frequency mapping in `playSeverityBeep()`
3. Add test button in `AlertSoundSettings.tsx`
4. Update tests

### Customize Sound for Severity

Edit `playSeverityBeep()` in `alertSounds.ts`:
```typescript
case 'critical':
  frequency = 880; // Change frequency
  duration = 300;   // Change duration
  // Add custom pattern
  break;
```

### Add Custom Sound File

Update `ALERT_SOUNDS` in `alertSounds.ts`:
```typescript
export const ALERT_SOUNDS = {
  critical: 'data:audio/wav;base64,...', // Your base64
  // or
  critical: '/sounds/critical.wav', // URL path
};
```

## Troubleshooting

### Sounds Not Playing

1. Check if sounds are enabled in Settings
2. Verify volume is not at 0%
3. Check browser console for errors
4. Ensure user has interacted with page (browser requirement)
5. Check if reduced motion preference is blocking sounds

### AudioContext Suspended

Browsers require user interaction before playing audio. The hook automatically calls `resume()`, but if issues persist:

```typescript
const player = getAlertSoundPlayer();
await player.resume();
```

### Settings Not Persisting

1. Check browser localStorage is enabled
2. Check for quota exceeded errors
3. Verify Zustand persist middleware is working

### Tests Failing

Ensure mocks are set up correctly:
```typescript
vi.mock('../../utils/alertSounds');
vi.mock('../../stores/alertSoundStore');
```

## API Reference

### AlertSoundPlayer

```typescript
class AlertSoundPlayer {
  setVolume(volume: number): void
  play(severity: AlertSeverity): Promise<void>
  playBeep(frequency: number, duration?: number): Promise<void>
  playSeverityBeep(severity: AlertSeverity): Promise<void>
  resume(): Promise<void>
}
```

### useAlertSoundStore

```typescript
interface AlertSoundStore {
  settings: AlertSoundSettings
  setEnabled(enabled: boolean): void
  setVolume(volume: number): void
  setRespectReducedMotion(respect: boolean): void
  toggleMute(): void
  shouldPlaySound(): boolean
}
```

### useAlertSoundNotification

```typescript
function useAlertSoundNotification(alerts: Alert[]): {
  playTestSound: (severity: AlertSeverity) => Promise<void>
}
```

## Related Tasks

- T127: Alert filtering (if exists)
- T129: Alert notifications (if exists)
- Alert Management System (base implementation)

## Support

For issues or questions:
1. Check this guide
2. Review implementation summary
3. Check acceptance checklist
4. Review tests for examples
