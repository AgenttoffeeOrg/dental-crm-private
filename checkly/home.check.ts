/**
 * Checkly Browser Check: Homepage
 * 
 * This check verifies that the dental-crm homepage loads correctly
 * and displays the expected content.
 * 
 * Runs every 5 minutes from multiple regions.
 */

import { BrowserCheck } from 'checkly/constructs'

const BASE_URL = process.env.BASE_URL || 'https://dental-crm-private-production.up.railway.app/'

new BrowserCheck('dtcrm-home-check', {
  name: 'Homepage Load',
  frequency: 5, // Run every 5 minutes
  locations: ['eu-west-1', 'us-east-1', 'ap-south-1'],
  tags: ['browser', 'homepage', 'critical'],
  
  code: {
    entrypoint: './home.spec.ts',
  },
})

