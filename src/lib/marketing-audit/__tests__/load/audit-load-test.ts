/**
 * Load Testing Configuration
 * 
 * Phase 4: Load testing scenarios for high-traffic conditions.
 * Tests system under 1000+ concurrent users.
 */

import { test } from '@playwright/test';

/**
 * Artillery.io configuration for load testing
 * Run with: artillery run audit-load-test.yml
 */
export const artilleryConfig = {
  config: {
    target: 'http://localhost:3000',
    phases: [
      // Warm-up phase
      {
        duration: 60,
        arrivalRate: 5,
        name: 'Warm up',
      },
      // Ramp up to peak load
      {
        duration: 120,
        arrivalRate: 5,
        rampTo: 50,
        name: 'Ramp up',
      },
      // Sustained peak
      {
        duration: 300,
        arrivalRate: 50,
        name: 'Sustained load',
      },
      // Spike test
      {
        duration: 60,
        arrivalRate: 100,
        name: 'Spike',
      },
    ],
    payload: {
      path: './test-data/users.csv',
      fields: ['email', 'password'],
    },
  },
  scenarios: [
    {
      name: 'Run marketing audit',
      weight: 70,
      flow: [
        // Login
        {
          post: {
            url: '/api/auth/login',
            json: {
              email: '{{ email }}',
              password: '{{ password }}',
            },
            capture: {
              json: '$.token',
              as: 'token',
            },
          },
        },
        // Navigate to marketing audit
        {
          get: {
            url: '/api/marketing-audit/latest',
            headers: {
              Authorization: 'Bearer {{ token }}',
            },
          },
        },
        // Run new audit
        {
          post: {
            url: '/api/marketing-audit/run',
            headers: {
              Authorization: 'Bearer {{ token }}',
            },
          },
        },
        // Think time (simulate user reading results)
        {
          think: 5,
        },
      ],
    },
    {
      name: 'View recommendations',
      weight: 20,
      flow: [
        {
          post: {
            url: '/api/auth/login',
            json: {
              email: '{{ email }}',
              password: '{{ password }}',
            },
            capture: {
              json: '$.token',
              as: 'token',
            },
          },
        },
        {
          get: {
            url: '/api/marketing-audit/latest',
            headers: {
              Authorization: 'Bearer {{ token }}',
            },
            capture: {
              json: '$.audit.id',
              as: 'auditId',
            },
          },
        },
        {
          get: {
            url: '/api/marketing-audit/{{ auditId }}/recommendations',
            headers: {
              Authorization: 'Bearer {{ token }}',
            },
          },
        },
      ],
    },
    {
      name: 'View competitors',
      weight: 10,
      flow: [
        {
          post: {
            url: '/api/auth/login',
            json: {
              email: '{{ email }}',
              password: '{{ password }}',
            },
            capture: {
              json: '$.token',
              as: 'token',
            },
          },
        },
        {
          get: {
            url: '/api/marketing-audit/competitors',
            headers: {
              Authorization: 'Bearer {{ token }}',
            },
          },
        },
      ],
    },
  ],
};

/**
 * Acceptance criteria for load test
 */
export const loadTestCriteria = {
  // 95th percentile response time must be under 2 seconds
  'http.response_time.p95': { max: 2000 },
  
  // 99th percentile response time must be under 5 seconds
  'http.response_time.p99': { max: 5000 },
  
  // Error rate must be under 1%
  'http.codes.2xx': { min: 99 },
  'http.codes.5xx': { max: 1 },
  
  // Throughput: at least 100 requests per second
  'http.request_rate': { min: 100 },
};

/**
 * Stress test configuration
 * Tests system beyond normal capacity to find breaking point
 */
export const stressTestConfig = {
  config: {
    target: 'http://localhost:3000',
    phases: [
      {
        duration: 60,
        arrivalRate: 1,
        rampTo: 200,
        name: 'Stress test',
      },
    ],
  },
  scenarios: artilleryConfig.scenarios,
};

/**
 * Soak test configuration
 * Tests system stability over extended period
 */
export const soakTestConfig = {
  config: {
    target: 'http://localhost:3000',
    phases: [
      {
        duration: 3600, // 1 hour
        arrivalRate: 20,
        name: 'Soak test',
      },
    ],
  },
  scenarios: artilleryConfig.scenarios,
};

