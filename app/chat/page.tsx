"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { ConversationList } from "@/components/chat/conversation-list";
import { ChatInterface } from "@/components/chat/chat-interface";
import { StartConversationModal } from "@/components/chat/start-conversation-modal";
import type { Conversation } from "@/lib/types";

export default function ChatPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialStudentId = searchParams.get("student") || undefined;
  const initialTopicId = searchParams.get("topic") || undefined;

  const [conversations, setConversations] = React.useState<Conversation[]>([]);
  const [isLoadingConversations, setIsLoadingConversations] =
    React.useState(true);
  const [isModalOpen, setIsModalOpen] = React.useState(false);

  // Open modal if coming from student page with pre-selected student/topic
  React.useEffect(() => {
    if (initialStudentId && initialTopicId) {
      setIsModalOpen(true);
      // Clear the URL params
      router.replace("/chat");
    }
  }, [initialStudentId, initialTopicId, router]);

  // Fetch conversations
  React.useEffect(() => {
    async function fetchConversations() {
      try {
        const response = await fetch("/api/chat/conversations");
        if (!response.ok) throw new Error("Failed to fetch conversations");
        const data = await response.json();
        setConversations(data);
      } catch (error) {
        console.error("Error fetching conversations:", error);
        toast.error("Failed to load conversations");
      } finally {
        setIsLoadingConversations(false);
      }
    }

    fetchConversations();
  }, []);

  const handleConversationStarted = (conversationId: string) => {
    // Refresh conversations and navigate to the new one
    fetch("/api/chat/conversations")
      .then((res) => res.json())
      .then(setConversations)
      .catch(console.error);
    router.push(`/chat/${conversationId}`);
  };

  return (
    <div className="flex h-full flex-col">
      <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="mr-2 h-4" />
        <h1 className="text-lg font-semibold">Conversations</h1>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <div className="w-80 shrink-0 border-r">
          <ConversationList
            conversations={conversations}
            isLoading={isLoadingConversations}
            onNewConversation={() => setIsModalOpen(true)}
          />
        </div>

        <div className="flex-1">
          <ChatInterface
            conversation={null}
            messages={[]}
            isLoading={false}
            isSending={false}
            onSendMessage={() => {}}
          />
        </div>
      </div>

      <StartConversationModal
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        onConversationStarted={handleConversationStarted}
        initialStudentId={initialStudentId}
        initialTopicId={initialTopicId}
      />
    </div>
  );
}
