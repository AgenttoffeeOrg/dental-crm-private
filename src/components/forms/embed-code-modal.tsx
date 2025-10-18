'use client'

import { useState, useMemo } from 'react'
import DOMPurify from 'dompurify'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { toast } from 'sonner'
import { Copy, Download, Share2, QrCode as QrCodeIcon } from 'lucide-react'
import type { MarketingForm } from '@/hooks/use-marketing-forms'
import {
  generateIframeEmbed,
  generateScriptEmbed,
  generateStaticHTML,
  generateHostedURL,
  generateQRCodeDataURL,
  generateUTMURL,
} from '@/lib/forms/embed-generator'

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

  // Sanitize HTML to prevent XSS attacks
  const sanitizedIframeCode = useMemo(() => {
    if (typeof window !== 'undefined') {
      return DOMPurify.sanitize(iframeCode, {
        ADD_TAGS: ['iframe'],
        ADD_ATTR: ['allow', 'allowfullscreen', 'frameborder', 'scrolling']
      })
    }
    return iframeCode
  }, [iframeCode])

  const scriptCode = generateScriptEmbed({
    formId: form.id,
    formSlug: form.public_url_slug || undefined,
  })

  const staticHTML = generateStaticHTML({
    formId: form.id,
    formHTML: `<h2>${form.name}</h2><p>${form.description || ''}</p>`,
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

  const downloadHTML = () => {
    const blob = new Blob([staticHTML], { type: 'text/html' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${form.name.toLowerCase().replace(/\s+/g, '-')}-form.html`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    toast.success('HTML file downloaded!')
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
            Choose how you want to share your form with the world
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="hosted" className="mt-4">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="hosted">Hosted Link</TabsTrigger>
            <TabsTrigger value="iframe">iframe</TabsTrigger>
            <TabsTrigger value="script">Script</TabsTrigger>
            <TabsTrigger value="html">Static HTML</TabsTrigger>
            <TabsTrigger value="qr">QR Code</TabsTrigger>
          </TabsList>

          {/* Hosted Link Tab */}
          <TabsContent value="hosted" className="space-y-4">
            <div>
              <Label>Hosted Form URL</Label>
              <div className="flex gap-2 mt-2">
                <Input value={hostedURL} readOnly className="font-mono text-sm" />
                <Button onClick={() => copyToClipboard(hostedURL, 'URL')} size="icon">
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-sm text-gray-500 mt-2">
                Share this link directly or embed it on your website
              </p>
            </div>

            {/* UTM Builder */}
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

          {/* iframe Tab */}
          <TabsContent value="iframe" className="space-y-4">
            <div>
              <Label>iframe Embed Code</Label>
              <div className="mt-2 relative">
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
              <p className="text-sm text-gray-500 mt-2">
                Copy and paste this code into your website's HTML
              </p>
            </div>

            <div className="border-t pt-4">
              <Label className="font-semibold">Preview</Label>
              <div className="mt-2 border rounded-lg p-4 bg-gray-50 dark:bg-gray-900">
                <div dangerouslySetInnerHTML={{ __html: sanitizedIframeCode }} />
              </div>
            </div>
          </TabsContent>

          {/* Script Tab */}
          <TabsContent value="script" className="space-y-4">
            <div>
              <Label>JavaScript Embed Code</Label>
              <div className="mt-2 relative">
                <pre className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg overflow-x-auto text-sm">
                  {scriptCode}
                </pre>
                <Button
                  onClick={() => copyToClipboard(scriptCode, 'script code')}
                  size="sm"
                  className="absolute top-2 right-2"
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Copy
                </Button>
              </div>
              <p className="text-sm text-gray-500 mt-2">
                This method dynamically loads the form using JavaScript
              </p>
            </div>
          </TabsContent>

          {/* Static HTML Tab */}
          <TabsContent value="html" className="space-y-4">
            <div>
              <Label>Standalone HTML Page</Label>
              <p className="text-sm text-gray-500 mt-2">
                Download a complete HTML file that works without any external dependencies
              </p>
              <Button onClick={downloadHTML} className="mt-4">
                <Download className="h-4 w-4 mr-2" />
                Download HTML File
              </Button>
            </div>

            <div className="border-t pt-4">
              <Label className="font-semibold">Preview (First 500 characters)</Label>
              <div className="mt-2 relative">
                <pre className="bg-gray-100 dark:bg-gray-800 p-4 rounded-lg overflow-x-auto text-xs max-h-64">
                  {staticHTML.substring(0, 500)}...
                </pre>
              </div>
            </div>
          </TabsContent>

          {/* QR Code Tab */}
          <TabsContent value="qr" className="space-y-4">
            <div className="text-center">
              <Label>QR Code</Label>
              <p className="text-sm text-gray-500 mt-2 mb-4">
                Print this QR code or share it digitally for easy mobile access
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

