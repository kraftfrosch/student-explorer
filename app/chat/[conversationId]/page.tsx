"use client";

import * as React from "react";
import { useRouter, useParams } from "next/navigation";
import { toast } from "sonner";
import { AppHeader } from "@/components/app-header";
import { ConversationList } from "@/components/chat/conversation-list";
import { ChatInterface } from "@/components/chat/chat-interface";
import { StartConversationModal } from "@/components/chat/start-conversation-modal";
import type { Conversation, Message, Batch } from "@/lib/types";

export default function ConversationPage() {
  const router = useRouter();
  const params = useParams();
  const conversationId = params.conversationId as string;

  const [conversations, setConversations] = React.useState<Conversation[]>([]);
  const [batches, setBatches] = React.useState<Batch[]>([]);
  const [currentConversation, setCurrentConversation] = React.useState<Conversation | null>(null);
  const [messages, setMessages] = React.useState<Message[]>([]);
  const [isLoadingConversations, setIsLoadingConversations] = React.useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = React.useState(true);
  const [isSending, setIsSending] = React.useState(false);
  const [isModalOpen, setIsModalOpen] = React.useState(false);

  // Fetch all conversations and batches
  const fetchListData = React.useCallback(async (showLoading = true) => {
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
    fetchListData();
  }, [fetchListData]);

  // Fetch current conversation and messages
  const fetchConversationData = React.useCallback(
    async (showLoading = true) => {
      if (!conversationId) return;

      if (showLoading) setIsLoadingMessages(true);
      try {
        const [convRes, msgRes] = await Promise.all([
          fetch(`/api/chat/conversations/${conversationId}`),
          fetch(`/api/chat/conversations/${conversationId}/messages`),
        ]);

        if (!convRes.ok) throw new Error("Failed to fetch conversation");
        const conversation = await convRes.json();
        setCurrentConversation(conversation);

        if (!msgRes.ok) throw new Error("Failed to fetch messages");
        const newMessages = await msgRes.json();
        setMessages(newMessages);

        return conversation;
      } catch (error) {
        console.error("Error fetching conversation data:", error);
        if (showLoading) {
          toast.error("Failed to load conversation");
          router.push("/chat");
        }
      } finally {
        if (showLoading) setIsLoadingMessages(false);
      }
    },
    [conversationId, router]
  );

  React.useEffect(() => {
    fetchConversationData();
  }, [fetchConversationData]);

  // Poll for updates while any conversation is running or any batch is running
  const anyBatchRunning = batches.some((b) => b.status === "running");
  const anyConversationRunning = conversations.some((c) => c.is_running);
  const shouldPoll = anyBatchRunning || anyConversationRunning || currentConversation?.is_running;

  React.useEffect(() => {
    if (!shouldPoll) return;

    const pollInterval = setInterval(async () => {
      await Promise.all([fetchConversationData(false), fetchListData(false)]);
    }, 2000);

    return () => clearInterval(pollInterval);
  }, [shouldPoll, fetchConversationData, fetchListData]);

  const handleSendMessage = async (content: string) => {
    if (!currentConversation) return;

    setIsSending(true);
    try {
      const response = await fetch(`/api/chat/conversations/${conversationId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: content }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to send message");
      }

      const data = await response.json();

      setMessages((prev) => [...prev, data.tutorMessage, data.studentMessage]);

      setCurrentConversation((prev) =>
        prev
          ? {
              ...prev,
              messages_remaining: data.messagesRemaining,
              status: data.conversationEnded ? "closed" : prev.status,
            }
          : null
      );

      setConversations((prev) =>
        prev.map((c) =>
          c.id === conversationId
            ? {
                ...c,
                messages_remaining: data.messagesRemaining,
                status: data.conversationEnded ? "closed" : c.status,
              }
            : c
        )
      );

      if (data.conversationEnded) {
        toast.info("Conversation has ended");
      }
    } catch (error) {
      console.error("Error sending message:", error);
      toast.error(error instanceof Error ? error.message : "Failed to send message");
    } finally {
      setIsSending(false);
    }
  };

  const handleConversationStarted = (newConversationId: string) => {
    fetchListData(false);
    router.push(`/chat/${newConversationId}`);
  };

  const handleBatchStarted = () => {
    fetchListData(false);
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
            conversation={currentConversation}
            messages={messages}
            isLoading={isLoadingMessages}
            isSending={isSending}
            onSendMessage={handleSendMessage}
          />
        </div>
      </div>

      <StartConversationModal
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        onConversationStarted={handleConversationStarted}
        onBatchStarted={handleBatchStarted}
      />
    </div>
  );
}
