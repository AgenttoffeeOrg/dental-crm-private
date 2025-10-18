import http from 'k6/http';
import { check, sleep } from 'k6';
import { getBaseUrl, login, getRequestParams } from './helpers.js';

/**
 * k6 Stress Test - Find Breaking Point
 * 
 * Purpose: Identify system limits and breaking points
 * Pattern: Gradually increase load to find capacity limits
 * Duration: 10 minutes total
 * 
 * Use Case: Capacity planning, identify bottlenecks
 * Note: Thresholds are warnings only (always exits 0 for exploration)
 */

export const options = {
  stages: [
    { duration: '2m', target: 50 },   // Ramp to normal load
    { duration: '3m', target: 100 },  // Increase to heavy load
    { duration: '3m', target: 150 },  // Push to stress level
    { duration: '2m', target: 0 },    // Ramp down
  ],
  thresholds: {
    // Warning thresholds only - don't fail the test
    http_req_failed: [{ threshold: 'rate<0.05', abortOnFail: false }],
    http_req_duration: [{ threshold: 'p(95)<500', abortOnFail: false }],
    checks: [{ threshold: 'rate>0.95', abortOnFail: false }],
  },
  tags: {
    test_type: 'stress',
  },
};

let authHeaders = null;

export function setup() {
  authHeaders = login();
  return { auth: authHeaders };
}

export default function (data) {
  const baseUrl = getBaseUrl();
  const auth = data.auth;

  // Stress test: Hit multiple endpoints rapidly
  
  // Homepage
  const homepage = http.get(baseUrl, getRequestParams('homepage', auth));
  check(homepage, { 'homepage loaded': (r) => r.status === 200 });

  if (auth) {
    // Authenticated stress testing
    http.get(`${baseUrl}/dashboard`, getRequestParams('dashboard', auth));
    http.get(`${baseUrl}/contacts`, getRequestParams('contacts', auth));
    http.get(`${baseUrl}/deals`, getRequestParams('deals', auth));
    http.get(`${baseUrl}/pipeline`, getRequestParams('pipeline', auth));
    http.get(`${baseUrl}/analytics`, getRequestParams('analytics', auth));
  } else {
    // Anonymous stress testing
    http.get(`${baseUrl}/login`, getRequestParams('login-page'));
    http.get(`${baseUrl}/marketing-audit`, getRequestParams('marketing-audit'));
  }

  sleep(0.5); // Minimal sleep for stress
}

export function handleSummary(data) {
  const summary = {
    test_type: 'stress',
    max_vus: 150,
    duration_seconds: data.state.testRunDurationMs / 1000,
    total_requests: data.metrics.http_reqs ? data.metrics.http_reqs.values.count : 0,
    failed_requests_rate: data.metrics.http_req_failed ? data.metrics.http_req_failed.values.rate : 0,
    avg_response_time: data.metrics.http_req_duration ? data.metrics.http_req_duration.values.avg : 0,
    p95_response_time: data.metrics.http_req_duration ? data.metrics.http_req_duration.values['p(95)'] : 0,
    p99_response_time: data.metrics.http_req_duration ? data.metrics.http_req_duration.values['p(99)'] : 0,
    max_response_time: data.metrics.http_req_duration ? data.metrics.http_req_duration.values.max : 0,
    breaking_point_identified: data.metrics.http_req_failed && data.metrics.http_req_failed.values.rate > 0.05,
  };

  console.log('\n📊 Stress Test Results:');
  console.log(`Max VUs: ${summary.max_vus}`);
  console.log(`Total Requests: ${summary.total_requests}`);
  console.log(`Failed Rate: ${(summary.failed_requests_rate * 100).toFixed(2)}%`);
  console.log(`Avg Response: ${summary.avg_response_time.toFixed(2)}ms`);
  console.log(`P95 Response: ${summary.p95_response_time.toFixed(2)}ms`);
  console.log(`Max Response: ${summary.max_response_time.toFixed(2)}ms`);
  console.log(`Breaking Point: ${summary.breaking_point_identified ? 'YES' : 'NO'}\n`);

  return {
    'k6-stress-summary.json': JSON.stringify(summary, null, 2),
  };
}

