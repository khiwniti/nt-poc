module.exports = {
  ci: {
    collect: {
      url: [
        'http://localhost:5173/',
        'http://localhost:5173/assets',
        'http://localhost:5173/alerts',
        'http://localhost:5173/comparative-analysis',
        'http://localhost:5173/ai-insights',
        'http://localhost:5173/what-if',
        'http://localhost:5173/reports',
        'http://localhost:5173/settings',
      ],
      numberOfRuns: 3,
      settings: {
        preset: 'desktop',
        onlyCategories: ['accessibility', 'best-practices', 'seo', 'performance'],
        skipAudits: ['uses-http2'],
      },
    },
    assert: {
      assertions: {
        'categories:accessibility': ['error', { minScore: 0.9 }],
        'categories:best-practices': ['warn', { minScore: 0.85 }],
        'categories:seo': ['warn', { minScore: 0.9 }],
        'categories:performance': ['warn', { minScore: 0.75 }],
      },
    },
    upload: {
      target: 'temporary-public-storage',
    },
  },
};
