'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { User, Camera, Upload, X, HelpCircle, Briefcase, Phone, MessageSquare } from 'lucide-react'
import type { AppUser } from '@/types/database'

interface PersonalInformationSectionProps {
  profile: AppUser
  onChange: (field: keyof AppUser, value: any) => void
  onPhotoUpload: (file: File) => Promise<void>
  uploadingPhoto: boolean
  hasChanges: boolean
}

export function PersonalInformationSection({
  profile,
  onChange,
  onPhotoUpload,
  uploadingPhoto,
  hasChanges
}: PersonalInformationSectionProps) {
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file')
      return
    }

    // Validate file size (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      alert('Image size must be less than 2MB')
      return
    }

    setPhotoFile(file)
    
    // Create preview
    const reader = new FileReader()
    reader.onloadend = () => {
      setPhotoPreview(reader.result as string)
    }
    reader.readAsDataURL(file)
  }

  const handlePhotoUpload = async () => {
    if (!photoFile) return
    
    await onPhotoUpload(photoFile)
    setPhotoFile(null)
    setPhotoPreview(null)
  }

  const clearPhotoSelection = () => {
    setPhotoFile(null)
    setPhotoPreview(null)
  }

  const getInitials = () => {
    const name = profile.full_name || 'User'
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .substring(0, 2)
      .toUpperCase()
  }

  return (
    <Card>
      <CardHeader className="pb-1.5">
        <CardTitle className="text-base flex items-center gap-2">
          <User className="h-3.5 w-3.5 text-indigo-600" />
          Personal Information
          {hasChanges && (
            <Badge variant="outline" className="ml-2 text-xs bg-amber-50 text-amber-700 border-amber-300">
              Unsaved
            </Badge>
          )}
        </CardTitle>
        <CardDescription className="text-xs">
          Your basic profile information and contact details
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-1.5">
        {/* Profile Photo - Compact */}
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0">
            <Avatar className="h-20 w-20">
              {photoPreview || profile.profile_photo_url ? (
                <AvatarImage 
                  src={photoPreview || profile.profile_photo_url || undefined} 
                  alt={profile.full_name}
                />
              ) : null}
              <AvatarFallback className="text-2xl bg-indigo-100 text-indigo-700 font-bold">
                {getInitials()}
              </AvatarFallback>
            </Avatar>
          </div>

          <div className="flex-1 space-y-2">
            <div>
              <Label className="text-xs font-medium">Profile Photo</Label>
              <p className="text-xs text-gray-500 mt-0.5">
                JPG, PNG or GIF. Max 2MB
              </p>
            </div>

            {photoFile ? (
              <div className="flex items-center gap-2">
                <Button 
                  onClick={handlePhotoUpload}
                  disabled={uploadingPhoto}
                  size="sm"
                  className="h-6 text-xs bg-indigo-600 hover:bg-indigo-700"
                >
                  {uploadingPhoto ? (
                    <>
                      <div className="animate-spin h-3.5 w-3.5 mr-1.5 border-2 border-white border-t-transparent rounded-full" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="h-3.5 w-3.5 mr-1.5" />
                      Upload
                    </>
                  )}
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm"
                  className="h-6 text-xs"
                  onClick={clearPhotoSelection}
                  disabled={uploadingPhoto}
                >
                  <X className="h-3.5 w-3.5 mr-1.5" />
                  Cancel
                </Button>
              </div>
            ) : (
              <div>
                <input
                  type="file"
                  id="photo-upload"
                  accept="image/*"
                  className="hidden"
                  onChange={handlePhotoSelect}
                />
                <Button 
                  variant="outline" 
                  size="sm"
                  className="h-6 text-xs"
                  onClick={() => document.getElementById('photo-upload')?.click()}
                >
                  <Camera className="h-3.5 w-3.5 mr-1.5" />
                  Choose Photo
                </Button>
              </div>
            )}
          </div>
        </div>

        {/* Full Name */}
        <div className="space-y-1.5">
          <div className="flex items-center gap-1.5">
            <Label htmlFor="full_name" className="text-xs">
              Full Name <span className="text-red-500">*</span>
            </Label>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <HelpCircle className="h-3.5 w-3.5 text-gray-400 cursor-help" />
                </TooltipTrigger>
                <TooltipContent>
                  <p className="max-w-xs text-xs">Your full name as it will appear throughout the system</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <Input
            id="full_name"
            value={profile.full_name || ''}
            onChange={(e) => onChange('full_name', e.target.value)}
            placeholder="Enter your full name"
            className="max-w-md h-9 text-xs"
          />
        </div>

        {/* Professional Title */}
        <div className="space-y-1.5">
          <div className="flex items-center gap-1.5">
            <Label htmlFor="professional_title" className="text-xs">Professional Title</Label>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <HelpCircle className="h-3.5 w-3.5 text-gray-400 cursor-help" />
                </TooltipTrigger>
                <TooltipContent>
                  <p className="max-w-xs text-xs">Your job title or role (e.g., Senior Dentist, Practice Manager)</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <div className="relative max-w-md">
            <Briefcase className="absolute left-3 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
            <Input
              id="professional_title"
              value={profile.professional_title || ''}
              onChange={(e) => onChange('professional_title', e.target.value)}
              placeholder="e.g., Senior Dentist"
              className="pl-9 h-9 text-xs"
            />
          </div>
        </div>

        {/* Phone Numbers - 2 Column Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <div className="flex items-center gap-1.5">
              <Label htmlFor="phone_mobile" className="text-xs">Mobile Phone</Label>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <HelpCircle className="h-3.5 w-3.5 text-gray-400 cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="max-w-xs text-xs">Your personal mobile number for urgent contact</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
              <Input
                id="phone_mobile"
                type="tel"
                value={profile.phone_mobile || ''}
                onChange={(e) => onChange('phone_mobile', e.target.value)}
                placeholder="+44 7700 900000"
                className="pl-9 h-9 text-xs"
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Label htmlFor="phone_office">Office Phone</Label>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <HelpCircle className="h-3.5 w-3.5 text-gray-400 cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="max-w-xs">Your office extension or direct line</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                id="phone_office"
                type="tel"
                value={profile.phone_office || ''}
                onChange={(e) => onChange('phone_office', e.target.value)}
                placeholder="+44 20 7946 0000"
                className="pl-10"
              />
            </div>
          </div>
        </div>

        {/* Bio */}
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Label htmlFor="bio">About Me</Label>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <HelpCircle className="h-3.5 w-3.5 text-gray-400 cursor-help" />
                </TooltipTrigger>
                <TooltipContent>
                  <p className="max-w-xs">A brief bio or introduction about yourself</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <Textarea
            id="bio"
            value={profile.bio || ''}
            onChange={(e) => onChange('bio', e.target.value)}
            placeholder="Tell us about yourself, your role, and your interests..."
            rows={4}
            className="max-w-2xl resize-none"
          />
          <p className="text-xs text-gray-500">
            {profile.bio?.length || 0} / 500 characters
          </p>
        </div>
      </CardContent>
    </Card>
  )
}

