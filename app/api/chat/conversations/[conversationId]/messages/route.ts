import { NextRequest, NextResponse } from "next/server";
import { sendMessage } from "@/lib/api";
import {
  getMessages,
  createMessages,
  getConversation,
  updateConversation,
} from "@/lib/supabase";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ conversationId: string }> }
) {
  try {
    const { conversationId } = await params;
    const messages = await getMessages(conversationId);
    return NextResponse.json(messages);
  } catch (error) {
    console.error("Error fetching messages:", error);
    return NextResponse.json(
      { error: "Failed to fetch messages" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ conversationId: string }> }
) {
  try {
    const { conversationId } = await params;
    const body = await request.json();
    const { message } = body;

    if (!message) {
      return NextResponse.json(
        { error: "message is required" },
        { status: 400 }
      );
    }

    // Get the conversation to get the external conversation ID
    const conversation = await getConversation(conversationId);

    if (!conversation) {
      return NextResponse.json(
        { error: "Conversation not found" },
        { status: 404 }
      );
    }

    if (conversation.status === "closed") {
      return NextResponse.json(
        { error: "Conversation is closed" },
        { status: 400 }
      );
    }

    // Send message to external API
    const apiResponse = await sendMessage({
      conversation_id: conversation.external_conversation_id,
      tutor_message: message,
    });

    // Save both messages to Supabase
    const savedMessages = await createMessages([
      {
        conversation_id: conversationId,
        role: "tutor",
        content: message,
      },
      {
        conversation_id: conversationId,
        role: "student",
        content: apiResponse.student_response,
      },
    ]);

    // Calculate remaining turns (max_turns - current turn)
    const messagesRemaining = conversation.messages_remaining - 1;
    const newStatus = apiResponse.is_complete ? "closed" : "open";

    await updateConversation(conversationId, {
      messages_remaining: messagesRemaining,
      status: newStatus,
    });

    return NextResponse.json({
      tutorMessage: savedMessages[0],
      studentMessage: savedMessages[1],
      messagesRemaining,
      conversationEnded: apiResponse.is_complete,
    });
  } catch (error) {
    console.error("Error sending message:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to send message",
      },
      { status: 500 }
    );
  }
}
