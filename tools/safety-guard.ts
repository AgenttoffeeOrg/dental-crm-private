/**
 * Safety Guard Utilities
 * Prevents screenshot runner from targeting production environments
 */

import fs from 'fs'
import path from 'path'

const SAFETY_LOG = path.join(process.cwd(), 'CRM screenshots', 'safety_abort.log')

/**
 * Check if URL appears to be a production environment
 */
export function isProductionUrl(url: string): boolean {
  const lowerUrl = url.toLowerCase()
  
  // Check for explicit production markers
  if (lowerUrl.includes('prod') || lowerUrl.includes('production')) {
    return true
  }
  
  // Check for Railway production (unless dev/staging explicitly mentioned)
  if (lowerUrl.includes('railway.app')) {
    if (!lowerUrl.includes('dev') && !lowerUrl.includes('staging')) {
      return true
    }
  }
  
  // Add more production domain checks as needed
  const productionDomains = [
    'dentalcrm.app',
    'dentalcrm.com',
    'yourapp.com', // Replace with actual production domain
  ]
  
  for (const domain of productionDomains) {
    if (lowerUrl.includes(domain)) {
      return true
    }
  }
  
  return false
}

/**
 * Abort if BASE_URL points to production
 */
export function safetyCheck(baseUrl: string): void {
  console.log(`🔒 Safety Check: Validating BASE_URL: ${baseUrl}`)
  
  if (isProductionUrl(baseUrl)) {
    const message = `
❌ SAFETY ABORT: BASE_URL appears to be a PRODUCTION environment!
   URL: ${baseUrl}
   
   The investor pack screenshot runner is designed for LOCAL/DEV/STAGING only.
   Never run this against production to avoid:
   - Accidental data exposure
   - Performance impact
   - PII leaks in screenshots
   
   Please update BASE_URL in your .env.local to point to:
   - http://localhost:3000 (local dev)
   - https://your-app-staging.railway.app (staging)
   - https://dev.yourapp.com (dev environment)
   
   Aborted at: ${new Date().toISOString()}
`
    
    // Log to file
    fs.mkdirSync(path.dirname(SAFETY_LOG), { recursive: true })
    fs.appendFileSync(SAFETY_LOG, message + '\n\n')
    
    // Print to console
    console.error(message)
    
    // Exit
    process.exit(1)
  }
  
  console.log('✅ Safety Check: PASSED - BASE_URL is not production')
}

/**
 * Log successful run
 */
export function logSuccess(scriptName: string): void {
  const message = `✅ ${scriptName} completed successfully at ${new Date().toISOString()}\n`
  fs.appendFileSync(SAFETY_LOG, message)
}

/**
 * Ensure output directory exists
 */
export function ensureOutputDir(): void {
  const dir = path.join(process.cwd(), 'CRM screenshots')
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
    console.log(`📁 Created output directory: ${dir}`)
  }
}

/**
 * Get current git commit SHA (for provenance)
 */
export function getGitCommit(): string {
  try {
    const { execSync } = require('child_process')
    return execSync('git rev-parse HEAD').toString().trim()
  } catch {
    return 'unknown'
  }
}

/**
 * Get current git branch
 */
export function getGitBranch(): string {
  try {
    const { execSync } = require('child_process')
    return execSync('git rev-parse --abbrev-ref HEAD').toString().trim()
  } catch {
    return 'unknown'
  }
}

