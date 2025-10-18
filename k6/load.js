import http from 'k6/http';
import { check, sleep } from 'k6';
import { getBaseUrl, login, getRequestParams } from './helpers.js';

/**
 * k6 Load Test - Typical Production Load
 * 
 * Purpose: Simulate realistic user traffic
 * Pattern: Ramp up to 50 concurrent users, sustain, ramp down
 * Duration: 10 minutes total
 * 
 * Use Case: Verify app handles normal production load
 */

export const options = {
  stages: [
    { duration: '2m', target: 20 },  // Ramp up to 20 users
    { duration: '5m', target: 50 },  // Stay at 50 users
    { duration: '3m', target: 0 },   // Ramp down to 0
  ],
  thresholds: {
    http_req_failed: ['rate<0.01'],  // Less than 1% failed requests
    http_req_duration: ['p(95)<1000'],  // 95% of requests < 1s
    checks: ['rate>0.99'],  // 99% of checks must pass
  },
  tags: {
    test_type: 'load',
  },
};

let authHeaders = null;

export function setup() {
  // Try to login once before load test
  authHeaders = login();
  
  if (authHeaders) {
    console.log('✅ Authentication successful - using authenticated requests');
  } else {
    console.log('⚠️  No authentication - using anonymous requests');
  }

  return { auth: authHeaders };
}

export default function (data) {
  const baseUrl = getBaseUrl();
  const auth = data.auth;

  // Scenario: Typical user journey
  
  // 1. Visit homepage
  const homepage = http.get(baseUrl, getRequestParams('homepage', auth));
  check(homepage, {
    'homepage loaded': (r) => r.status === 200,
  });
  sleep(1);

  if (auth) {
    // 2. Dashboard (authenticated)
    const dashboard = http.get(`${baseUrl}/dashboard`, getRequestParams('dashboard', auth));
    check(dashboard, {
      'dashboard loaded': (r) => r.status === 200,
    });
    sleep(2);

    // 3. Contacts list
    const contacts = http.get(`${baseUrl}/api/contacts?limit=10`, getRequestParams('api-contacts', auth));
    check(contacts, {
      'contacts API responded': (r) => r.status === 200 || r.status === 401,
    });
    sleep(1);

    // 4. Deals list
    const deals = http.get(`${baseUrl}/api/deals?limit=10`, getRequestParams('api-deals', auth));
    check(deals, {
      'deals API responded': (r) => r.status === 200 || r.status === 401,
    });
    sleep(1);

    // 5. Analytics endpoint
    const analytics = http.get(`${baseUrl}/analytics`, getRequestParams('analytics', auth));
    check(analytics, {
      'analytics page loaded': (r) => r.status === 200 || r.status === 302,
    });
    sleep(2);
  } else {
    // Anonymous user journey
    const login = http.get(`${baseUrl}/login`, getRequestParams('login-page'));
    check(login, {
      'login page loaded': (r) => r.status === 200,
    });
    sleep(2);

    const marketingAudit = http.get(`${baseUrl}/marketing-audit`, getRequestParams('marketing-audit'));
    check(marketingAudit, {
      'marketing audit accessible': (r) => r.status === 200 || r.status === 302,
    });
    sleep(2);
  }

  // Think time between iterations
  sleep(3);
}

export function handleSummary(data) {
  // Generate summary for CI
  const summary = {
    test_type: 'load',
    duration_seconds: data.state.testRunDurationMs / 1000,
    total_requests: data.metrics.http_reqs ? data.metrics.http_reqs.values.count : 0,
    failed_requests_rate: data.metrics.http_req_failed ? data.metrics.http_req_failed.values.rate : 0,
    avg_response_time: data.metrics.http_req_duration ? data.metrics.http_req_duration.values.avg : 0,
    p95_response_time: data.metrics.http_req_duration ? data.metrics.http_req_duration.values['p(95)'] : 0,
    p99_response_time: data.metrics.http_req_duration ? data.metrics.http_req_duration.values['p(99)'] : 0,
    checks_passed_rate: data.metrics.checks ? data.metrics.checks.values.rate : 0,
  };

  return {
    'k6-summary.json': JSON.stringify(summary, null, 2),
    stdout: textSummary(data),
  };
}

function textSummary(data) {
  let summary = '\n📊 k6 Load Test Results\n';
  summary += '='.repeat(60) + '\n\n';

  summary += `Duration: ${(data.state.testRunDurationMs / 1000).toFixed(1)}s\n`;
  summary += `Total Requests: ${data.metrics.http_reqs ? data.metrics.http_reqs.values.count : 0}\n`;

  if (data.metrics.http_req_duration) {
    const duration = data.metrics.http_req_duration.values;
    summary += `\nResponse Times:\n`;
    summary += `  avg: ${duration.avg.toFixed(2)}ms\n`;
    summary += `  p50: ${duration['
