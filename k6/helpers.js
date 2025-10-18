import http from 'k6/http';
import { check } from 'k6';

/**
 * k6 Helper Functions for Dental CRM Load Testing
 */

const BASE_URL = __ENV.BASE_URL || 'https://dental-crm-private-production.up.railway.app';
const TEST_EMAIL = __ENV.TEST_EMAIL;
const TEST_PASSWORD = __ENV.TEST_PASSWORD;

/**
 * Login and return authentication headers/cookies
 * Returns null if credentials not provided
 */
export function login() {
  if (!TEST_EMAIL || !TEST_PASSWORD) {
    console.log('⚠️  No TEST_EMAIL/TEST_PASSWORD - skipping authentication');
    return null;
  }

  const loginUrl = `${BASE_URL}/api/auth/signin`;
  const payload = JSON.stringify({
    email: TEST_EMAIL,
    password: TEST_PASSWORD,
  });

  const params = {
    headers: {
      'Content-Type': 'application/json',
    },
    tags: { name: 'login' },
  };

  const response = http.post(loginUrl, payload, params);

  const loginSuccess = check(response, {
    'login successful': (r) => r.status === 200 || r.status === 302,
  });

  if (!loginSuccess) {
    console.log(`⚠️  Login failed with status ${response.status}`);
    return null;
  }

  // Extract session cookie or token
  const cookies = response.cookies;
  const authHeaders = {
    Cookie: Object.keys(cookies)
      .map((key) => `${key}=${cookies[key][0].value}`)
      .join('; '),
  };

  return authHeaders;
}

/**
 * Common request parameters with proper tagging
 */
export function getRequestParams(name, auth = null) {
  const params = {
    tags: { name },
    headers: {
      'User-Agent': 'k6-load-test',
    },
  };

  if (auth && auth.Cookie) {
    params.headers.Cookie = auth.Cookie;
  }

  return params;
}

/**
 * Health check endpoint
 */
export function checkHealth() {
  const healthUrl = `${BASE_URL}/api/health`;
  const response = http.get(healthUrl, getRequestParams('health'));

  return check(response, {
    'health check passed': (r) => r.status === 200,
    'health check response time OK': (r) => r.timings.duration < 500,
  });
}

/**
 * Get base URL
 */
export function getBaseUrl() {
  return BASE_URL;
}

