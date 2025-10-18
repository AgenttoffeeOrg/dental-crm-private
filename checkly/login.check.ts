/**
 * Checkly Browser Check: Login Flow
 * 
 * This check verifies that users can successfully log in to the application.
 * Uses TEST_EMAIL and TEST_PASSWORD from environment variables.
 * 
 * If credentials are not provided, this check will be skipped.
 */

import { BrowserCheck } from 'checkly/constructs'

const BASE_URL = process.env.BASE_URL || 'https://dental-crm-private-production.up.railway.app/'
const TEST_EMAIL = process.env.TEST_EMAIL
const TEST_PASSWORD = process.env.TEST_PASSWORD

// Only create this check if credentials are available
if (TEST_EMAIL && TEST_PASSWORD) {
  new BrowserCheck('dtcrm-login-check', {
    name: 'Login Flow',
    frequency: 5, // Run every 5 minutes
    locations: ['eu-west-1', 'us-east-1', 'ap-south-1'],
    tags: ['browser', 'auth', 'critical'],
    
    environmentVariables: [
      { key: 'TEST_EMAIL', value: TEST_EMAIL },
      { key: 'TEST_PASSWORD', value: TEST_PASSWORD },
    ],
    
    code: {
      entrypoint: './login.spec.ts',
    },
  })
} else {
  console.warn('⚠️  Login check skipped: TEST_EMAIL and TEST_PASSWORD not provided')
  console.warn('   Add these secrets to GitHub to enable login flow monitoring')
}

