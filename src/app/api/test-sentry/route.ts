import { NextResponse } from "next/server";
import * as Sentry from "@sentry/nextjs";

export async function POST() {
  try {
    // Simulate a server-side error
    throw new Error("Test server-side Sentry error from API route!");
  } catch (error) {
    Sentry.captureException(error);
    return NextResponse.json(
      {
        message: "✅ Server error sent to Sentry! Check your Sentry dashboard.",
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}



