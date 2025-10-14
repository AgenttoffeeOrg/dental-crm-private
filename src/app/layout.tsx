import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/lib/auth";
import { Toaster } from "sonner";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import { LoadingFallback } from "@/components/ui/loading-fallback";
import { Suspense } from "react";

export const metadata: Metadata = {
  title: "Dental CRM - Practice Management Platform",
  description: "Enterprise-grade CRM for dental practices",
  viewport: "width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no",
};

export const dynamic = 'force-dynamic'

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        <ErrorBoundary>
          <AuthProvider>
            <Suspense fallback={<LoadingFallback message="Loading Dental CRM..." fullScreen />}>
              {children}
            </Suspense>
          </AuthProvider>
        </ErrorBoundary>
        <Toaster position="top-right" richColors />
      </body>
    </html>
  );
}
