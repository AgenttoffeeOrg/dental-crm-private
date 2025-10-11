'use client'

import { useState, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { 
  Upload, 
  Mic, 
  X, 
  AlertCircle,
  CheckCircle
} from 'lucide-react'
import { toast } from 'sonner'

interface AudioUploadProps {
  activityId: string
  onProcessingComplete?: () => void
  maxSizeMB?: number
}

export function AudioUpload({ 
  activityId, 
  onProcessingComplete,
  maxSizeMB = 50 
}: AudioUploadProps) {
  const [uploading, setUploading] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('audio/')) {
      toast.error('Please select an audio file')
      return
    }

    // Validate file size
    const fileSizeMB = file.size / (1024 * 1024)
    if (fileSizeMB > maxSizeMB) {
      toast.error(`File size must be less than ${maxSizeMB}MB`)
      return
    }

    setSelectedFile(file)
  }

  const handleUpload = async () => {
    if (!selectedFile) return

    try {
      setUploading(true)
      setUploadProgress(0)

      // Create FormData for server upload
      const formData = new FormData()
      formData.append('file', selectedFile)
      formData.append('activityId', activityId)

      console.log('Starting server-side upload for:', selectedFile.name)

      // Upload via server endpoint (bypasses client-side RLS issues)
      const response = await fetch('/api/upload/audio', {
        method: 'POST',
        body: formData,
      })

      const result = await response.json()

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Upload failed')
      }

      console.log('Server upload successful:', result)
      toast.success('Audio uploaded successfully')
      setUploading(false)
      setProcessing(true)

      // Trigger AI processing via direct OpenAI integration
      const aiResponse = await fetch('/api/process-audio-direct', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          activity_id: activityId,
        }),
      })

      if (!aiResponse.ok) {
        const errorData = await aiResponse.json().catch(() => ({ error: 'Unknown error' }))
        console.warn('AI processing failed:', errorData)
        toast.warning(`Upload successful! AI processing failed: ${errorData.error || 'Unknown error'}`)
      } else {
        const successData = await aiResponse.json()
        console.log('AI processing completed:', successData)
        toast.success('Upload successful! AI processing completed - transcript and insights generated.')
      }

      setProcessing(false)
      onProcessingComplete?.()
      
      // Reset form
      setSelectedFile(null)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }

    } catch (error) {
      console.error('Error uploading audio:', error)
      toast.error(`Upload failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
      setUploading(false)
      setProcessing(false)
    }
  }

  const handleCancel = () => {
    setSelectedFile(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const formatFileSize = (bytes: number) => {
    const mb = bytes / (1024 * 1024)
    return `${mb.toFixed(1)} MB`
  }

  if (processing) {
    return (
      <div className="text-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-sm text-gray-600">Processing audio with AI...</p>
        <p className="text-xs text-gray-500 mt-1">This may take a few moments</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {!selectedFile ? (
        <div>
          <input
            ref={fileInputRef}
            type="file"
            accept="audio/*"
            onChange={handleFileSelect}
            className="hidden"
          />
          <div 
            className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-blue-400 transition-colors"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <h3 className="text-lg font-medium mb-2">Upload Call Recording</h3>
            <p className="text-sm text-gray-600 mb-4">
              Select an audio file to upload and process with AI
            </p>
            <div className="flex items-center justify-center gap-4 text-xs text-gray-500">
              <div className="flex items-center gap-1">
                <Mic className="h-4 w-4" />
                MP3, WAV, M4A
              </div>
              <div>Max {maxSizeMB}MB</div>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Selected File Info */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Mic className="h-5 w-5 text-blue-600" />
                <div>
                  <p className="font-medium text-sm">{selectedFile.name}</p>
                  <p className="text-xs text-gray-600">
                    {formatFileSize(selectedFile.size)} • {selectedFile.type}
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCancel}
                disabled={uploading}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Upload Progress */}
          {uploading && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Uploading...</span>
                <span>{Math.round(uploadProgress)}%</span>
              </div>
              <Progress value={uploadProgress} className="h-2" />
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center gap-3">
            <Button
              onClick={handleUpload}
              disabled={uploading}
              className="flex-1"
            >
              {uploading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Upload & Process
                </>
              )}
            </Button>
            <Button
              variant="outline"
              onClick={handleCancel}
              disabled={uploading}
            >
              Cancel
            </Button>
          </div>

          {/* Info */}
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5" />
              <div className="text-xs text-amber-800">
                <p className="font-medium mb-1">AI Processing</p>
                <p>
                  Once uploaded, the audio will be transcribed and analyzed to extract 
                  key insights, generate summaries, and create follow-up tasks automatically.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}