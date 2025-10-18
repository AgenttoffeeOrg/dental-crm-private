module.exports = {
  version: 2,
  
  // Percy snapshot configuration
  snapshot: {
    widths: [375, 768, 1280, 1920],
    minHeight: 1024,
    percyCSS: '',
    enableJavaScript: true,
  },
  
  // Discovery configuration
  discovery: {
    allowedHostnames: [],
    networkIdleTimeout: 750,
    disableCache: false,
  },
  
  // Percy specific options
  percy: {
    // Enable animations for consistency
    enableJavaScript: true,
    
    // Freeze animations for consistent snapshots
    freezeAnimatedImage: true,
    freezeImageBySelectors: [],
    
    // Ignore regions that change frequently
    ignoreRegionsSelectors: [
      '[data-percy-ignore]',
      '.percy-ignore',
      // Add selectors for dynamic content like timestamps
      // '[data-timestamp]',
      // '.real-time-data',
    ],
    
    // Threshold for visual changes (0-1, where 0 is no tolerance)
    threshold: 0.01,
  },
}

