"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  MessageSquare,
  Plus,
  Bot,
  Loader2,
  Folder,
  FolderOpen,
  ChevronRight,
  ChevronDown,
  Copy,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { toast } from "sonner";
import type { Conversation, Batch, Message } from "@/lib/types";

interface ConversationListProps {
  conversations: Conversation[];
  batches: Batch[];
  isLoading: boolean;
  onNewConversation: () => void;
}

export function ConversationList({
  conversations,
  batches,
  isLoading,
  onNewConversation,
}: ConversationListProps) {
  const pathname = usePathname();
  const currentConversationId = pathname.split("/").pop();
  const [expandedBatches, setExpandedBatches] = React.useState<Set<string>>(
    new Set()
  );

  // Group conversations
  const batchConversations = new Map<string, Conversation[]>();
  const unbatchedConversations: Conversation[] = [];

  // Find which batch contains the current conversation and auto-expand it
  const currentConvBatchId = conversations.find(
    (c) => c.id === currentConversationId
  )?.batch_id;

  React.useEffect(() => {
    if (currentConvBatchId && !expandedBatches.has(currentConvBatchId)) {
      setExpandedBatches((prev) => new Set([...prev, currentConvBatchId]));
    }
  }, [currentConvBatchId]); // eslint-disable-line react-hooks/exhaustive-deps

  conversations.forEach((conv) => {
    if (conv.batch_id) {
      const existing = batchConversations.get(conv.batch_id) || [];
      batchConversations.set(conv.batch_id, [...existing, conv]);
    } else {
      unbatchedConversations.push(conv);
    }
  });

  const openUnbatched = unbatchedConversations.filter(
    (c) => c.status === "open"
  );
  const closedUnbatched = unbatchedConversations.filter(
    (c) => c.status === "closed"
  );

  const toggleBatch = (batchId: string) => {
    setExpandedBatches((prev) => {
      const next = new Set(prev);
      if (next.has(batchId)) {
        next.delete(batchId);
      } else {
        next.add(batchId);
      }
      return next;
    });
  };

  const copyBatchConversations = async (
    batch: Batch,
    batchConvs: Conversation[]
  ) => {
    const loadingToast = toast.loading("Preparing batch conversations...");
    try {
      // Fetch messages for all conversations in the batch
      const messagesPromises = batchConvs.map((conv) =>
        fetch(`/api/chat/conversations/${conv.id}/messages`)
          .then((res) => res.json())
          .then((messages: Message[]) => ({ conversation: conv, messages }))
          .catch((error) => {
            console.error(`Error fetching messages for ${conv.id}:`, error);
            return { conversation: conv, messages: [] as Message[] };
          })
      );

      const conversationsWithMessages = await Promise.all(messagesPromises);

      // Format the output
      let output = `Batch: ${batch.name}\n`;
      output += `Set Type: ${batch.set_type}\n`;
      output += `Status: ${batch.status}\n`;
      output += `Total Conversations: ${batch.total_conversations}\n`;
      output += `Completed: ${batch.completed_conversations}\n`;
      output += `${"=".repeat(80)}\n\n`;

      conversationsWithMessages.forEach(({ conversation, messages }, index) => {
        // Heading with person name and subject
        output += `${"=".repeat(80)}\n`;
        output += `Conversation ${index + 1}: ${conversation.student_name} - ${conversation.subject_name}\n`;
        output += `Topic: ${conversation.topic_name}\n`;
        output += `${"-".repeat(80)}\n\n`;

        // Sort messages by created_at to ensure chronological order
        const sortedMessages = [...messages].sort(
          (a, b) =>
            new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        );

        // Format messages
        sortedMessages.forEach((message) => {
          const role = message.role === "tutor" ? "Tutor" : "Student";
          output += `[${role}]: ${message.content}\n\n`;
        });

        output += `\n${"=".repeat(80)}\n\n`;
      });

      // Copy to clipboard using a reliable method that works after async operations
      const copyToClipboard = async (text: string): Promise<void> => {
        // Try modern clipboard API first
        try {
          if (navigator.clipboard && window.isSecureContext) {
            await navigator.clipboard.writeText(text);
            return;
          }
        } catch {
          // Fall through to fallback method
        }

        // Fallback: Use textarea method which works reliably even after async operations
        return new Promise((resolve, reject) => {
          const textarea = document.createElement("textarea");
          textarea.value = text;
          textarea.readOnly = true;
          textarea.contentEditable = "true";
          textarea.style.position = "fixed";
          textarea.style.left = "0";
          textarea.style.top = "0";
          textarea.style.width = "1px";
          textarea.style.height = "1px";
          textarea.style.padding = "0";
          textarea.style.border = "none";
          textarea.style.outline = "none";
          textarea.style.boxShadow = "none";
          textarea.style.background = "transparent";
          textarea.style.opacity = "0";
          textarea.style.zIndex = "-1";
          textarea.setAttribute("aria-hidden", "true");
          document.body.appendChild(textarea);
          
          // Try multiple selection methods for better compatibility
          const selectText = () => {
            if (document.activeElement !== textarea) {
              textarea.focus();
            }
            
            // Try setSelectionRange first
            if (textarea.setSelectionRange) {
              textarea.setSelectionRange(0, text.length);
            } else {
              // Fallback for older browsers
              const range = document.createRange();
              range.selectNodeContents(textarea);
              const selection = window.getSelection();
              selection?.removeAllRanges();
              selection?.addRange(range);
            }
          };
          
          // Use setTimeout to ensure DOM is ready
          setTimeout(() => {
            try {
              selectText();
              
              // Try execCommand
              let successful = false;
              if (document.execCommand) {
                successful = document.execCommand("copy");
              }
              
              // Clean up
              document.body.removeChild(textarea);
              
              // Clear any selection
              window.getSelection()?.removeAllRanges();
              
              if (successful) {
                resolve();
              } else {
                // If execCommand failed, try clipboard API one more time
                if (navigator.clipboard) {
                  navigator.clipboard.writeText(text).then(resolve).catch(reject);
                } else {
                  reject(new Error("Copy command not supported"));
                }
              }
            } catch (err) {
              document.body.removeChild(textarea);
              window.getSelection()?.removeAllRanges();
              reject(err);
            }
          }, 0);
        });
      };

      toast.dismiss(loadingToast);
      await copyToClipboard(output);
      toast.success("Batch conversations copied to clipboard!");
    } catch (error) {
      toast.dismiss(loadingToast);
      console.error("Error copying batch conversations:", error);
      toast.error(
        "Failed to copy batch conversations. Please try selecting and copying manually."
      );
    }
  };

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
              {/* Batches */}
              {batches.length > 0 && (
                <div className="mb-4">
                  <h3 className="mb-2 px-2 text-xs font-semibold uppercase text-muted-foreground">
                    Batches ({batches.length})
                  </h3>
                  <div className="space-y-1">
                    {batches.map((batch) => {
                      const batchConvs = batchConversations.get(batch.id) || [];
                      const isExpanded = expandedBatches.has(batch.id);
                      const runningCount = batchConvs.filter(
                        (c) => c.is_running
                      ).length;

                      return (
                        <Collapsible key={batch.id} open={isExpanded}>
                          <div className="flex items-center gap-1">
                            <CollapsibleTrigger asChild>
                              <button
                                onClick={() => toggleBatch(batch.id)}
                                className="flex flex-1 items-center gap-2 rounded-lg p-2 text-left transition-colors hover:bg-accent"
                              >
                                {isExpanded ? (
                                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                                ) : (
                                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                                )}
                                {isExpanded ? (
                                  <FolderOpen className="h-4 w-4 text-purple-500" />
                                ) : (
                                  <Folder className="h-4 w-4 text-purple-500" />
                                )}
                                <span className="flex-1 truncate font-medium text-sm">
                                  {batch.name}
                                </span>
                                <div className="flex items-center gap-1">
                                  {batch.status === "running" && (
                                    <Badge
                                      variant="default"
                                      className="text-[10px] px-1.5 py-0 bg-amber-500"
                                    >
                                      <Loader2 className="mr-1 h-2.5 w-2.5 animate-spin" />
                                      {runningCount}/{batch.total_conversations}
                                    </Badge>
                                  )}
                                  {batch.status === "completed" && (
                                    <Badge
                                      variant="secondary"
                                      className="text-[10px] px-1.5 py-0"
                                    >
                                      {batch.completed_conversations}/
                                      {batch.total_conversations}
                                    </Badge>
                                  )}
                                </div>
                              </button>
                            </CollapsibleTrigger>
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                copyBatchConversations(batch, batchConvs);
                              }}
                              className="h-8 w-8 shrink-0"
                              title="Copy batch conversations"
                            >
                              <Copy className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                          <CollapsibleContent>
                            <div className="ml-6 space-y-1 border-l pl-2">
                              {batchConvs.map((conversation) => (
                                <ConversationItem
                                  key={conversation.id}
                                  conversation={conversation}
                                  isActive={
                                    currentConversationId === conversation.id
                                  }
                                  compact
                                />
                              ))}
                            </div>
                          </CollapsibleContent>
                        </Collapsible>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Unbatched Open */}
              {openUnbatched.length > 0 && (
                <div className="mb-4">
                  <h3 className="mb-2 px-2 text-xs font-semibold uppercase text-muted-foreground">
                    Open ({openUnbatched.length})
                  </h3>
                  <div className="space-y-1">
                    {openUnbatched.map((conversation) => (
                      <ConversationItem
                        key={conversation.id}
                        conversation={conversation}
                        isActive={currentConversationId === conversation.id}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Unbatched Closed */}
              {closedUnbatched.length > 0 && (
                <div>
                  <h3 className="mb-2 px-2 text-xs font-semibold uppercase text-muted-foreground">
                    Closed ({closedUnbatched.length})
                  </h3>
                  <div className="space-y-1">
                    {closedUnbatched.map((conversation) => (
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

const setTypeLabels: Record<string, string> = {
  mini_dev: "Mini",
  dev: "Dev",
  eval: "Eval",
};

function ConversationItem({
  conversation,
  isActive,
  compact = false,
}: {
  conversation: Conversation;
  isActive: boolean;
  compact?: boolean;
}) {
  return (
    <Link
      href={`/chat/${conversation.id}`}
      className={cn(
        "flex flex-col gap-1 rounded-lg transition-colors hover:bg-accent",
        isActive && "bg-accent",
        compact ? "p-2" : "p-3"
      )}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          {conversation.is_auto &&
            (conversation.is_running ? (
              <Loader2 className="h-3.5 w-3.5 text-amber-600 animate-spin" />
            ) : (
              <Bot className="h-3.5 w-3.5 text-amber-600" />
            ))}
          <span className={cn("font-medium", compact && "text-sm")}>
            {conversation.student_name}
          </span>
        </div>
        <Badge
          variant={conversation.status === "open" ? "default" : "secondary"}
          className="text-xs"
        >
          {conversation.is_running
            ? "Running..."
            : `${conversation.messages_remaining} left`}
        </Badge>
      </div>
      <span
        className={cn("text-muted-foreground", compact ? "text-xs" : "text-sm")}
      >
        {conversation.topic_name}
      </span>
      {!compact && (
        <div className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">
            {conversation.subject_name}
          </span>
          <div className="flex items-center gap-1">
            {conversation.is_auto && (
              <Badge
                variant="outline"
                className="text-[10px] px-1.5 py-0 border-amber-500/50 text-amber-600"
              >
                Auto
              </Badge>
            )}
            <Badge variant="outline" className="text-[10px] px-1.5 py-0">
              {setTypeLabels[conversation.set_type] || conversation.set_type}
            </Badge>
          </div>
        </div>
      )}
    </Link>
  );
}
