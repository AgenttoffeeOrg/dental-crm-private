/**
 * Lighthouse CI Configuration
 * Enforces performance, accessibility, and best practices
 */

module.exports = {
  ci: {
    collect: {
      // URLs to test
      url: [
        'http://localhost:3000/marketing-audit',
        'http://localhost:3000/marketing-audit?tab=technical',
        'http://localhost:3000/marketing-audit?tab=local',
        'http://localhost:3000/marketing-audit?tab=competitors',
        'http://localhost:3000/dashboard',
        'http://localhost:3000/contacts',
        'http://localhost:3000/deals',
      ],
      
      // Number of runs per URL
      numberOfRuns: 3,
      
      // Start server before testing
      startServerCommand: 'npm run build && npm run start',
      startServerReadyPattern: 'ready on',
      startServerReadyTimeout: 120000,
      
      // Settings
      settings: {
        // Use desktop preset
        preset: 'desktop',
        
        // Throttling
        throttling: {
          rttMs: 40,
          throughputKbps: 10240,
          cpuSlowdownMultiplier: 1,
        },
        
        // Only run specific categories
        onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo'],
      },
    },
    
    assert: {
      // Performance budget
      assertions: {
        // Performance
        'categories:performance': ['error', { minScore: 0.9 }],
        'first-contentful-paint': ['warn', { maxNumericValue: 2000 }],
        'largest-contentful-paint': ['error', { maxNumericValue: 2500 }],
        'cumulative-layout-shift': ['error', { maxNumericValue: 0.1 }],
        'total-blocking-time': ['warn', { maxNumericValue: 300 }],
        'speed-index': ['warn', { maxNumericValue: 3000 }],
        'interactive': ['warn', { maxNumericValue: 3500 }],
        
        // Accessibility
        'categories:accessibility': ['error', { minScore: 0.95 }],
        'color-contrast': 'error',
        'image-alt': 'error',
        'label': 'error',
        'link-name': 'error',
        'button-name': 'error',
        'aria-*': 'error',
        
        // Best Practices
        'categories:best-practices': ['error', { minScore: 0.9 }],
        'errors-in-console': 'warn',
        'uses-http2': 'warn',
        'uses-passive-listeners': 'warn',
        
        // SEO
        'categories:seo': ['error', { minScore: 0.9 }],
        'meta-description': 'error',
        'document-title': 'error',
        'viewport': 'error',
        'robots-txt': 'warn',
        
        // Resource Hints
        'uses-rel-preconnect': 'warn',
        'uses-rel-preload': 'off',
        
        // JavaScript
        'unminified-javascript': 'warn',
        'unused-javascript': 'off', // Too strict for React apps
        'modern-image-formats': 'warn',
        
        // Images
        'offscreen-images': 'warn',
        'uses-optimized-images': 'warn',
        'uses-webp-images': 'warn',
        'uses-responsive-images': 'warn',
        
        // Network
        'redirects': 'error',
        'uses-long-cache-ttl': 'warn',
        'total-byte-weight': ['warn', { maxNumericValue: 2000000 }], // 2MB
        
        // Fonts
        'font-display': 'warn',
      },
    },
    
    upload: {
      // Upload results to temporary public storage
      target: 'temporary-public-storage',
    },
    
    server: {
      // Optional: Run a Lighthouse CI server
      // target: 'lhci',
      // serverBaseUrl: 'https://your-lhci-server.com',
    },
  },
};

