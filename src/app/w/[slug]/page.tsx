import { notFound } from 'next/navigation'
import { isValidSlug } from '@/lib/booking-widget/types'
import { loadWidgetConfigBySlug } from '@/lib/booking-widget/load-config'
import { BookingWidget } from '@/components/booking-widget/booking-widget'

interface PageProps {
  params: { slug: string }
}

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export default async function PublicWidgetPage({ params }: PageProps) {
  const slug = params.slug
  if (!isValidSlug(slug)) {
    notFound()
  }

  const result = await loadWidgetConfigBySlug(slug)
  if (!result.ok) {
    notFound()
  }

  const config = result.config
  // Force inline render mode on the landing page — the floating-button trigger
  // doesn't make sense when the widget IS the page.
  const inlineConfig = {
    ...config,
    trigger: { ...config.trigger, mode: 'inline' as const },
  }

  const heroImage = config.theme.hero_image_url
  const primary = config.theme.primary_color

  return (
    <main
      style={{
        minHeight: '100vh',
        margin: 0,
        background: '#f8fafc',
        fontFamily:
          'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
        color: '#0f172a',
      }}
    >
      <header
        style={{
          background: primary,
          color: config.theme.text_color,
          padding: '32px 24px',
          textAlign: 'center',
        }}
      >
        {config.theme.logo_url ? (
          <img
            src={config.theme.logo_url}
            alt={`${config.practice_name} logo`}
            style={{ maxHeight: 56, marginBottom: 12 }}
          />
        ) : null}
        <h1 style={{ margin: 0, fontSize: 28, fontWeight: 700 }}>{config.practice_name}</h1>
        <p style={{ margin: '8px 0 0', fontSize: 16, opacity: 0.95 }}>
          {config.greeting_title}
        </p>
        {config.greeting_subtitle ? (
          <p style={{ margin: '4px 0 0', fontSize: 14, opacity: 0.85 }}>
            {config.greeting_subtitle}
          </p>
        ) : null}
      </header>

      {heroImage ? (
        <div
          aria-hidden="true"
          style={{
            background: `url(${heroImage}) center / cover no-repeat`,
            height: 220,
          }}
        />
      ) : null}

      <section style={{ padding: '32px 16px' }}>
        <BookingWidget config={inlineConfig} apiBase="" />
      </section>

      <footer
        style={{
          textAlign: 'center',
          padding: '16px 24px 40px',
          fontSize: 12,
          color: '#94a3b8',
        }}
      >
        Powered by DentalCRM
      </footer>
    </main>
  )
}
