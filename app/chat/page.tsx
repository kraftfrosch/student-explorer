"use client";

import * as React from "react";
import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { AppHeader } from "@/components/app-header";
import { ConversationList } from "@/components/chat/conversation-list";
import { ChatInterface } from "@/components/chat/chat-interface";
import { StartConversationModal } from "@/components/chat/start-conversation-modal";
import type { Conversation, Batch } from "@/lib/types";

function ChatPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialStudentId = searchParams.get("student") || undefined;
  const initialTopicId = searchParams.get("topic") || undefined;

  const [conversations, setConversations] = React.useState<Conversation[]>([]);
  const [batches, setBatches] = React.useState<Batch[]>([]);
  const [isLoadingConversations, setIsLoadingConversations] =
    React.useState(true);
  const [isModalOpen, setIsModalOpen] = React.useState(false);

  // Open modal if coming from student page with pre-selected student/topic
  React.useEffect(() => {
    if (initialStudentId && initialTopicId) {
      setIsModalOpen(true);
      router.replace("/chat");
    }
  }, [initialStudentId, initialTopicId, router]);

  // Fetch all data
  const fetchData = React.useCallback(async (showLoading = true) => {
    try {
      const [convRes, batchRes] = await Promise.all([
        fetch("/api/chat/conversations"),
        fetch("/api/chat/batch"),
      ]);

      if (!convRes.ok) throw new Error("Failed to fetch conversations");
      const convData = await convRes.json();
      setConversations(convData);

      if (batchRes.ok) {
        const batchData = await batchRes.json();
        setBatches(batchData);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
      if (showLoading) toast.error("Failed to load conversations");
    } finally {
      if (showLoading) setIsLoadingConversations(false);
    }
  }, []);

  React.useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Poll for updates while any conversation is running or batch is running
  const anyBatchRunning = batches.some((b) => b.status === "running");
  const anyConversationRunning = conversations.some((c) => c.is_running);
  const shouldPoll = anyBatchRunning || anyConversationRunning;

  React.useEffect(() => {
    if (!shouldPoll) return;

    const pollInterval = setInterval(() => {
      fetchData(false);
    }, 2000);

    return () => clearInterval(pollInterval);
  }, [shouldPoll, fetchData]);

  const handleConversationStarted = (conversationId: string) => {
    fetchData(false);
    router.push(`/chat/${conversationId}`);
  };

  const handleBatchStarted = () => {
    fetchData(false);
  };

  return (
    <div className="flex h-full flex-col">
      <AppHeader title="Conversations" />

      <div className="flex flex-1 overflow-hidden">
        <div className="w-80 shrink-0 border-r">
          <ConversationList
            conversations={conversations}
            batches={batches}
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
        onBatchStarted={handleBatchStarted}
        initialStudentId={initialStudentId}
        initialTopicId={initialTopicId}
      />
    </div>
  );
}

export default function ChatPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-full flex-col">
          <AppHeader title="Conversations" />
          <div className="flex flex-1 items-center justify-center">
            <div className="text-muted-foreground">Loading...</div>
          </div>
        </div>
      }
    >
      <ChatPageContent />
    </Suspense>
  );
}
