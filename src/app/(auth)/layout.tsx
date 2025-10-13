import { Toaster } from 'sonner'

export const metadata = {
  title: 'Dental CRM - Authentication',
  description: 'Sign in to your dental practice management system',
}

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      {children}
      <Toaster position="top-right" richColors />
    </>
  )
}

