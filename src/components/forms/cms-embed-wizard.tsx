'use client'

/**
 * Phase 2b.28.1 — Step-by-step embed instructions per CMS.
 *
 * Practice owners aren't developers. The iframe snippet alone leaves
 * them stuck on "where do I paste this?" — and they bounce.
 *
 * This component pairs the iframe code with picture-by-picture
 * instructions for the four CMSes that cover the vast majority of
 * dental practice websites in the UK / US: WordPress, Wix,
 * Squarespace, and the "I'll paste this into my custom HTML" path
 * for everything else (Webflow, Shopify, raw HTML, etc.).
 */

import { useState } from 'react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Label } from '@/components/ui/label'

type Cms = 'wordpress' | 'wix' | 'squarespace' | 'custom'

interface CmsOption {
  value: Cms
  label: string
  icon: string
  steps: Array<{ title: string; body: string }>
  /** Optional final-step warning / tip rendered as a muted note. */
  note?: string
}

const CMS_OPTIONS: CmsOption[] = [
  {
    value: 'wordpress',
    label: 'WordPress',
    icon: '🟦',
    steps: [
      {
        title: 'Open the page you want the form on',
        body: 'In your WordPress dashboard, go to Pages → All Pages, then click the page you want to embed the form on (or click "Add New" to create one).',
      },
      {
        title: 'Click Edit',
        body: 'Open the WordPress block editor (the page builder) for that page.',
      },
      {
        title: 'Add a Custom HTML block',
        body: 'Click the "+" button to add a new block, then search for "Custom HTML" and choose it. (If your site uses the Classic Editor, switch to the "Text" tab — not "Visual" — and paste there.)',
      },
      {
        title: 'Paste the iframe code',
        body: 'Copy the iframe snippet above and paste it into the Custom HTML block. You\'ll see a "Preview" button — click it to make sure the form renders.',
      },
      {
        title: 'Update / Publish',
        body: 'Hit "Update" (or "Publish" if this is a new page) at the top right. The form is now live on your site.',
      },
    ],
  },
  {
    value: 'wix',
    label: 'Wix',
    icon: '⬛',
    steps: [
      {
        title: 'Open your Wix Editor',
        body: 'Sign into Wix, open your site, and click "Edit Site".',
      },
      {
        title: 'Click the "+" Add button',
        body: 'On the left toolbar, click "Add Elements" (the "+" icon).',
      },
      {
        title: 'Choose Embed → Embed HTML',
        body: 'Scroll to the "Embed Code" section and pick "Embed HTML" (sometimes labelled "Custom Embeds").',
      },
      {
        title: 'Paste the iframe code',
        body: 'A popup opens with a text area. Paste the iframe snippet above into it. Click "Update".',
      },
      {
        title: 'Resize and publish',
        body: 'Drag the embed box on the page to position it. Set width to at least 100% and height to 600px so the whole form is visible. Click "Publish" at the top right.',
      },
    ],
  },
  {
    value: 'squarespace',
    label: 'Squarespace',
    icon: '⚫',
    steps: [
      {
        title: 'Open the page',
        body: 'Log into Squarespace and click into the page (or section of a page) you want the form on. Hit "Edit".',
      },
      {
        title: 'Add a block',
        body: 'Hover where you want the form and click the "+" insert point. A picker appears.',
      },
      {
        title: 'Choose Code block',
        body: 'In the picker, type or scroll to find "Code" (under More).',
      },
      {
        title: 'Paste the iframe code',
        body: 'The Code block defaults to HTML — that\'s what we want. Paste the iframe snippet above. Make sure "Display Source" is OFF.',
      },
      {
        title: 'Save',
        body: 'Click anywhere outside the block, then click "Save" or "Done" at the top.',
      },
    ],
    note:
      'On the Personal Squarespace plan, the Code block is unavailable — you\'ll need Business plan or higher. If the form doesn\'t appear, double-check the plan.',
  },
  {
    value: 'custom',
    label: 'Custom HTML / other CMS',
    icon: '💻',
    steps: [
      {
        title: 'Find your HTML file or template',
        body: 'Open the file or template that controls the page where you want the form (e.g. index.html, contact.html, or your CMS\'s page template).',
      },
      {
        title: 'Paste the iframe inside the <body>',
        body: 'Drop the iframe snippet exactly where you want the form to appear on the page. Anywhere inside the <body> tag will work.',
      },
      {
        title: 'Save and deploy',
        body: 'Save the file and deploy / sync it to your live site the same way you push any other change.',
      },
      {
        title: 'Test the form',
        body: 'Open the live page in an incognito window, fill out the form, and submit. The lead should appear in your dental CRM within seconds.',
      },
    ],
    note:
      'Works on Webflow (use an Embed component), Shopify (paste into a Page\'s code editor), Ghost (Custom HTML card), and any raw HTML site. The iframe is self-contained — no other tags or scripts needed.',
  },
]

export function CmsEmbedWizard() {
  const [selected, setSelected] = useState<Cms>('wordpress')

  const cms = CMS_OPTIONS.find((c) => c.value === selected) ?? CMS_OPTIONS[0]

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <Label className="text-sm font-medium">
          Step-by-step instructions for your website
        </Label>
        <div className="w-full sm:w-64">
          <Select value={selected} onValueChange={(v) => setSelected(v as Cms)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {CMS_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  <span className="mr-2">{option.icon}</span>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <ol className="space-y-3">
        {cms.steps.map((step, index) => (
          <li
            key={index}
            className="flex gap-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-950 p-3"
          >
            <div className="flex-shrink-0 h-6 w-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-semibold">
              {index + 1}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                {step.title}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400 mt-0.5">
                {step.body}
              </div>
            </div>
          </li>
        ))}
      </ol>

      {cms.note && (
        <div className="rounded-md border border-blue-200 bg-blue-50 p-3 text-xs text-blue-900">
          <strong>Heads up:</strong> {cms.note}
        </div>
      )}
    </div>
  )
}
