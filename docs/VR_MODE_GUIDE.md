# VR Mode Setup and Usage Guide

## Overview

The 3D Facility View now supports immersive VR mode using WebXR API, allowing users to experience facility walkthroughs in virtual reality with compatible VR headsets.

## Supported VR Devices

### Fully Tested
- **Meta Quest 2** (90Hz/120Hz)
- **Meta Quest Pro** (90Hz/120Hz)
- **Meta Quest 3** (90Hz/120Hz)

### Compatible (WebXR Support)
- HTC Vive / Vive Pro
- Valve Index
- Windows Mixed Reality headsets
- Pico 4 / Pico Neo 3
- PlayStation VR2 (with PC adapter)

## System Requirements

### Browser Requirements
VR mode requires a WebXR-compatible browser:
- **Chrome/Edge**: Version 79 or higher
- **Firefox**: Version 98 or higher (with WebXR enabled in about:config)
- **Oculus Browser**: Native support on Quest devices

### Network Requirements
- **HTTPS required**: WebXR only works on secure connections
- Local development: Use `https://localhost` or enable WebXR flags for `http://localhost`

### Performance Requirements
- **Target Frame Rate**: 90 FPS (minimum for comfortable VR)
- **High-end devices**: 120 FPS (Quest 2/3/Pro, Pico 4)
- **GPU**: Dedicated graphics card recommended for PC VR
- **CPU**: Quad-core processor or better

## Setup Instructions

### 1. Enable WebXR in Your Browser

#### Chrome/Edge
1. Navigate to `chrome://flags` (or `edge://flags`)
2. Search for "WebXR"
3. Enable "WebXR Incubations"
4. Restart browser

#### Firefox
1. Navigate to `about:config`
2. Search for `dom.vr.webxr.enabled`
3. Set to `true`
4. Restart browser

### 2. Connect Your VR Headset

#### Meta Quest (Standalone)
1. Open Oculus Browser on your Quest
2. Navigate to the application URL
3. VR mode will be automatically detected

#### Meta Quest (PC Link)
1. Connect Quest to PC via USB-C or Air Link
2. Enable Oculus Link in Quest settings
3. Open Chrome/Edge on PC
4. Navigate to application URL
5. Click "Enable VR Mode" button

#### PC VR (Vive, Index, WMR)
1. Ensure SteamVR or Windows Mixed Reality Portal is running
2. Open Chrome/Edge
3. Navigate to application URL
4. Click "Enable VR Mode" button

### 3. Using VR Mode

#### Entering VR Mode
1. Navigate to **3D Facility View** page
2. Click the **"Enable VR Mode"** button (🥽 icon)
3. If VR is supported, a **"Enter VR"** button will appear
4. Put on your VR headset
5. Click **"Enter VR"** or press the VR button in your browser

#### Exiting VR Mode
- Press the **Oculus/System button** on your controller
- Click **"Exit VR"** in the browser UI
- Click **"Switch to Desktop View"** button

## VR Controls

### Navigation

#### Left Controller (Locomotion)
- **Thumbstick**: Move forward/backward and strafe left/right
- **Grip Button**: Reserved for future grab interactions

#### Right Controller (Rotation & Interaction)
- **Thumbstick Left/Right**: Snap turn left/right
- **Trigger**: Reserved for teleportation (future feature)
- **Grip Button**: Reserved for future grab interactions

### Movement Settings
- **Default Speed**: 2.0 m/s
- **Rotation Speed**: 45° per snap turn
- **Teleportation**: Coming soon

## Performance Optimization

### Automatic Quality Adjustment
The system automatically adjusts rendering quality based on performance:

#### High Quality (90+ FPS)
- Full shadows enabled
- 2K shadow maps
- Antialiasing enabled
- Maximum particle effects

#### Medium Quality (80-90 FPS)
- Shadows enabled
- 1K shadow maps
- Antialiasing enabled
- Reduced particle effects

#### Low Quality (<80 FPS)
- Shadows disabled
- 512px shadow maps
- Antialiasing disabled
- Minimal particle effects

### Performance Monitoring
- Real-time FPS display in VR
- Performance warnings when FPS drops below 85
- Automatic quality degradation to maintain frame rate

### Tips for Better Performance
1. **Close unnecessary browser tabs**
2. **Disable browser extensions** (especially ad blockers)
3. **Update graphics drivers**
4. **Lower model complexity** in the scene
5. **Use wired connection** for PC VR (instead of wireless)

## Troubleshooting

### VR Button Not Appearing
**Problem**: "Enable VR Mode" button doesn't show "Enter VR"

**Solutions**:
1. Ensure you're using HTTPS (or localhost with WebXR flags enabled)
2. Check that your VR headset is connected and detected by the system
3. Verify WebXR is enabled in browser flags
4. Try refreshing the page after connecting VR headset
5. Check browser console for WebXR errors

### Poor Performance / Low FPS
**Problem**: Stuttering or frame drops in VR

**Solutions**:
1. **Check Performance Monitor**: Look for FPS warnings
2. **Lower Scene Complexity**: Select simpler 3D models
3. **Close Background Apps**: Free up system resources
4. **Reduce Browser Tab Count**: Each tab uses resources
5. **Update Drivers**: Ensure GPU drivers are current
6. **Check USB Connection** (PC VR): Use USB 3.0 or higher
7. **Disable Browser Hardware Acceleration**: Sometimes helps on older systems

### Black Screen in VR
**Problem**: VR mode activates but screen is black

**Solutions**:
1. **Check Headset Sensors**: Ensure headset sensors are uncovered
2. **Restart Browser**: Close and reopen browser
3. **Restart VR Runtime**: Restart SteamVR/Oculus software
4. **Check HTTPS**: Ensure secure connection is active
5. **Browser Console**: Check for WebGL or WebXR errors

### Controllers Not Working
**Problem**: VR controllers not responding

**Solutions**:
1. **Check Battery**: Ensure controllers have sufficient charge
2. **Re-pair Controllers**: Reset controller pairing in VR settings
3. **Check Browser Permissions**: Allow controller access when prompted
4. **Restart VR Session**: Exit and re-enter VR mode
5. **Update Firmware**: Ensure controllers have latest firmware

### "VR Not Available" Message
**Problem**: System says VR is not available

**Solutions**:
1. **Check Browser Compatibility**: Use Chrome 79+, Edge 79+, or Firefox 98+
2. **Enable WebXR Flags**: See setup instructions above
3. **HTTPS Required**: Ensure you're on a secure connection
4. **Check Headset**: Verify VR headset is connected and powered on
5. **Browser Update**: Update to latest browser version

## Known Limitations

### Current Version Limitations
- **Teleportation**: Snap turning only (teleportation coming soon)
- **Hand Tracking**: Not yet implemented
- **Object Interaction**: Grab/manipulation in development
- **Multi-user VR**: Not supported in current version
- **AR Mode**: Not yet available

### Browser Limitations
- **Safari**: WebXR not supported on macOS/iOS
- **Mobile Browsers** (except Quest): Limited WebXR support
- **Incognito Mode**: May require WebXR flag re-enabling

## Developer Notes

### Architecture
- **WebXR API**: Direct browser VR integration
- **@react-three/xr**: React Three Fiber XR bindings
- **Stereoscopic Rendering**: Automatic dual-eye rendering
- **Performance Monitoring**: Real-time FPS tracking
- **Adaptive Quality**: Dynamic LOD based on performance

### Performance Targets
- **Minimum**: 90 FPS (11.1ms frame time)
- **Target**: 90 FPS with <2% dropped frames
- **Optimal**: 120 FPS on supported devices

### Technical Specifications
- **Rendering**: WebGL 2.0 with XR composition layers
- **Lighting**: Dynamic with shadow mapping (quality-dependent)
- **Controllers**: 6DOF tracking with input state
- **Movement**: Continuous locomotion with snap turning
- **Fallback**: Automatic desktop 3D view for non-VR devices

## Future Enhancements

### Planned Features
- ✅ Basic VR mode with controller navigation
- ✅ Performance monitoring and optimization
- ✅ Fallback UI for non-VR devices
- 🔲 Teleportation-based movement
- 🔲 Hand tracking support
- 🔲 Object grab and manipulation
- 🔲 Multi-user VR collaboration
- 🔲 AR mode for mobile devices
- 🔲 VR-specific UI overlays
- 🔲 Voice commands

## Support

### Getting Help
- Check the [troubleshooting section](#troubleshooting) first
- Review browser console for error messages
- Verify system meets [requirements](#system-requirements)
- Test with different VR devices if available

### Reporting Issues
When reporting VR-related issues, please include:
1. **VR Headset Model**: (e.g., Meta Quest 2)
2. **Browser Version**: (e.g., Chrome 120)
3. **Connection Type**: (Standalone, USB Link, Wireless)
4. **Error Messages**: From browser console
5. **FPS Data**: From performance monitor
6. **Steps to Reproduce**: Detailed reproduction steps

## References

### WebXR Resources
- [WebXR Device API Specification](https://www.w3.org/TR/webxr/)
- [Immersive Web Working Group](https://www.w3.org/immersive-web/)
- [React Three Fiber XR Documentation](https://github.com/pmndrs/react-xr)
- [Three.js WebXR Examples](https://threejs.org/examples/?q=webxr)

### VR Best Practices
- [Oculus VR Design Best Practices](https://developer.oculus.com/resources/design-hig/)
- [Google WebXR Samples](https://github.com/immersive-web/webxr-samples)
- [Mozilla Mixed Reality Blog](https://blog.mozvr.com/)
