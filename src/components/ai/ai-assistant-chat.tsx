'use client'

import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { 
  Bot, 
  Send, 
  Sparkles,
  Mail,
  CheckSquare,
  Loader2,
  User,
  ChevronRight
} from 'lucide-react'
import { toast } from 'sonner'

interface Message {
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: Date
  actions?: QuickAction[]
}

interface QuickAction {
  type: 'draft_email' | 'create_task' | 'summarize' | 'schedule'
  label: string
  icon: React.ReactNode
}

interface AIAssistantChatProps {
  context: 'deal' | 'contact' | 'global'
  contextId?: string
  onMinimize?: () => void
  onClose?: () => void
}

export function AIAssistantChat({ 
  context, 
  contextId, 
  onMinimize, 
  onClose 
}: AIAssistantChatProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (messages.length === 0) {
      setMessages([getWelcomeMessage()])
    }
  }, [])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const getWelcomeMessage = (): Message => {
    let content = ''
    const actions: QuickAction[] = []

    switch (context) {
      case 'deal':
        content = "I've analyzed all conversations for this deal. How can I help?"
        actions.push(
          { type: 'summarize', label: 'Deal Summary', icon: <Sparkles className="h-3 w-3" /> },
          { type: 'draft_email', label: 'Draft Email', icon: <Mail className="h-3 w-3" /> },
          { type: 'create_task', label: 'Next Steps', icon: <CheckSquare className="h-3 w-3" /> }
        )
        break
      case 'contact':
        content = "I know this patient's complete history. What would you like to know?"
        actions.push(
          { type: 'summarize', label: 'Patient History', icon: <Sparkles className="h-3 w-3" /> }
        )
        break
      case 'global':
        content = "I can help you with any deal, contact, or task. What do you need?"
        actions.push(
          { type: 'summarize', label: 'Daily Briefing', icon: <Sparkles className="h-3 w-3" /> }
        )
        break
    }

    return { role: 'assistant', content, timestamp: new Date(), actions }
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

      setMessages(prev => [...prev, {
        role: 'assistant',
        content: data.response,
        timestamp: new Date(),
        actions: data.suggestedActions || []
      }])
    } catch (error) {
      console.error('AI error:', error)
      toast.error('AI is temporarily unavailable')
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
      const response = await fetch('/api/ai-assistant/action', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: action.type,
          context,
          contextId
        })
      })

      if (!response.ok) throw new Error('Action failed')

      const data = await response.json()

      setMessages(prev => [...prev, 
        {
          role: 'user',
          content: `[${action.label}]`,
          timestamp: new Date()
        },
        {
          role: 'assistant',
          content: data.response,
          timestamp: new Date(),
          actions: data.nextActions
        }
      ])
    } catch (error) {
      console.error('Action error:', error)
      toast.error('Failed to execute action')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="h-full flex flex-col bg-gradient-to-b from-slate-50 to-white">
      {/* Elegant Header */}
      <div className="px-4 py-4 border-b border-gray-200 bg-white">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-md">
            <Bot className="h-6 w-6 text-white" />
          </div>
          <div className="flex-1">
            <h3 className="text-sm font-semibold text-gray-900">AI Assistant</h3>
            <p className="text-xs text-gray-500">Powered by GPT-4 Turbo</p>
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <ScrollArea className="flex-1 px-4">
        <div className="py-4 space-y-4">
          {messages.map((message, index) => (
            <div
              key={index}
              className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {message.role === 'assistant' && (
                <div className="flex-shrink-0 h-8 w-8 rounded-lg bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center">
                  <Bot className="h-4 w-4 text-blue-600" />
                </div>
              )}
              
              <div className={`flex flex-col max-w-[85%] ${message.role === 'user' ? 'items-end' : 'items-start'}`}>
                <div
                  className={`rounded-2xl px-4 py-3 ${
                    message.role === 'user'
                      ? 'bg-gradient-to-r from-blue-600 to-blue-500 text-white shadow-md'
                      : message.role === 'system'
                      ? 'bg-yellow-50 text-yellow-900 border border-yellow-200'
                      : 'bg-white border border-gray-200 text-gray-900 shadow-sm'
                  }`}
                >
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">{message.content}</p>
                </div>
                
                {/* Quick Action Buttons */}
                {message.actions && message.actions.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {message.actions.map((action, i) => (
                      <button
                        key={i}
                        onClick={() => handleQuickAction(action)}
                        disabled={loading}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors border border-blue-200 disabled:opacity-50"
                      >
                        {action.icon}
                        {action.label}
                      </button>
                    ))}
                  </div>
                )}
                
                <span className="text-xs text-gray-400 mt-1">
                  {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>

              {message.role === 'user' && (
                <div className="flex-shrink-0 h-8 w-8 rounded-lg bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                  <User className="h-4 w-4 text-gray-600" />
                </div>
              )}
            </div>
          ))}

          {loading && (
            <div className="flex gap-3">
              <div className="flex-shrink-0 h-8 w-8 rounded-lg bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center">
                <Bot className="h-4 w-4 text-blue-600" />
              </div>
              <div className="bg-white border border-gray-200 rounded-2xl px-4 py-3 shadow-sm">
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                  <span className="text-sm text-gray-600">Thinking...</span>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* Input Area - Clean & Modern */}
      <div className="p-4 border-t border-gray-200 bg-white">
        <div className="relative">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                handleSendMessage()
              }
            }}
            placeholder="Ask me anything..."
            disabled={loading}
            className="pr-12 h-11 bg-gray-50 border-gray-200 focus:bg-white transition-colors"
          />
          <Button
            onClick={handleSendMessage}
            disabled={loading || !input.trim()}
            size="sm"
            className="absolute right-1.5 top-1.5 h-8 w-8 p-0 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 shadow-sm"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
        <p className="text-xs text-gray-400 mt-2 text-center">
          Press Enter to send • GPT-4 Turbo
        </p>
      </div>
    </div>
  )
}

