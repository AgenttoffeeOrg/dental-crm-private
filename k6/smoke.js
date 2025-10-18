import http from 'k6/http';
import { check, sleep } from 'k6';
import { getBaseUrl, getRequestParams, checkHealth } from './helpers.js';

/**
 * k6 Smoke Test - Quick Availability Check
 * 
 * Purpose: Verify application is up and responding
 * Duration: 1 minute
 * VUs: 1 concurrent user
 * 
 * Use Case: Quick sanity check before deployment or after deploy
 */

export const options = {
  vus: 1,
  duration: '1m',
  thresholds: {
    http_req_failed: ['rate<0.01'], // Less than 1% failed requests
    http_req_duration: ['p(95)<500'], // 95% of requests < 500ms
    checks: ['rate>0.95'], // 95% of checks must pass
  },
  tags: {
    test_type: 'smoke',
  },
};

export default function () {
  const baseUrl = getBaseUrl();

  // Check 1: Health endpoint
  const healthPassed = checkHealth();

  // Check 2: Homepage
  const homepageResponse = http.get(baseUrl, getRequestParams('homepage'));
  check(homepageResponse, {
    'homepage status is 200': (r) => r.status === 200,
    'homepage loads quickly': (r) => r.timings.duration < 1000,
  });

  // Check 3: Login page
  const loginResponse = http.get(`${baseUrl}/login`, getRequestParams('login-page'));
  check(loginResponse, {
    'login page status is 200': (r) => r.status === 200,
  });

  // Check 4: Marketing audit page (public)
  const marketingAuditResponse = http.get(
    `${baseUrl}/marketing-audit`,
    getRequestParams('marketing-audit')
  );
  check(marketingAuditResponse, {
    'marketing-audit accessible': (r) => r.status === 200 || r.status === 302,
  });

  sleep(1);
}

export function handleSummary(data) {
  return {
    stdout: textSummary(data, { indent: ' ', enableColors: true }),
  };
}

function textSummary(data, options = {}) {
  const indent = options.indent || '';
  const enableColors = options.enableColors || false;

  let summary = `\n${indent}k6 Smoke Test Summary\n${indent}${'='.repeat(50)}\n`;

  // HTTP metrics
  const httpReqDuration = data.metrics.http_req_duration;
  if (httpReqDuration) {
    summary += `${indent}HTTP Request Duration:\n`;
    summary += `${indent}  avg: ${httpReqDuration.values.avg.toFixed(2)}ms\n`;
    summary += `${indent}  p95: ${httpReqDuration.values['p(95)'].toFixed(2)}ms\n`;
    summary += `${indent}  max: ${httpReqDuration.values.max.toFixed(2)}ms\n`;
  }

  // Request metrics
  const httpReqs = data.metrics.http_reqs;
  if (httpReqs) {
    summary += `${indent}Total Requests: ${httpReqs.values.count}\n`;
  }

  const httpReqFailed = data.metrics.http_req_failed;
  if (httpReqFailed) {
    const failRate = (httpReqFailed.values.rate * 100).toFixed(2);
    summary += `${indent}Failed Requests: ${failRate}%\n`;
  }

  // Checks
  const checks = data.metrics.checks;
  if (checks) {
    const passRate = (checks.values.rate * 100).toFixed(2);
    summary += `${indent}Checks Passed: ${passRate}%\n`;
  }

  summary += `${indent}${'='.repeat(50)}\n`;

  return summary;
}

