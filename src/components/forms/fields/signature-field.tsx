'use client'

import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { RotateCcw, Check } from 'lucide-react'
import SignatureCanvas from 'react-signature-canvas'

interface SignatureFieldProps {
  id: string
  label: string
  required?: boolean
  value?: string // Base64 image data
  onChange: (signature: string) => void
  placeholder?: string
}

export function SignatureField({
  id,
  label,
  required = false,
  value,
  onChange,
  placeholder = 'Sign here',
}: SignatureFieldProps) {
  const [isEmpty, setIsEmpty] = useState(true)
  const sigCanvas = useRef<any>(null)

  useEffect(() => {
    if (value && sigCanvas.current) {
      sigCanvas.current.fromDataURL(value)
      setIsEmpty(false)
    }
  }, [value])

  const handleClear = () => {
    if (sigCanvas.current) {
      sigCanvas.current.clear()
      setIsEmpty(true)
      onChange('')
    }
  }

  const handleEnd = () => {
    if (sigCanvas.current && !sigCanvas.current.isEmpty()) {
      const dataUrl = sigCanvas.current.toDataURL('image/png')
      onChange(dataUrl)
      setIsEmpty(false)
    }
  }

  return (
    <div className="space-y-2">
      <Label htmlFor={id}>
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </Label>

      <div className="border-2 border-gray-300 rounded-lg overflow-hidden bg-white">
        <div className="relative bg-gray-50 p-2 border-b">
          <p className="text-xs text-gray-500 text-center">{placeholder}</p>
        </div>
        
        <div className="relative">
          <SignatureCanvas
            ref={sigCanvas}
            canvasProps={{
              className: 'signature-canvas w-full h-48',
              style: {
                border: 'none',
                cursor: 'crosshair',
              },
            }}
            backgroundColor="white"
            onEnd={handleEnd}
          />
        </div>

        <div className="flex items-center justify-between p-3 bg-gray-50 border-t">
          <div className="text-xs text-gray-500">
            {isEmpty ? 'Use your mouse or finger to sign' : '✓ Signature captured'}
          </div>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={handleClear}
            disabled={isEmpty}
          >
            <RotateCcw className="h-4 w-4 mr-1" />
            Clear
          </Button>
        </div>
      </div>

      {value && (
        <div className="flex items-center gap-2 text-sm text-green-600">
          <Check className="h-4 w-4" />
          <span>Signature saved</span>
        </div>
      )}
    </div>
  )
}

