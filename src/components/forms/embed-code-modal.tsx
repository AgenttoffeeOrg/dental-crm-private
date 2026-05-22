'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { toast } from 'sonner'
import { Copy, Download, Share2 } from 'lucide-react'
import type { MarketingForm } from '@/hooks/use-marketing-forms'
import {
  generateIframeEmbed,
  // generateScriptEmbed,    // Hidden in Phase 2b.3 — see docs/2b/2b-3-changes.md.
  //                            Underlying generator preserved for potential future restoration.
  // generateStaticHTML,     // Same — hidden, generator preserved.
  generateHostedURL,
  generateQRCodeDataURL,
  generateUTMURL,
} from '@/lib/forms/embed-generator'
import { CmsEmbedWizard } from './cms-embed-wizard'

interface EmbedCodeModalProps {
  form: MarketingForm
  open: boolean
  onClose: () => void
}

export function EmbedCodeModal({ form, open, onClose }: EmbedCodeModalProps) {
  const [utmSource, setUtmSource] = useState('')
  const [utmMedium, setUtmMedium] = useState('')
  const [utmCampaign, setUtmCampaign] = useState('')

  const hostedURL = generateHostedURL({
    formSlug: form.public_url_slug || form.id,
  })

  const iframeCode = generateIframeEmbed({
    formId: form.id,
    formSlug: form.public_url_slug || undefined,
  })

  const qrCodeURL = generateQRCodeDataURL(hostedURL, 256)

  const utmURL = generateUTMURL({
    baseURL: hostedURL,
    source: utmSource,
    medium: utmMedium,
    campaign: utmCampaign,
  })

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text)
      toast.success(`${label} copied to clipboard!`)
    } catch (err) {
      toast.error('Failed to copy to clipboard')
    }
  }

  const downloadQRCode = () => {
    const a = document.createElement('a')
    a.href = qrCodeURL
    a.download = `${form.name.toLowerCase().replace(/\s+/g, '-')}-qr-code.png`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    toast.success('QR code downloaded!')
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="h-5 w-5" />
            Publish & Share Form
          </DialogTitle>
          <DialogDescription>
            Choose how to put this form in front of patients. Iframe and hosted URL are the two
            first-class options — pick iframe to host the form on the practice's website, hosted
            URL for paid-ad traffic that needs full attribution capture.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="iframe" className="mt-4">
          {/*
            Phase 2b.3 — JavaScript snippet and Static HTML tabs hidden.
            See docs/2b/2b-3-changes.md. The underlying `generateScriptEmbed`
            and `generateStaticHTML` helpers in lib/forms/embed-generator.ts
            are preserved for potential future restoration.
          */}
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="iframe">Embed on your website (iframe)</TabsTrigger>
            <TabsTrigger value="hosted">Hosted form URL</TabsTrigger>
            <TabsTrigger value="qr">QR code</TabsTrigger>
          </TabsList>

          {/* iframe Tab — recommended for practices that already have a polished website */}
          <TabsContent value="iframe" className="space-y-4">
            <div>
              <Label className="text-base font-semibold">Embed on your website (iframe)</Label>
              <p className="text-sm text-gray-500 mt-1 mb-3">
                Paste this iframe into any page on your practice's website — works on Wix,
                Squarespace, WordPress, or any custom CMS. Best when you want the form to live on
                your own domain.
              </p>
              <div className="relative">
                <pre className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg overflow-x-auto text-sm">
                  {iframeCode}
                </pre>
                <Button
                  onClick={() => copyToClipboard(iframeCode, 'iframe code')}
                  size="sm"
                  className="absolute top-2 right-2"
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Copy
                </Button>
              </div>
            </div>

            <div className="border-t pt-4">
              <Label className="font-semibold">Preview</Label>
              <div className="mt-2 border rounded-lg p-4 bg-gray-50 dark:bg-gray-900">
                <div dangerouslySetInnerHTML={{ __html: iframeCode }} />
              </div>
            </div>

            <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
              <strong>Heads up:</strong> An iframe on the practice's website only captures the UTMs
              and click IDs that the practice manually appends to the iframe URL. For paid Google
              or Meta ads where you want every <code>gclid</code>/<code>fbclid</code> captured,
              prefer the <strong>Hosted form URL</strong> tab.
            </div>

            {/* 2b.28.1 — Per-CMS step-by-step embed instructions. Most
                practice owners aren't developers and need exact clicks
                rather than "paste this in your HTML". */}
            <div className="border-t pt-4">
              <CmsEmbedWizard />
            </div>
          </TabsContent>

          {/* Hosted Link Tab — recommended for paid ad campaigns */}
          <TabsContent value="hosted" className="space-y-4">
            <div>
              <Label className="text-base font-semibold">Hosted form URL</Label>
              <p className="text-sm text-gray-500 mt-1 mb-3">
                Use this URL when you want to send paid ad traffic directly to a clean landing page
                on our domain. Best for paid Google or Meta ads when you want full attribution
                capture (gclid / fbclid / msclkid / ttclid all flow into the contact's first-touch
                attribution).
              </p>
              <div className="flex gap-2">
                <Input value={hostedURL} readOnly className="font-mono text-sm" />
                <Button onClick={() => copyToClipboard(hostedURL, 'URL')} size="icon">
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* UTM Builder — kept as-is from Phase 2a.x */}
            <div className="border-t pt-4">
              <Label className="text-lg font-semibold">UTM Campaign Builder</Label>
              <p className="text-sm text-gray-500 mb-4">
                Add UTM parameters to track where your leads come from
              </p>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="utm_source">Source</Label>
                  <Input
                    id="utm_source"
                    placeholder="facebook"
                    value={utmSource}
                    onChange={(e) => setUtmSource(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="utm_medium">Medium</Label>
                  <Input
                    id="utm_medium"
                    placeholder="social"
                    value={utmMedium}
                    onChange={(e) => setUtmMedium(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="utm_campaign">Campaign</Label>
                  <Input
                    id="utm_campaign"
                    placeholder="spring-promo"
                    value={utmCampaign}
                    onChange={(e) => setUtmCampaign(e.target.value)}
                  />
                </div>
              </div>

              {(utmSource || utmMedium || utmCampaign) && (
                <div className="mt-4">
                  <Label>UTM-Tagged URL</Label>
                  <div className="flex gap-2 mt-2">
                    <Input value={utmURL} readOnly className="font-mono text-sm" />
                    <Button onClick={() => copyToClipboard(utmURL, 'UTM URL')} size="icon">
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </TabsContent>

          {/* QR Code Tab — wraps the hosted URL */}
          <TabsContent value="qr" className="space-y-4">
            <div className="text-center">
              <Label>QR Code</Label>
              <p className="text-sm text-gray-500 mt-2 mb-4">
                Print this QR code or share it digitally for easy mobile access. Scans land on the
                hosted form URL above.
              </p>

              <div className="inline-block border-4 border-gray-200 rounded-lg p-4">
                <img
                  src={qrCodeURL}
                  alt="QR Code"
                  className="w-64 h-64"
                />
              </div>

              <div className="mt-4 space-y-2">
                <Button onClick={downloadQRCode} className="w-full">
                  <Download className="h-4 w-4 mr-2" />
                  Download QR Code
                </Button>
                <Button
                  onClick={() => copyToClipboard(hostedURL, 'Form URL')}
                  variant="outline"
                  className="w-full"
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Copy Form URL
                </Button>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <div className="flex justify-between items-center pt-4 border-t">
          <div className="text-sm text-gray-500">
            Form ID: <code className="bg-gray-100 px-2 py-1 rounded">{form.id}</code>
          </div>
          <Button onClick={onClose}>Close</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
