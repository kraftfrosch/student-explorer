"use client";

import * as React from "react";
import { useRouter, useParams } from "next/navigation";
import { toast } from "sonner";
import { AppHeader } from "@/components/app-header";
import { ConversationList } from "@/components/chat/conversation-list";
import { ChatInterface } from "@/components/chat/chat-interface";
import { StartConversationModal } from "@/components/chat/start-conversation-modal";
import type { Conversation, Message } from "@/lib/types";

export default function ConversationPage() {
  const router = useRouter();
  const params = useParams();
  const conversationId = params.conversationId as string;

  const [conversations, setConversations] = React.useState<Conversation[]>([]);
  const [currentConversation, setCurrentConversation] =
    React.useState<Conversation | null>(null);
  const [messages, setMessages] = React.useState<Message[]>([]);
  const [isLoadingConversations, setIsLoadingConversations] =
    React.useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = React.useState(true);
  const [isSending, setIsSending] = React.useState(false);
  const [isModalOpen, setIsModalOpen] = React.useState(false);

  // Fetch all conversations
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

  // Fetch current conversation and messages
  React.useEffect(() => {
    if (!conversationId) return;

    async function fetchConversationData() {
      setIsLoadingMessages(true);
      try {
        // Fetch conversation details
        const convResponse = await fetch(
          `/api/chat/conversations/${conversationId}`
        );
        if (!convResponse.ok) throw new Error("Failed to fetch conversation");
        const conversation = await convResponse.json();
        setCurrentConversation(conversation);

        // Fetch messages
        const msgResponse = await fetch(
          `/api/chat/conversations/${conversationId}/messages`
        );
        if (!msgResponse.ok) throw new Error("Failed to fetch messages");
        const messages = await msgResponse.json();
        setMessages(messages);
      } catch (error) {
        console.error("Error fetching conversation data:", error);
        toast.error("Failed to load conversation");
        router.push("/chat");
      } finally {
        setIsLoadingMessages(false);
      }
    }

    fetchConversationData();
  }, [conversationId, router]);

  const handleSendMessage = async (content: string) => {
    if (!currentConversation) return;

    setIsSending(true);
    try {
      const response = await fetch(
        `/api/chat/conversations/${conversationId}/messages`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: content }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to send message");
      }

      const data = await response.json();

      // Add both tutor and student messages
      setMessages((prev) => [...prev, data.tutorMessage, data.studentMessage]);

      // Update conversation state
      setCurrentConversation((prev) =>
        prev
          ? {
              ...prev,
              messages_remaining: data.messagesRemaining,
              status: data.conversationEnded ? "closed" : prev.status,
            }
          : null
      );

      // Update in conversations list
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
      toast.error(
        error instanceof Error ? error.message : "Failed to send message"
      );
    } finally {
      setIsSending(false);
    }
  };

  const handleConversationStarted = (newConversationId: string) => {
    // Refresh conversations and navigate to the new one
    fetch("/api/chat/conversations")
      .then((res) => res.json())
      .then(setConversations)
      .catch(console.error);
    router.push(`/chat/${newConversationId}`);
  };

  return (
    <div className="flex h-full flex-col">
      <AppHeader title="Conversations" />

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
      />
    </div>
  );
}
