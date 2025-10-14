'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase-client'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { MessageSquare, Send, Check, X } from 'lucide-react'
import { toast } from 'sonner'
import { formatDistanceToNow } from 'date-fns'
import type { MarketingComment } from '@/types/marketing'

interface CampaignCommentsProps {
  entityType: 'campaign' | 'journey' | 'template'
  entityId: string
  tenantId?: string
}

export function CampaignComments({ 
  entityType, 
  entityId,
  tenantId = '550e8400-e29b-41d4-a716-446655440000'
}: CampaignCommentsProps) {
  const [comments, setComments] = useState<MarketingComment[]>([])
  const [newComment, setNewComment] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    fetchComments()
  }, [entityId])

  const fetchComments = async () => {
    try {
      const { data, error } = await supabase
        .from('marketing_comments')
        .select('*')
        .eq('entity_type', entityType)
        .eq('entity_id', entityId)
        .order('created_at', { ascending: true })

      if (error) throw error
      setComments(data || [])
    } catch (error) {
      console.error('[COMMENTS] Error fetching:', error)
    }
  }

  const handleSubmit = async () => {
    if (!newComment.trim()) return

    try {
      setSubmitting(true)
      const { error } = await supabase
        .from('marketing_comments')
        .insert({
          tenant_id: tenantId,
          entity_type: entityType,
          entity_id: entityId,
          comment: newComment,
          user_id: tenantId, // Placeholder
          mentions: [],
          is_reply: false,
        })

      if (error) throw error

      setNewComment('')
      fetchComments()
      toast.success('Comment added')
    } catch (error) {
      toast.error('Failed to add comment')
    } finally {
      setSubmitting(false)
    }
  }

  const resolveComment = async (commentId: string) => {
    try {
      const { error } = await supabase
        .from('marketing_comments')
        .update({ 
          is_resolved: true,
          resolved_by_user_id: tenantId,
          resolved_at: new Date().toISOString()
        })
        .eq('id', commentId)

      if (error) throw error
      fetchComments()
      toast.success('Comment resolved')
    } catch (error) {
      toast.error('Failed to resolve comment')
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <MessageSquare className="h-4 w-4" />
          Comments & Feedback
          <Badge variant="secondary">{comments.length}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Add Comment */}
        <div className="space-y-2">
          <Textarea
            placeholder="Add a comment or feedback..."
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            rows={3}
            className="resize-none"
          />
          <div className="flex justify-end">
            <Button 
              size="sm" 
              onClick={handleSubmit}
              disabled={!newComment.trim() || submitting}
            >
              <Send className="h-3.5 w-3.5 mr-2" />
              Post Comment
            </Button>
          </div>
        </div>

        {/* Comments List */}
        {comments.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <MessageSquare className="h-10 w-10 mx-auto mb-2 text-gray-300" />
            <p className="text-sm">No comments yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {comments.map(comment => (
              <div key={comment.id} className={`p-3 rounded-lg border ${comment.is_resolved ? 'bg-green-50 border-green-200' : 'bg-gray-50'}`}>
                <div className="flex items-start gap-3">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-blue-600 text-white text-xs">
                      DU
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-sm font-medium">Demo User</p>
                      <span className="text-xs text-gray-500">
                        {formatDistanceToNow(new Date(comment.created_at), { addSuffix: true })}
                      </span>
                    </div>
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">{comment.comment}</p>
                    
                    {!comment.is_resolved && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => resolveComment(comment.id)}
                        className="mt-2 h-6 text-xs"
                      >
                        <Check className="h-3 w-3 mr-1" />
                        Mark Resolved
                      </Button>
                    )}
                    {comment.is_resolved && (
                      <Badge variant="outline" className="mt-2 text-xs bg-green-100 text-green-700">
                        Resolved
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}




