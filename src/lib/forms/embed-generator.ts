/**
 * Embed Code Generator
 * Generates various embed codes for marketing forms
 */

export interface EmbedOptions {
  formId: string
  formSlug?: string
  width?: string
  height?: string
  showBorder?: boolean
  backgroundColor?: string
}

/**
 * Generate iframe embed code
 */
export function generateIframeEmbed(options: EmbedOptions): string {
  const {
    formId,
    formSlug,
    width = '100%',
    height = '600px',
    showBorder = false,
  } = options

  const url = formSlug 
    ? `${process.env.NEXT_PUBLIC_APP_URL || 'https://dentalcrm.com'}/forms/embed/${formSlug}`
    : `${process.env.NEXT_PUBLIC_APP_URL || 'https://dentalcrm.com'}/forms/embed/${formId}`

  return `<iframe 
  src="${url}" 
  width="${width}" 
  height="${height}" 
  frameborder="${showBorder ? '1' : '0'}"
  style="border: ${showBorder ? '1px solid #e5e7eb' : 'none'};"
></iframe>`
}

/**
 * Generate JavaScript embed code
 */
export function generateScriptEmbed(options: EmbedOptions): string {
  const {
    formId,
    formSlug,
    width = '100%',
    height = '600px',
  } = options

  const url = formSlug 
    ? `${process.env.NEXT_PUBLIC_APP_URL || 'https://dentalcrm.com'}/forms/embed/${formSlug}`
    : `${process.env.NEXT_PUBLIC_APP_URL || 'https://dentalcrm.com'}/forms/embed/${formId}`

  return `<div id="dentalcrm-form-${formId}"></div>
<script>
  (function() {
    var iframe = document.createElement('iframe');
    iframe.src = '${url}';
    iframe.width = '${width}';
    iframe.height = '${height}';
    iframe.frameBorder = '0';
    iframe.style.border = 'none';
    document.getElementById('dentalcrm-form-${formId}').appendChild(iframe);
  })();
</script>`
}

/**
 * Generate static HTML export
 */
export function generateStaticHTML(options: EmbedOptions & { formHTML?: string }): string {
  const {
    formId,
    width = '600px',
    backgroundColor = '#ffffff',
    formHTML = '',
  } = options

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Contact Form</title>
  <style>
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      background-color: ${backgroundColor};
      padding: 2rem;
    }
    .form-container {
      max-width: ${width};
      margin: 0 auto;
      background: white;
      padding: 2rem;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
    }
    .form-field {
      margin-bottom: 1.5rem;
    }
    label {
      display: block;
      font-weight: 600;
      margin-bottom: 0.5rem;
      color: #374151;
    }
    input, textarea, select {
      width: 100%;
      padding: 0.75rem;
      border: 1px solid #d1d5db;
      border-radius: 6px;
      font-size: 1rem;
    }
    input:focus, textarea:focus, select:focus {
      outline: none;
      border-color: #3b82f6;
      box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
    }
    .required {
      color: #ef4444;
    }
    button {
      width: 100%;
      padding: 0.75rem 1.5rem;
      background-color: #3b82f6;
      color: white;
      border: none;
      border-radius: 6px;
      font-size: 1rem;
      font-weight: 600;
      cursor: pointer;
      transition: background-color 0.2s;
    }
    button:hover {
      background-color: #2563eb;
    }
    button:disabled {
      background-color: #9ca3af;
      cursor: not-allowed;
    }
    .error {
      color: #ef4444;
      font-size: 0.875rem;
      margin-top: 0.25rem;
    }
    .success {
      text-align: center;
      padding: 3rem 2rem;
    }
    .success-icon {
      width: 64px;
      height: 64px;
      margin: 0 auto 1rem;
      color: #10b981;
    }
    /* Honeypot - hidden from humans */
    .hp-field {
      position: absolute;
      left: -9999px;
      width: 1px;
      height: 1px;
    }
  </style>
</head>
<body>
  <div class="form-container">
    <div id="form-content">
      ${formHTML}
    </div>
    <div id="success-message" style="display: none;" class="success">
      <svg class="success-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
      </svg>
      <h2 style="font-size: 1.5rem; font-weight: bold; color: #111827; margin-bottom: 0.5rem;">Thank You!</h2>
      <p style="color: #6b7280;">We'll be in touch soon.</p>
    </div>
  </div>

  <script>
    const formId = '${formId}';
    const form = document.querySelector('form');
    const formLoadTime = Date.now();

    if (form) {
      form.addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const formData = new FormData(form);
        const data = {};
        formData.forEach((value, key) => {
          data[key] = value;
        });

        const honeypot = formData.get('website') || '';
        
        try {
          const response = await fetch('${process.env.NEXT_PUBLIC_APP_URL || 'https://dentalcrm.com'}/api/marketing/forms/submit', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              formId: formId,
              payload: data,
              sourceUrl: window.location.href,
              honeypot: honeypot,
              formLoadTime: formLoadTime.toString(),
            }),
          });

          const result = await response.json();

          if (response.ok) {
            document.getElementById('form-content').style.display = 'none';
            document.getElementById('success-message').style.display = 'block';
          } else {
            alert('Failed to submit form. Please try again.');
          }
        } catch (error) {
          console.error('Submission error:', error);
          alert('Failed to submit form. Please try again.');
        }
      });
    }
  </script>
</body>
</html>`
}

/**
 * Generate hosted form URL
 */
export function generateHostedURL(options: { formSlug: string; tenantSlug?: string }): string {
  const { formSlug, tenantSlug } = options
  const baseURL = process.env.NEXT_PUBLIC_APP_URL || 'https://dentalcrm.com'
  
  if (tenantSlug) {
    return `${baseURL}/forms/${tenantSlug}/${formSlug}`
  }
  
  return `${baseURL}/forms/f/${formSlug}`
}

/**
 * Generate QR code URL (using qrcode.react or API)
 */
export function generateQRCodeDataURL(url: string, size: number = 256): string {
  // This would typically use a QR code library
  // For now, return a placeholder or use Google Charts API
  return `https://chart.googleapis.com/chart?chs=${size}x${size}&cht=qr&chl=${encodeURIComponent(url)}&choe=UTF-8`
}

/**
 * Generate short link (would integrate with Bitly or custom shortener)
 */
export function generateShortLink(formId: string): string {
  // Placeholder - would integrate with URL shortening service
  const baseURL = process.env.NEXT_PUBLIC_APP_URL || 'https://dentalcrm.com'
  return `${baseURL}/f/${formId.substring(0, 8)}`
}

/**
 * Generate UTM-tagged URL
 */
export function generateUTMURL(options: {
  baseURL: string
  source?: string
  medium?: string
  campaign?: string
  term?: string
  content?: string
}): string {
  const { baseURL, source, medium, campaign, term, content } = options
  const params = new URLSearchParams()
  
  if (source) params.set('utm_source', source)
  if (medium) params.set('utm_medium', medium)
  if (campaign) params.set('utm_campaign', campaign)
  if (term) params.set('utm_term', term)
  if (content) params.set('utm_content', content)
  
  const queryString = params.toString()
  return queryString ? `${baseURL}?${queryString}` : baseURL
}

/**
 * Generate embed code with preview
 */
export function generateEmbedPreview(embedCode: string): string {
  return `<div style="padding: 1rem; background: #f3f4f6; border-radius: 8px; margin: 1rem 0;">
  <pre style="white-space: pre-wrap; word-wrap: break-word; font-family: monospace; font-size: 0.875rem;">${embedCode.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</pre>
</div>`
}

