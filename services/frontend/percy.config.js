export default {
  version: 2,
  snapshot: {
    widths: [375, 768, 1280],
    minHeight: 1024,
    enableJavaScript: true,
    percyCSS: `
      /* Hide dynamic content that changes between snapshots */
      .animation-running,
      .loading-spinner,
      [data-testid="current-time"],
      [data-testid="live-timestamp"] {
        visibility: hidden !important;
      }
    `,
  },
  discovery: {
    allowedHostnames: ['localhost', '127.0.0.1'],
    networkIdleTimeout: 750,
  },
};
