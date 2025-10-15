'use client'

import { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Upload, X, File, FileImage, FileText, Check, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase-client'
import { toast } from 'sonner'

interface FileUploadFieldProps {
  id: string
  label: string
  required?: boolean
  value?: string // URL of uploaded file
  onChange: (url: string) => void
  maxSizeMB?: number
  acceptedTypes?: string[]
  placeholder?: string
}

export function FileUploadField({
  id,
  label,
  required = false,
  value,
  onChange,
  maxSizeMB = 10,
  acceptedTypes = ['image/*', 'application/pdf', '.doc', '.docx'],
  placeholder = 'Click to upload or drag and drop',
}: FileUploadFieldProps) {
  const [uploading, setUploading] = useState(false)
  const [dragActive, setDragActive] = useState(false)
  const [fileName, setFileName] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const supabase = createClient()

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true)
    } else if (e.type === 'dragleave') {
      setDragActive(false)
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setDragActive(false)

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0])
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault()
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0])
    }
  }

  const handleFile = async (file: File) => {
    // Validate file size
    const fileSizeMB = file.size / (1024 * 1024)
    if (fileSizeMB > maxSizeMB) {
      toast.error(`File size must be less than ${maxSizeMB}MB`)
      return
    }

    setUploading(true)
    setFileName(file.name)

    try {
      // Upload to Supabase Storage
      const fileExt = file.name.split('.').pop()
      const fileName = `${Math.random().toString(36).substring(2)}_${Date.now()}.${fileExt}`
      const filePath = `form-uploads/${fileName}`

      const { data, error } = await supabase.storage
        .from('public')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
        })

      if (error) {
        throw error
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('public')
        .getPublicUrl(filePath)

      onChange(urlData.publicUrl)
      toast.success('File uploaded successfully!')
    } catch (error) {
      console.error('Upload error:', error)
      toast.error('Failed to upload file')
    } finally {
      setUploading(false)
    }
  }

  const handleRemove = () => {
    setFileName('')
    onChange('')
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const getFileIcon = () => {
    if (!fileName) return <Upload className="h-8 w-8" />
    
    const ext = fileName.split('.').pop()?.toLowerCase()
    if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext || '')) {
      return <FileImage className="h-8 w-8" />
    }
    if (['pdf'].includes(ext || '')) {
      return <FileText className="h-8 w-8 text-red-500" />
    }
    return <File className="h-8 w-8" />
  }

  return (
    <div className="space-y-2">
      <Label htmlFor={id}>
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </Label>

      <div
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        className={`
          relative border-2 border-dashed rounded-lg p-6 transition-all
          ${dragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300'}
          ${value ? 'bg-green-50 border-green-300' : 'hover:border-gray-400'}
        `}
      >
        <input
          ref={fileInputRef}
          id={id}
          type="file"
          className="hidden"
          onChange={handleChange}
          accept={acceptedTypes.join(',')}
          disabled={uploading}
        />

        {uploading ? (
          <div className="text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-3 text-blue-600" />
            <p className="text-sm text-gray-600">Uploading {fileName}...</p>
          </div>
        ) : value ? (
          <div className="text-center">
            <div className="flex items-center justify-center mb-3 text-green-600">
              <Check className="h-8 w-8" />
            </div>
            <p className="text-sm font-medium text-gray-900 mb-1">{fileName}</p>
            <p className="text-xs text-gray-500 mb-3">File uploaded successfully</p>
            <div className="flex gap-2 justify-center">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => window.open(value, '_blank')}
              >
                View File
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={handleRemove}
                className="text-red-600 hover:text-red-700"
              >
                <X className="h-4 w-4 mr-1" />
                Remove
              </Button>
            </div>
          </div>
        ) : (
          <div className="text-center">
            <div className="flex items-center justify-center mb-3 text-gray-400">
              {getFileIcon()}
            </div>
            <p className="text-sm text-gray-600 mb-1">{placeholder}</p>
            <p className="text-xs text-gray-500 mb-3">
              Max file size: {maxSizeMB}MB
            </p>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
            >
              Choose File
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}

