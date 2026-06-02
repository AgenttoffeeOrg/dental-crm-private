import { defineConfig } from 'checkly'

/**
 * Checkly configuration for dental-crm synthetic monitoring
 * 
 * This configuration defines:
 * - Multi-region monitoring (EU, US, Asia)
 * - Browser checks (Playwright-based)
 * - API health checks
 * - Alert settings
 * - GitHub integration
 */

const config = defineConfig({
  // Project metadata
  projectName: 'dental-crm-private',
  logicalId: 'dtcrm',
  
  // Repository configuration
  repoUrl: 'https://github.com/AgenttoffeeOrg/dental-crm-private',
  
  // Check defaults
  checks: {
    // Run checks from multiple regions for global coverage
    locations: (process.env.CHECKLY_REGION_LIST || 'eu-west-1,us-east-1,ap-south-1')
      .split(',')
      .map(r => r.trim()),
    
    // Tags for organization
    tags: ['production', 'dental-crm'],
    
    // Run frequency: every 5 minutes
    frequency: 5,
    
    // Double-check on failure (alert after 2 consecutive failures)
    checkMatch: '**/*.check.ts',
    
    // Playwright runtime configuration
    playwrightConfig: {
      timeout: 30000, // 30 seconds
    },
    
    // Alert settings
    alertChannels: [],
    
    // Retry settings
    doubleCheck: true, // Re-run immediately on failure
    
    // Environment variables available to all checks
    environmentVariables: [
      {
        key: 'BASE_URL',
        value: process.env.BASE_URL || 'https://dental-crm-private-production.up.railway.app/',
      },
    ],
  },
  
  // CLI configuration
  cli: {
    runLocation: 'eu-west-1', // Default region for CLI runs
    privateRunLocation: undefined,
  },
})

export default config

