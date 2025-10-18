import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: "https://9f500122e319dce965baba25e330cf07@o4510207888392192.ingest.de.sentry.io/4510207920701520",

  // Performance Monitoring
  tracesSampleRate: 1.0,

  // Set environment
  environment: process.env.NODE_ENV || "development",

  // Enable debug in development
  debug: process.env.NODE_ENV === "development",

  // Add custom tags
  initialScope: {
    tags: {
      app: "dental-crm",
      layer: "edge",
    },
  },
});

