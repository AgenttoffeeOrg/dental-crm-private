#!/usr/bin/env node

/**
 * Get Screen Size Utility
 * Returns both system resolution and browser viewport size
 */

console.log('\n📺 Screen Size Information\n');
console.log('=' .repeat(50));

// System Resolution (from system_profiler)
const { execSync } = require('child_process');
try {
  const output = execSync('system_profiler SPDisplaysDataType | grep -A 1 "Resolution"', { encoding: 'utf-8' });
  const resolutionMatch = output.match(/Resolution:\s+(\d+)\s+x\s+(\d+)/);
  if (resolutionMatch) {
    console.log('\n🖥️  System Resolution:');
    console.log(`   Width:  ${resolutionMatch[1]}px`);
    console.log(`   Height: ${resolutionMatch[2]}px`);
  }
} catch (error) {
  console.log('Could not detect system resolution');
}

// Browser Viewport Size (common sizes)
console.log('\n🌐 Recommended Browser Viewport Sizes:');
console.log('\n   For automation, try these common sizes:');
console.log('   • 1920 x 1080 (Full HD)');
console.log('   • 1440 x 900  (MacBook Pro 13")');
console.log('   • 1680 x 1050 (MacBook Pro 15")');
console.log('   • 2560 x 1440 (QHD)');
console.log('   • 1280 x 800  (Smaller viewport)');

console.log('\n💡 To get your exact browser viewport:');
console.log('   1. Open your browser');
console.log('   2. Open DevTools (F12 or Cmd+Option+I)');
console.log('   3. Open Console tab');
console.log('   4. Run: console.log(window.innerWidth, window.innerHeight)');
console.log('   5. Or run: console.log(screen.width, screen.height)');

console.log('\n📱 For your MacBook (2560 x 1664):');
console.log('   • Actual viewport might be: 1280 x 832 (with 2x scaling)');
console.log('   • Or: 2560 x 1664 (without scaling)');
console.log('   • Check browser DevTools to see actual viewport');

console.log('\n' + '='.repeat(50) + '\n');


