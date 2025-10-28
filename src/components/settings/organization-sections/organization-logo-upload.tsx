'use client'

import { useState, useRef } from 'react'
import { Upload, Building2, X, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { createClient } from '@/lib/supabase-client'
import { toast } from 'sonner'
import Image from 'next/image'

interface OrganizationLogoUploadProps {
  tenantId: string
  currentLogoUrl?: string | null
  onLogoUpdated: (newLogoUrl: string) => void
  disabled?: boolean
}

export function OrganizationLogoUpload({
  tenantId,
  currentLogoUrl,
  onLogoUpdated,
  disabled = false
}: OrganizationLogoUploadProps) {
  const [uploading, setUploading] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentLogoUrl || null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file')
      return
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Image size must be less than 2MB')
      return
    }

    setUploading(true)

    try {
      // Generate unique file name
      const fileExt = file.name.split('.').pop()
      const fileName = `${tenantId}/logo-${Date.now()}.${fileExt}`
      const filePath = `${fileName}`

      // Upload to Supabase storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('org-logos')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        })

      if (uploadError) {
        console.error('[OrganizationLogoUpload] Upload error:', uploadError)
        throw uploadError
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('org-logos')
        .getPublicUrl(filePath)

      // Update preview
      setPreviewUrl(publicUrl)

      // Notify parent component
      onLogoUpdated(publicUrl)

      toast.success('Logo uploaded successfully')
    } catch (error: any) {
      console.error('[OrganizationLogoUpload] Error:', error)
      toast.error(error.message || 'Failed to upload logo')
    } finally {
      setUploading(false)
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
  }

  const handleRemoveLogo = () => {
    setPreviewUrl(null)
    onLogoUpdated('')
    toast.success('Logo removed')
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Building2 className="h-5 w-5 text-indigo-600" />
          <CardTitle>Organization Logo</CardTitle>
        </div>
        <CardDescription>
          Upload a logo for your organization (max 2MB, square recommended)
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-start gap-6">
          {/* Logo Preview */}
          <div className="flex-shrink-0">
            <div className="w-32 h-32 rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 flex items-center justify-center overflow-hidden relative group">
              {previewUrl ? (
                <>
                  <Image
                    src={previewUrl}
                    alt="Organization logo"
                    fill
                    className="object-contain p-2"
                    unoptimized
                  />
                  {!disabled && (
                    <button
                      onClick={handleRemoveLogo}
                      className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                      aria-label="Remove logo"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </>
              ) : (
                <Building2 className="h-12 w-12 text-gray-400" />
              )}
            </div>
          </div>

          {/* Upload Controls */}
          <div className="flex-1 space-y-4">
            <div className="space-y-2">
              <p className="text-sm text-gray-700 font-medium">Upload Logo</p>
              <p className="text-xs text-gray-500">
                Recommended: Square image (200x200px or larger) in PNG or JPG format
              </p>
            </div>

            <div className="flex gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                disabled={uploading || disabled}
                className="hidden"
                id="logo-upload"
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading || disabled}
                className="gap-2"
              >
                {uploading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4" />
                    {previewUrl ? 'Change Logo' : 'Upload Logo'}
                  </>
                )}
              </Button>

              {previewUrl && !disabled && (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={handleRemoveLogo}
                  disabled={uploading}
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  Remove
                </Button>
              )}
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-xs text-blue-700">
                <strong>Tip:</strong> Your logo will appear in the organization switcher and on public-facing documents.
                A square logo with transparent background works best.
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

