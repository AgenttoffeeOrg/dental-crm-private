/**
 * Checkly API Check: Health Endpoint
 * 
 * This check verifies that the application is responding to requests.
 * Tests the root endpoint for a 200 OK response.
 * 
 * Runs every 5 minutes from multiple regions.
 */

import { ApiCheck, AssertionBuilder } from 'checkly/constructs'

const BASE_URL = process.env.BASE_URL || 'https://dental-crm-private-production.up.railway.app/'

new ApiCheck('dtcrm-health-check', {
  name: 'API Health Check',
  frequency: 5, // Run every 5 minutes
  locations: ['eu-west-1', 'us-east-1', 'ap-south-1'],
  tags: ['api', 'health', 'critical'],
  
  degradedResponseTime: 5000, // Warn if response > 5s
  maxResponseTime: 15000, // Fail if response > 15s
  
  request: {
    method: 'GET',
    url: BASE_URL,
    followRedirects: true,
    headers: {
      'User-Agent': 'Checkly Synthetic Monitor',
    },
  },
  
  assertions: [
    AssertionBuilder.statusCode().equals(200),
    AssertionBuilder.responseTime().lessThan(10000), // Should respond within 10s
  ],
})

