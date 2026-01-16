"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { MessageSquare, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { Conversation } from "@/lib/types";

interface ConversationListProps {
  conversations: Conversation[];
  isLoading: boolean;
  onNewConversation: () => void;
}

export function ConversationList({
  conversations,
  isLoading,
  onNewConversation,
}: ConversationListProps) {
  const pathname = usePathname();
  const currentConversationId = pathname.split("/").pop();

  // Group conversations by status
  const openConversations = conversations.filter((c) => c.status === "open");
  const closedConversations = conversations.filter(
    (c) => c.status === "closed"
  );

  return (
    <div className="flex h-full flex-col">
      <div className="border-b p-4">
        <Button onClick={onNewConversation} className="w-full">
          <Plus className="mr-2 h-4 w-4" />
          New Conversation
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-2">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          ) : conversations.length === 0 ? (
            <div className="py-8 text-center">
              <MessageSquare className="mx-auto h-8 w-8 text-muted-foreground" />
              <p className="mt-2 text-sm text-muted-foreground">
                No conversations yet
              </p>
            </div>
          ) : (
            <>
              {openConversations.length > 0 && (
                <div className="mb-4">
                  <h3 className="mb-2 px-2 text-xs font-semibold uppercase text-muted-foreground">
                    Open ({openConversations.length})
                  </h3>
                  <div className="space-y-1">
                    {openConversations.map((conversation) => (
                      <ConversationItem
                        key={conversation.id}
                        conversation={conversation}
                        isActive={currentConversationId === conversation.id}
                      />
                    ))}
                  </div>
                </div>
              )}

              {closedConversations.length > 0 && (
                <div>
                  <h3 className="mb-2 px-2 text-xs font-semibold uppercase text-muted-foreground">
                    Closed ({closedConversations.length})
                  </h3>
                  <div className="space-y-1">
                    {closedConversations.map((conversation) => (
                      <ConversationItem
                        key={conversation.id}
                        conversation={conversation}
                        isActive={currentConversationId === conversation.id}
                      />
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}

function ConversationItem({
  conversation,
  isActive,
}: {
  conversation: Conversation;
  isActive: boolean;
}) {
  return (
    <Link
      href={`/chat/${conversation.id}`}
      className={cn(
        "flex flex-col gap-1 rounded-lg p-3 transition-colors hover:bg-accent",
        isActive && "bg-accent"
      )}
    >
      <div className="flex items-center justify-between">
        <span className="font-medium">{conversation.student_name}</span>
        <Badge
          variant={conversation.status === "open" ? "default" : "secondary"}
          className="text-xs"
        >
          {conversation.messages_remaining} left
        </Badge>
      </div>
      <span className="text-sm text-muted-foreground">
        {conversation.topic_name}
      </span>
      <span className="text-xs text-muted-foreground">
        {conversation.subject_name}
      </span>
    </Link>
  );
}
