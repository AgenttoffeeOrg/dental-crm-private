'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { 
  Image as ImageIcon,
  Video,
  Calendar,
  Send,
  Eye,
  Link2,
  Hash,
  AtSign,
  X,
  Check,
  Clock,
  Sparkles
} from 'lucide-react'
import { createClient } from '@/lib/supabase-client'
import { useTenantContext } from '@/lib/hooks/use-tenant-context'
import { toast } from 'sonner'

interface SocialMediaComposerProps {
  onComplete?: (postId: string) => void
  onCancel?: () => void
}

export function SocialMediaComposer({ onComplete, onCancel }: SocialMediaComposerProps) {
  const [content, setContent] = useState('')
  const [linkUrl, setLinkUrl] = useState('')
  const [hashtags, setHashtags] = useState<string[]>([])
  const [currentHashtag, setCurrentHashtag] = useState('')
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>(['facebook', 'instagram'])
  const [scheduleType, setScheduleType] = useState<'now' | 'schedule'>('now')
  const [scheduledTime, setScheduledTime] = useState('')
  const [mediaFiles, setMediaFiles] = useState<File[]>([])
  const [loading, setLoading] = useState(false)
  const [accounts, setAccounts] = useState<any[]>([])

  useEffect(() => {
    loadAccounts()
  }, [])

  const loadAccounts = async () => {
    try {
      const supabase = createClient()
      // Note: This component needs tenant context when social_media_accounts table exists
      // For now, skip loading as table may not exist yet
      return

      /* Uncomment when social_media_accounts table is created:
      const { data } = await supabase
        .from('social_media_accounts')
        .select('*')
        .eq('tenant_id', orgId)
        .eq('is_active', true)

      setAccounts(data || [])
      */
    } catch (error) {
      console.error('[SOCIAL] Error loading accounts:', error)
    }
  }

  const togglePlatform = (platform: string) => {
    setSelectedPlatforms(prev =>
      prev.includes(platform)
        ? prev.filter(p => p !== platform)
        : [...prev, platform]
    )
  }

  const addHashtag = () => {
    if (currentHashtag && !hashtags.includes(currentHashtag)) {
      setHashtags([...hashtags, currentHashtag])
      setCurrentHashtag('')
    }
  }

  const removeHashtag = (tag: string) => {
    setHashtags(hashtags.filter(t => t !== tag))
  }

  const getCharacterCount = () => {
    const baseLength = content.length
    const hashtagLength = hashtags.length > 0 ? hashtags.join(' ').length + hashtags.length : 0
    return baseLength + hashtagLength
  }

  const getCharacterLimit = () => {
    if (selectedPlatforms.includes('twitter')) return 280
    if (selectedPlatforms.includes('linkedin')) return 3000
    return 2200 // Instagram/Facebook
  }

  const handleMediaUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || [])
    setMediaFiles([...mediaFiles, ...files])
  }

  const removeMedia = (index: number) => {
    setMediaFiles(mediaFiles.filter((_, i) => i !== index))
  }

  const handlePublish = async () => {
    if (!content.trim()) {
      toast.error('Please enter post content')
      return
    }

    if (selectedPlatforms.length === 0) {
      toast.error('Please select at least one platform')
      return
    }

    setLoading(true)

    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()
      const tenantId = user?.user_metadata?.tenant_id

      // Create posts for each selected platform
      const posts = selectedPlatforms.map(platform => {
        const account = accounts.find(a => a.platform === platform)
        
        return {
          tenant_id: tenantId,
          account_id: account?.id,
          platform,
          content_text: content,
          link_url: linkUrl || null,
          hashtags,
          status: scheduleType === 'now' ? 'publishing' : 'scheduled',
          scheduled_at: scheduleType === 'schedule' ? scheduledTime : null,
          published_at: scheduleType === 'now' ? new Date().toISOString() : null
        }
      })

      const { data, error } = await supabase
        .from('social_media_posts')
        .insert(posts)
        .select()

      if (error) throw error

      toast.success(
        scheduleType === 'now'
          ? `🚀 Publishing to ${selectedPlatforms.length} platform(s)!`
          : `📅 Scheduled for ${new Date(scheduledTime).toLocaleString()}`
      )

      if (onComplete && data?.[0]) {
        onComplete(data[0].id)
      }
    } catch (error) {
      console.error('[SOCIAL] Error creating post:', error)
      toast.error('Failed to create post')
    } finally {
      setLoading(false)
    }
  }

  const platformOptions = [
    { id: 'facebook', name: 'Facebook', color: 'border-blue-500 bg-blue-50 text-blue-700' },
    { id: 'instagram', name: 'Instagram', color: 'border-pink-500 bg-pink-50 text-pink-700' },
    { id: 'tiktok', name: 'TikTok', color: 'border-gray-800 bg-gray-50 text-gray-800' },
    { id: 'linkedin', name: 'LinkedIn', color: 'border-blue-700 bg-blue-50 text-blue-700' },
    { id: 'twitter', name: 'Twitter/X', color: 'border-sky-500 bg-sky-50 text-sky-700' },
  ]

  return (
    <div className="grid grid-cols-12 gap-6">
      {/* Composer - 8 columns */}
      <div className="col-span-8 space-y-4">
        {/* Platform Selection */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Select Platforms</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {platformOptions.map(platform => {
                const account = accounts.find(a => a.platform === platform.id)
                const isSelected = selectedPlatforms.includes(platform.id)
                const isAvailable = !!account

                return (
                  <button
                    key={platform.id}
                    onClick={() => isAvailable && togglePlatform(platform.id)}
                    disabled={!isAvailable}
                    className={`px-4 py-2 rounded-lg border-2 font-medium transition-all ${
                      isSelected && isAvailable
                        ? platform.color
                        : isAvailable
                        ? 'border-gray-200 hover:border-gray-300'
                        : 'border-gray-200 bg-gray-100 text-gray-400 cursor-not-allowed'
                    }`}
                  >
                    {platform.name}
                    {isSelected && <Check className="inline h-4 w-4 ml-1" />}
                    {!isAvailable && <X className="inline h-4 w-4 ml-1" />}
                  </button>
                )
              })}
            </div>
            {accounts.length === 0 && (
              <p className="text-sm text-gray-600 mt-2">
                No accounts connected. <a href="/marketing/social-media/connect" className="text-blue-600 underline">Connect accounts</a>
              </p>
            )}
          </CardContent>
        </Card>

        {/* Content */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Post Content</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="What do you want to share? Write your post content here..."
                rows={8}
                className="resize-none"
              />
              <div className="flex items-center justify-between mt-2 text-sm">
                <p className="text-gray-600">
                  {getCharacterCount()} / {getCharacterLimit()} characters
                </p>
                {getCharacterCount() > getCharacterLimit() && (
                  <Badge variant="destructive">Too long!</Badge>
                )}
              </div>
            </div>

            {/* Link URL */}
            <div>
              <Label>Link (Optional)</Label>
              <div className="flex gap-2 mt-1">
                <Link2 className="h-9 w-9 p-2 text-gray-400 border rounded-lg" />
                <Input
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  placeholder="https://example.com"
                  type="url"
                />
              </div>
            </div>

            {/* Hashtags */}
            <div>
              <Label>Hashtags</Label>
              <div className="flex gap-2 mt-1">
                <Hash className="h-9 w-9 p-2 text-gray-400 border rounded-lg" />
                <Input
                  value={currentHashtag}
                  onChange={(e) => setCurrentHashtag(e.target.value.replace(/^#/, ''))}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      void addHashtag()
                    }
                  }}
                  placeholder="Type and press Enter"
                />
                <Button onClick={addHashtag} variant="outline">Add</Button>
              </div>
              {hashtags.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {hashtags.map(tag => (
                    <Badge key={tag} variant="secondary" className="text-sm">
                      #{tag}
                      <button onClick={() => removeHashtag(tag)} className="ml-2">
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            {/* Media Upload */}
            <div>
              <Label>Media</Label>
              <div className="mt-1">
                <label className="flex items-center justify-center gap-2 border-2 border-dashed border-gray-300 rounded-lg p-6 cursor-pointer hover:border-gray-400 transition-colors">
                  <ImageIcon className="h-5 w-5 text-gray-400" />
                  <Video className="h-5 w-5 text-gray-400" />
                  <span className="text-sm text-gray-600">Click to upload images or videos</span>
                  <input
                    type="file"
                    onChange={handleMediaUpload}
                    accept="image/*,video/*"
                    multiple
                    className="hidden"
                  />
                </label>
                {mediaFiles.length > 0 && (
                  <div className="grid grid-cols-4 gap-2 mt-2">
                    {mediaFiles.map((file, index) => (
                      <div key={index} className="relative group">
                        <div className="aspect-square bg-gray-100 rounded-lg flex items-center justify-center">
                          {file.type.startsWith('video') ? (
                            <Video className="h-8 w-8 text-gray-400" />
                          ) : (
                            <ImageIcon className="h-8 w-8 text-gray-400" />
                          )}
                        </div>
                        <button
                          onClick={() => removeMedia(index)}
                          className="absolute top-1 right-1 h-6 w-6 bg-red-500 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="h-4 w-4 text-white" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Schedule */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Schedule</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => setScheduleType('now')}
                className={`p-4 rounded-lg border-2 transition-all ${
                  scheduleType === 'now'
                    ? 'border-blue-600 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <Send className={`h-6 w-6 mx-auto mb-2 ${scheduleType === 'now' ? 'text-blue-600' : 'text-gray-400'}`} />
                <p className="font-semibold text-sm">Publish Now</p>
              </button>

              <button
                onClick={() => setScheduleType('schedule')}
                className={`p-4 rounded-lg border-2 transition-all ${
                  scheduleType === 'schedule'
                    ? 'border-purple-600 bg-purple-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <Clock className={`h-6 w-6 mx-auto mb-2 ${scheduleType === 'schedule' ? 'text-purple-600' : 'text-gray-400'}`} />
                <p className="font-semibold text-sm">Schedule for Later</p>
              </button>
            </div>

            {scheduleType === 'schedule' && (
              <div className="mt-4">
                <Label>Schedule Time</Label>
                <Input
                  type="datetime-local"
                  value={scheduledTime}
                  onChange={(e) => setScheduledTime(e.target.value)}
                  className="mt-1"
                />
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Preview - 4 columns */}
      <div className="col-span-4">
        <Card className="sticky top-4">
          <CardHeader>
            <CardTitle className="text-sm flex items-center gap-2">
              <Eye className="h-4 w-4" />
              Preview
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="border-2 border-gray-200 rounded-lg p-4 bg-white min-h-[300px]">
              {/* Profile Header */}
              <div className="flex items-center gap-3 mb-3 pb-3 border-b border-gray-200">
                <div className="h-10 w-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full" />
                <div>
                  <p className="font-semibold text-sm">Your Practice</p>
                  <p className="text-xs text-gray-500">Just now</p>
                </div>
              </div>

              {/* Content */}
              <div className="prose prose-sm max-w-none">
                {content || <p className="text-gray-400 italic">Your post content will appear here...</p>}
                {hashtags.length > 0 && (
                  <p className="text-blue-600 mt-2">
                    {hashtags.map(tag => `#${tag}`).join(' ')}
                  </p>
                )}
                {linkUrl && (
                  <div className="mt-3 p-2 border border-gray-200 rounded-lg bg-gray-50">
                    <p className="text-xs text-blue-600 truncate">{linkUrl}</p>
                  </div>
                )}
              </div>

              {/* Media Preview */}
              {mediaFiles.length > 0 && (
                <div className="mt-3 grid grid-cols-2 gap-2">
                  {mediaFiles.slice(0, 4).map((file, index) => (
                    <div key={index} className="aspect-square bg-gray-100 rounded-lg" />
                  ))}
                </div>
              )}
            </div>

            {/* Stats Estimate */}
            <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-xs font-semibold text-blue-900 mb-2 flex items-center gap-1">
                <Sparkles className="h-3 w-3" />
                Estimated Performance
              </p>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <p className="text-gray-600">Reach</p>
                  <p className="font-semibold text-gray-900">~1,200</p>
                </div>
                <div>
                  <p className="text-gray-600">Engagement</p>
                  <p className="font-semibold text-gray-900">~80-120</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <div className="space-y-2 mt-4">
          <Button
            onClick={handlePublish}
            disabled={loading || !content.trim() || selectedPlatforms.length === 0}
            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
          >
            {loading ? (
              'Publishing...'
            ) : scheduleType === 'now' ? (
              <>
                <Send className="h-4 w-4 mr-2" />
                Publish Now
              </>
            ) : (
              <>
                <Calendar className="h-4 w-4 mr-2" />
                Schedule Post
              </>
            )}
          </Button>
          {onCancel && (
            <Button variant="outline" onClick={onCancel} className="w-full">
              Cancel
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}



