'use client'

import { useState, useEffect, useRef } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { 
  Bot, 
  Send, 
  Minimize2, 
  Maximize2, 
  X, 
  Sparkles,
  Mail,
  CheckSquare,
  Calendar,
  TrendingUp,
  Loader2
} from 'lucide-react'
import { toast } from 'sonner'

interface Message {
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: Date
  actions?: QuickAction[]
}

interface QuickAction {
  type: 'draft_email' | 'create_task' | 'summarize' | 'schedule' | 'view_deal'
  label: string
  icon: React.ReactNode
  data?: any
}

interface AIAssistantChatProps {
  context: 'deal' | 'contact' | 'global'
  contextId?: string // dealId or contactId
  onMinimize?: () => void
  onClose?: () => void
  initialMessage?: string
}

export function AIAssistantChat({ 
  context, 
  contextId, 
  onMinimize, 
  onClose,
  initialMessage 
}: AIAssistantChatProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [isMinimized, setIsMinimized] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Show welcome message on mount
    if (messages.length === 0) {
      const welcomeMessage = getWelcomeMessage()
      setMessages([welcomeMessage])
    }
  }, [])

  useEffect(() => {
    // Auto-scroll to bottom on new messages
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const getWelcomeMessage = (): Message => {
    let content = ''
    const actions: QuickAction[] = []

    switch (context) {
      case 'deal':
        content = "👋 Hi! I'm your AI Deal Assistant. I've analyzed all conversations for this deal. Ask me anything!"
        actions.push(
          { type: 'summarize', label: 'Summarize Deal', icon: <Sparkles className="h-3 w-3" /> },
          { type: 'draft_email', label: 'Draft Follow-up', icon: <Mail className="h-3 w-3" /> },
          { type: 'create_task', label: 'Suggest Tasks', icon: <CheckSquare className="h-3 w-3" /> }
        )
        break
      case 'contact':
        content = "👋 Hi! I'm your AI Contact Assistant. I know this patient's entire history. How can I help?"
        actions.push(
          { type: 'summarize', label: 'Patient Summary', icon: <Sparkles className="h-3 w-3" /> },
          { type: 'view_deal', label: 'Show All Deals', icon: <TrendingUp className="h-3 w-3" /> }
        )
        break
      case 'global':
        content = "👋 Hi! I'm your AI Practice Assistant. Ask me about any deal, contact, or task across your practice!"
        actions.push(
          { type: 'summarize', label: 'Daily Briefing', icon: <Sparkles className="h-3 w-3" /> },
          { type: 'create_task', label: 'Priority Deals', icon: <TrendingUp className="h-3 w-3" /> }
        )
        break
    }

    return {
      role: 'assistant',
      content,
      timestamp: new Date(),
      actions
    }
  }

  const handleSendMessage = async () => {
    if (!input.trim() || loading) return

    const userMessage: Message = {
      role: 'user',
      content: input.trim(),
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])
    setInput('')
    setLoading(true)

    try {
      // Call AI API
      const response = await fetch('/api/ai-assistant/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          context,
          contextId,
          messages: [...messages, userMessage],
          question: input.trim()
        })
      })

      if (!response.ok) throw new Error('AI request failed')

      const data = await response.json()

      const aiMessage: Message = {
        role: 'assistant',
        content: data.response,
        timestamp: new Date(),
        actions: data.suggestedActions || []
      }

      setMessages(prev => [...prev, aiMessage])
    } catch (error) {
      console.error('AI error:', error)
      toast.error('Failed to get AI response')
      
      // Add error message
      setMessages(prev => [...prev, {
        role: 'system',
        content: 'Sorry, I encountered an error. Please try again.',
        timestamp: new Date()
      }])
    } finally {
      setLoading(false)
    }
  }

  const handleQuickAction = async (action: QuickAction) => {
    setLoading(true)
    
    try {
      // Execute quick action
      const response = await fetch('/api/ai-assistant/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: action.type,
          context,
          contextId,
          data: action.data
        })
      })

      if (!response.ok) throw new Error('Action failed')

      const data = await response.json()

      const aiMessage: Message = {
        role: 'assistant',
        content: data.response,
        timestamp: new Date(),
        actions: data.nextActions
      }

      setMessages(prev => [...prev, {
        role: 'user',
        content: `[Clicked: ${action.label}]`,
        timestamp: new Date()
      }, aiMessage])

    } catch (error) {
      console.error('Action error:', error)
      toast.error('Failed to execute action')
    } finally {
      setLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  if (isMinimized) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <Button
          onClick={() => setIsMinimized(false)}
          className="h-12 w-12 rounded-full shadow-lg bg-gradient-to-r from-blue-600 to-brand-navy-700 hover:from-blue-700 hover:to-brand-navy-800"
        >
          <Bot className="h-6 w-6" />
        </Button>
      </div>
    )
  }

  return (
    <Card className="h-full flex flex-col border-2 border-blue-100 bg-gradient-to-br from-blue-50 to-purple-50 shadow-lg">
      {/* Header */}
      <CardHeader className="pb-3 border-b bg-gradient-to-r from-blue-600 to-purple-600 text-white">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Bot className="h-5 w-5" />
            AI Assistant
          </CardTitle>
          <div className="flex items-center gap-1">
            {onMinimize && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setIsMinimized(true)
                  onMinimize()
                }}
                className="h-6 w-6 p-0 hover:bg-white/20 text-white"
              >
                <Minimize2 className="h-3 w-3" />
              </Button>
            )}
            {onClose && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="h-6 w-6 p-0 hover:bg-white/20 text-white"
              >
                <X className="h-3 w-3" />
              </Button>
            )}
          </div>
        </div>
        <p className="text-xs text-blue-100 mt-1">
          {context === 'deal' && 'Ask me about this deal'}
          {context === 'contact' && 'Ask me about this patient'}
          {context === 'global' && 'Ask me about your practice'}
        </p>
      </CardHeader>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          {messages.map((message, index) => (
            <div
              key={index}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[85%] rounded-lg p-3 ${
                  message.role === 'user'
                    ? 'bg-blue-600 text-white'
                    : message.role === 'system'
                    ? 'bg-yellow-100 text-yellow-900 border border-yellow-300'
                    : 'bg-white border border-gray-200 shadow-sm'
                }`}
              >
                <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                
                {/* Quick Actions */}
                {message.actions && message.actions.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-3">
                    {message.actions.map((action, i) => (
                      <Button
                        key={i}
                        variant="outline"
                        size="sm"
                        onClick={() => handleQuickAction(action)}
                        className="h-7 text-xs bg-white hover:bg-gray-50"
                        disabled={loading}
                      >
                        {action.icon}
                        <span className="ml-1">{action.label}</span>
                      </Button>
                    ))}
                  </div>
                )}
                
                <p className="text-xs opacity-70 mt-2">
                  {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex justify-start">
              <div className="bg-white border border-gray-200 rounded-lg p-3 shadow-sm">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>AI is thinking...</span>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* Input */}
      <div className="p-3 border-t bg-white">
        <div className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask me anything..."
            disabled={loading}
            className="flex-1"
          />
          <Button
            onClick={handleSendMessage}
            disabled={loading || !input.trim()}
            className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
        <p className="text-xs text-gray-500 mt-2">
          Powered by GPT-4 Turbo • Press Enter to send
        </p>
      </div>
    </Card>
  )
}

