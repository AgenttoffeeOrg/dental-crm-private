#!/usr/bin/env node
/**
 * CI Guard: Prevent Legacy Tenant ID Context Derivation
 * 
 * This script blocks any code that uses app_users.tenant_id to derive active context.
 * It allows benign uses (feature flags, display, query filters) but blocks context assignment.
 * 
 * Usage: node scripts/ci-guard-tenant-id.mjs
 * Exit codes: 0 = pass, 1 = violations found
 */

import { readFileSync, readdirSync, statSync } from 'fs'
import { join } from 'path'

// Patterns that BLOCK (context derivation)
const BLOCKED_PATTERNS = [
  // Fallback patterns (most dangerous)
  /active_tenant_id\s*\|\|\s*tenant_id/g,
  /active_tenant_id\s*\?\?\s*tenant_id/g,
  
  // Direct assignment to active context
  /active.*=.*app_users?\.tenant_id/g,
  /active.*=.*appUsers?\.tenant_id/g,
  
  // Using tenant_id to derive context (not just filter)
  /getTenantContext.*appUser\.tenant_id/g,
  /setActiveTenant.*appUser\.tenant_id/g,
]

// Patterns that ALLOW (benign uses)
const ALLOWED_PATTERNS = [
  // Feature flags
  /useFeatureFlag\(['"][\w_]+['"],\s*appUser\?\.tenant_id\)/g,
  
  // Query filters (RLS layer handles security)
  /\.eq\(['"]tenant_id['"],\s*appUser\?\.tenant_id\)/g,
  
  // Display/logging (read-only)
  /console\.log.*tenant_id/g,
  /tenant_id:\s*appUser\?\.tenant_id/g, // As property value
  
  // Comments
  /\/\/.*/g,
  /\/\*[\s\S]*?\*\//g,
]

const SRC_DIR = join(process.cwd(), 'src')
const VIOLATIONS = []

/**
 * Recursively scan directory for TypeScript/JavaScript files
 */
function scanDirectory(dir) {
  const entries = readdirSync(dir)
  
  for (const entry of entries) {
    const fullPath = join(dir, entry)
    const stat = statSync(fullPath)
    
    if (stat.isDirectory()) {
      // Skip node_modules, .next, etc.
      if (!entry.startsWith('.') && entry !== 'node_modules') {
        scanDirectory(fullPath)
      }
    } else if (/\.(ts|tsx|js|jsx)$/.test(entry)) {
      checkFile(fullPath)
    }
  }
}

/**
 * Check a single file for violations
 */
function checkFile(filePath) {
  const content = readFileSync(filePath, 'utf-8')
  const relativePath = filePath.replace(process.cwd() + '/', '')
  
  // Split into lines for reporting
  const lines = content.split('\n')
  
  for (let lineNum = 0; lineNum < lines.length; lineNum++) {
    const line = lines[lineNum]
    
    // Skip if line is allowed
    if (isAllowedLine(line)) {
      continue
    }
    
    // Check for blocked patterns
    for (const pattern of BLOCKED_PATTERNS) {
      const matches = line.matchAll(pattern)
      
      for (const match of matches) {
        VIOLATIONS.push({
          file: relativePath,
          line: lineNum + 1,
          code: line.trim(),
          pattern: pattern.source,
        })
      }
    }
  }
}

/**
 * Check if a line is allowed (benign use)
 */
function isAllowedLine(line) {
  for (const pattern of ALLOWED_PATTERNS) {
    if (pattern.test(line)) {
      return true
    }
  }
  return false
}

/**
 * Main execution
 */
function main() {
  console.log('🔍 CI Guard: Scanning for legacy tenant_id context derivation...\n')
  
  scanDirectory(SRC_DIR)
  
  if (VIOLATIONS.length === 0) {
    console.log('✅ PASS: No legacy tenant_id context derivation found!\n')
    process.exit(0)
  }
  
  console.error(`❌ FAIL: Found ${VIOLATIONS.length} violation(s):\n`)
  
  for (const violation of VIOLATIONS) {
    console.error(`  ${violation.file}:${violation.line}`)
    console.error(`    ${violation.code}`)
    console.error(`    Pattern: ${violation.pattern}\n`)
  }
  
  console.error('BLOCKED PATTERNS (context derivation):')
  console.error('  - active_tenant_id || tenant_id (fallback)')
  console.error('  - active_tenant_id ?? tenant_id (fallback)')
  console.error('  - active.* = appUser.tenant_id (assignment)')
  console.error('')
  console.error('ALLOWED PATTERNS (benign uses):')
  console.error('  - useFeatureFlag(..., appUser?.tenant_id) (feature flags)')
  console.error('  - .eq("tenant_id", appUser?.tenant_id) (query filters)')
  console.error('  - console.log / tenant_id: ... (display/logging)')
  console.error('')
  console.error('FIX: Replace app_users.tenant_id with app_users.active_tenant_id for context.')
  console.error('     Remove fallback patterns (|| tenant_id) entirely.')
  console.error('')
  
  process.exit(1)
}

main()

