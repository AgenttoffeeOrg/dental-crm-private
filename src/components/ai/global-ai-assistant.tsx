'use client'

import { useState } from 'react'
import { Bot, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { AIAssistantChat } from './ai-assistant-chat'

export function GlobalAIAssistant() {
  const [isOpen, setIsOpen] = useState(false)

  if (!isOpen) {
    return (
      <div className="fixed bottom-6 right-6 z-40">
        <Button
          onClick={() => setIsOpen(true)}
          className="h-14 w-14 rounded-full shadow-2xl bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 hover:scale-110 transition-transform"
          title="Open AI Assistant"
        >
          <Bot className="h-7 w-7" />
        </Button>
      </div>
    )
  }

  return (
    <div className="fixed bottom-6 right-6 z-40 w-[480px] h-[600px] shadow-2xl rounded-lg overflow-hidden">
      <AIAssistantChat
        context="global"
        onClose={() => setIsOpen(false)}
        onMinimize={() => setIsOpen(false)}
      />
    </div>
  )
}

