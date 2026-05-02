"use client";

import { useState } from "react";
import * as Sentry from "@sentry/nextjs";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function TestSentryPage() {
  const [status, setStatus] = useState<string>("");

  const testClientError = () => {
    try {
      setStatus("Triggering client-side error...");
      throw new Error("Test client-side Sentry error!");
    } catch (error) {
      Sentry.captureException(error);
      setStatus("✅ Client error sent to Sentry! Check your Sentry dashboard.");
    }
  };

  const testServerError = async () => {
    try {
      setStatus("Triggering server-side error...");
      const response = await fetch("/api/test-sentry", {
        method: "POST",
      });
      const data = await response.json();
      setStatus(data.message || "✅ Server error sent to Sentry!");
    } catch (error) {
      setStatus("❌ Failed to trigger server error");
    }
  };

  const testMessage = () => {
    setStatus("Sending test message...");
    Sentry.captureMessage("Test message from Sentry test page", "info");
    setStatus("✅ Test message sent to Sentry!");
  };

  const testBreadcrumb = () => {
    setStatus("Adding breadcrumb...");
    Sentry.addBreadcrumb({
      category: "test",
      message: "User clicked test breadcrumb button",
      level: "info",
    });
    Sentry.captureMessage("Test message with breadcrumb", "info");
    setStatus("✅ Breadcrumb added and message sent!");
  };

  return (
    <div className="container mx-auto p-8 max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle>Sentry Test Page</CardTitle>
          <CardDescription>
            Use these buttons to test Sentry error tracking. Make sure you've added your{" "}
            <code className="text-xs bg-muted px-1 py-0.5 rounded">NEXT_PUBLIC_SENTRY_DSN</code> to{" "}
            <code className="text-xs bg-muted px-1 py-0.5 rounded">.env.local</code>
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Button onClick={testClientError} variant="destructive" className="w-full">
              Test Client-Side Error
            </Button>
            <Button onClick={testServerError} variant="destructive" className="w-full">
              Test Server-Side Error
            </Button>
            <Button onClick={testMessage} variant="outline" className="w-full">
              Test Message
            </Button>
            <Button onClick={testBreadcrumb} variant="outline" className="w-full">
              Test Breadcrumb
            </Button>
          </div>

          {status && (
            <div className="mt-4 p-4 bg-muted rounded-md">
              <p className="text-sm">{status}</p>
            </div>
          )}

          <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-950 rounded-md">
            <p className="text-sm text-blue-900 dark:text-blue-100">
              <strong>Note:</strong> After clicking a button, check your Sentry dashboard at{" "}
              <a
                href="https://sentry.io"
                target="_blank"
                rel="noopener noreferrer"
                className="underline"
              >
                sentry.io
              </a>{" "}
              to see the events. It may take a few seconds to appear.
            </p>
          </div>

          <div className="mt-4 p-4 bg-yellow-50 dark:bg-yellow-950 rounded-md">
            <p className="text-sm text-yellow-900 dark:text-yellow-100">
              <strong>Debug Mode:</strong> Check your browser console and terminal for Sentry debug
              logs if <code className="text-xs bg-muted px-1 py-0.5 rounded">NEXT_PUBLIC_SENTRY_DEBUG=true</code> is set.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}



