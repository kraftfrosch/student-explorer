"use client"

import * as React from "react"
import { Send, Loader2, Bot } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { MessageBubble } from "./message-bubble"
import type { Conversation, Message } from "@/lib/types"

interface ChatInterfaceProps {
  conversation: Conversation | null
  messages: Message[]
  isLoading: boolean
  isSending: boolean
  onSendMessage: (content: string) => void
}

export function ChatInterface({
  conversation,
  messages,
  isLoading,
  isSending,
  onSendMessage,
}: ChatInterfaceProps) {
  const [input, setInput] = React.useState("")
  const scrollRef = React.useRef<HTMLDivElement>(null)

  // Scroll to bottom when new messages arrive
  React.useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isSending) return
    onSendMessage(input.trim())
    setInput("")
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e)
    }
  }

  if (!conversation) {
    return (
      <div className="flex h-full flex-col items-center justify-center text-center">
        <div className="max-w-sm">
          <h2 className="text-xl font-semibold">No conversation selected</h2>
          <p className="mt-2 text-muted-foreground">
            Select a conversation from the sidebar or start a new one.
          </p>
        </div>
      </div>
    )
  }

  const isRunning = conversation.is_running
  const isDisabled =
    conversation.status === "closed" || conversation.messages_remaining <= 0 || isRunning

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div>
          <h2 className="font-semibold">{conversation.student_name}</h2>
          <p className="text-sm text-muted-foreground">
            {conversation.topic_name} • {conversation.subject_name}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isRunning && (
            <Badge variant="default" className="bg-amber-500 hover:bg-amber-600 animate-pulse">
              <Loader2 className="mr-1 h-3 w-3 animate-spin" />
              AI Running
            </Badge>
          )}
          <Badge
            variant={conversation.status === "open" ? "default" : "secondary"}
          >
            {conversation.status === "open" ? "Active" : "Closed"}
          </Badge>
          <Badge variant="outline">
            {conversation.messages_remaining} messages left
          </Badge>
        </div>
      </div>

      {/* Messages */}
      <ScrollArea ref={scrollRef} className="flex-1 p-4">
        {isLoading ? (
          <div className="flex h-full items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <p className="text-muted-foreground">
              Start the conversation by sending a message.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((message) => (
              <MessageBubble key={message.id} message={message} />
            ))}
            {(isSending || isRunning) && (
              <div className="flex items-center justify-center gap-2 py-2">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                {isRunning && (
                  <span className="text-sm text-muted-foreground">
                    AI is tutoring...
                  </span>
                )}
              </div>
            )}
          </div>
        )}
      </ScrollArea>

      {/* Input */}
      <form onSubmit={handleSubmit} className="border-t p-4">
        {isRunning && (
          <div className="mb-2 flex items-center justify-center gap-2 rounded-lg bg-amber-500/10 p-2 text-sm text-amber-700">
            <Bot className="h-4 w-4" />
            AI is running this conversation automatically
          </div>
        )}
        {!isRunning && isDisabled && (
          <p className="mb-2 text-center text-sm text-muted-foreground">
            This conversation has ended.
          </p>
        )}
        <div className="flex gap-2">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              isDisabled
                ? "Conversation ended"
                : "Type your message... (Enter to send)"
            }
            disabled={isDisabled || isSending}
            className="min-h-[80px] resize-none"
          />
          <Button
            type="submit"
            size="icon"
            className="h-[80px] w-12"
            disabled={isDisabled || isSending || !input.trim()}
          >
            {isSending ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Send className="h-5 w-5" />
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}
