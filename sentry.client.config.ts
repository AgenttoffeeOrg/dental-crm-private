import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: "https://9f500122e319dce965baba25e330cf07@o4510207888392192.ingest.de.sentry.io/4510207920701520",

  // Performance Monitoring
  tracesSampleRate: 1.0, // Capture 100% of transactions in dev/staging, adjust for production

  // Session Replay
  replaysSessionSampleRate: 0.1, // 10% of sessions
  replaysOnErrorSampleRate: 1.0, // 100% of sessions with errors

  // Set environment
  environment: process.env.NODE_ENV || "development",

  // Enable debug in development
  debug: process.env.NODE_ENV === "development",

  // Add integrations for better error tracking
  integrations: [
    Sentry.replayIntegration({
      maskAllText: true,
      blockAllMedia: true,
    }),
  ],

  // Filter out non-actionable errors
  ignoreErrors: [
    // Browser extensions
    "top.GLOBALS",
    "Can't find variable: __gCrWeb",
    "Non-Error promise rejection captured",
    // Network errors that are expected
    "NetworkError",
    "Failed to fetch",
  ],

  // Add custom tags
  initialScope: {
    tags: {
      app: "dental-crm",
      layer: "client",
    },
  },
});

