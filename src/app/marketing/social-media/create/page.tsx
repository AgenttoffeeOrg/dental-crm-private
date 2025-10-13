'use client'

import { useRouter } from 'next/navigation'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Sparkles } from 'lucide-react'
import { SocialMediaComposer } from '@/components/marketing/social-media-composer'
import Link from 'next/link'

export default function CreateSocialPostPage() {
  const router = useRouter()

  return (
    <DashboardLayout>
      <div className="h-full overflow-y-auto bg-gradient-to-br from-gray-50 to-pink-50/30">
        <div className="p-8 max-w-[1600px] mx-auto">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-4">
              <Link href="/marketing/social-media">
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back
                </Button>
              </Link>
              <div>
                <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
                  Create Social Media Post
                  <Sparkles className="h-6 w-6 text-purple-600" />
                </h1>
                <p className="text-gray-600 mt-1">Post to multiple platforms at once</p>
              </div>
            </div>
          </div>

          <SocialMediaComposer
            onComplete={(postId) => {
              router.push('/marketing/social-media')
            }}
            onCancel={() => router.push('/marketing/social-media')}
          />
        </div>
      </div>
    </DashboardLayout>
  )
}

