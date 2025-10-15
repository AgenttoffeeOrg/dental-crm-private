/**
 * Lighthouse CI Configuration
 * 
 * Phase 4: Automated Lighthouse testing in CI/CD.
 * Performance: Ensure 90+ scores on all pages.
 */

module.exports = {
  ci: {
    collect: {
      // URLs to test
      url: [
        'http://localhost:3000/',
        'http://localhost:3000/dashboard',
        'http://localhost:3000/marketing-audit',
      ],
      
      // Number of runs per URL (median used)
      numberOfRuns: 3,
      
      // Settings
      settings: {
        preset: 'desktop',
        throttling: {
          rttMs: 40,
          throughputKbps: 10240,
          cpuSlowdownMultiplier: 1,
        },
      },
    },
    
    assert: {
      // Assertions for passing builds
      assertions: {
        'categories:performance': ['error', { minScore: 0.9 }],
        'categories:accessibility': ['error', { minScore: 0.9 }],
        'categories:best-practices': ['error', { minScore: 0.9 }],
        'categories:seo': ['error', { minScore: 0.9 }],
        
        // Core Web Vitals
        'largest-contentful-paint': ['error', { maxNumericValue: 2500 }],
        'cumulative-layout-shift': ['error', { maxNumericValue: 0.1 }],
        'total-blocking-time': ['error', { maxNumericValue: 300 }],
        
        // Bundle size
        'total-byte-weight': ['warn', { maxNumericValue: 200000 }],
        
        // Images
        'uses-optimized-images': 'error',
        'uses-webp-images': 'warn',
        
        // JavaScript
        'unminified-javascript': 'error',
        'unused-javascript': 'warn',
        
        // Network
        'uses-http2': 'error',
        'uses-long-cache-ttl': 'warn',
      },
    },
    
    upload: {
      // Upload to Lighthouse CI server (optional)
      target: 'temporary-public-storage',
    },
  },
};

