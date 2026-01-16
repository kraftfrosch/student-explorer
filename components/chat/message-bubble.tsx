"use client"

import { cn } from "@/lib/utils"
import type { Message } from "@/lib/types"
import { GraduationCap, User } from "lucide-react"

interface MessageBubbleProps {
  message: Message
}

export function MessageBubble({ message }: MessageBubbleProps) {
  const isTutor = message.role === "tutor"

  return (
    <div
      className={cn(
        "flex gap-3",
        isTutor ? "flex-row-reverse" : "flex-row"
      )}
    >
      <div
        className={cn(
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-full",
          isTutor
            ? "bg-primary text-primary-foreground"
            : "bg-muted text-muted-foreground"
        )}
      >
        {isTutor ? (
          <User className="h-4 w-4" />
        ) : (
          <GraduationCap className="h-4 w-4" />
        )}
      </div>

      <div
        className={cn(
          "flex max-w-[75%] flex-col gap-1",
          isTutor ? "items-end" : "items-start"
        )}
      >
        <span className="text-xs text-muted-foreground">
          {isTutor ? "You (Tutor)" : "Student"}
        </span>
        <div
          className={cn(
            "rounded-2xl px-4 py-2",
            isTutor
              ? "rounded-tr-sm bg-primary text-primary-foreground"
              : "rounded-tl-sm bg-muted"
          )}
        >
          <p className="whitespace-pre-wrap text-sm">{message.content}</p>
        </div>
        <span className="text-xs text-muted-foreground">
          {new Date(message.created_at).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </span>
      </div>
    </div>
  )
}
