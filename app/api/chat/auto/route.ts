import { NextRequest, NextResponse } from "next/server";
import { startConversation, sendMessage } from "@/lib/api";
import {
  createConversation,
  createMessages,
  updateConversation,
} from "@/lib/supabase";
import { getStudentTopics, listStudents } from "@/lib/api";
import { openai } from "@ai-sdk/openai";
import { generateText } from "ai";

export const maxDuration = 300; // 5 minutes for long-running auto conversations

async function generateTutorMessage(
  systemPrompt: string,
  conversationHistory: { role: string; content: string }[]
): Promise<string> {
  const openaiKey = process.env.OPENAI_API_KEY;
  if (!openaiKey) {
    throw new Error("OPENAI_API_KEY environment variable is not set");
  }

  const messages = conversationHistory.map((m) => ({
    role: m.role === "tutor" ? "assistant" : "user",
    content: m.content,
  })) as Array<{ role: "user" | "assistant"; content: string }>;

  const { text } = await generateText({
    model: openai("gpt-4o"),
    system: systemPrompt,
    messages,
    maxOutputTokens: 500,
    temperature: 0.7,
  });

  return text;
}

async function runAutoConversation(
  conversationId: string,
  externalConversationId: string,
  systemPrompt: string,
  initialMessage: string,
  maxTurns: number
) {
  const conversationHistory: { role: string; content: string }[] = [];
  let currentMessage = initialMessage;
  let messagesRemaining = maxTurns;
  let isComplete = false;

  try {
    while (!isComplete && messagesRemaining > 0) {
      // Send tutor message to student API
      const studentResponse = await sendMessage({
        conversation_id: externalConversationId,
        tutor_message: currentMessage,
      });

      // Save both messages
      await createMessages([
        {
          conversation_id: conversationId,
          role: "tutor",
          content: currentMessage,
        },
        {
          conversation_id: conversationId,
          role: "student",
          content: studentResponse.student_response,
        },
      ]);

      // Update history
      conversationHistory.push(
        { role: "tutor", content: currentMessage },
        { role: "student", content: studentResponse.student_response }
      );

      messagesRemaining--;
      isComplete = studentResponse.is_complete;

      // Update conversation state (keep is_running true until done)
      await updateConversation(conversationId, {
        messages_remaining: messagesRemaining,
        status: isComplete ? "closed" : "open",
      });

      // If not complete, generate next tutor message
      if (!isComplete && messagesRemaining > 0) {
        currentMessage = await generateTutorMessage(
          systemPrompt,
          conversationHistory
        );
      }
    }

    // Mark as no longer running
    await updateConversation(conversationId, {
      is_running: false,
      status: isComplete ? "closed" : "open",
    });
  } catch (error) {
    console.error("Error in auto conversation loop:", error);
    // Mark as not running on error
    await updateConversation(conversationId, {
      is_running: false,
    });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      student_id,
      topic_id,
      set_type = "mini_dev",
      system_prompt,
      initial_message,
    } = body;

    if (!student_id || !topic_id || !system_prompt || !initial_message) {
      return NextResponse.json(
        {
          error:
            "student_id, topic_id, system_prompt, and initial_message are required",
        },
        { status: 400 }
      );
    }

    // Start conversation with external API
    const apiResponse = await startConversation({
      student_id,
      topic_id,
    });

    // Get student and topic details
    const [studentsResponse, topicsResponse] = await Promise.all([
      listStudents(),
      getStudentTopics(student_id),
    ]);

    const student = studentsResponse.students.find((s) => s.id === student_id);
    const topic = topicsResponse.topics.find((t) => t.id === topic_id);

    if (!student || !topic) {
      return NextResponse.json(
        { error: "Student or topic not found" },
        { status: 404 }
      );
    }

    // Create conversation in Supabase with auto flag and is_running
    const conversation = await createConversation({
      external_conversation_id: apiResponse.conversation_id,
      student_id,
      student_name: student.name,
      topic_id,
      topic_name: topic.name,
      subject_name: topic.subject_name,
      set_type,
      status: "open",
      messages_remaining: apiResponse.max_turns,
      is_auto: true,
      is_running: true,
      system_prompt,
      initial_message,
    });

    // Start the auto conversation in the background (don't await)
    // Using a self-invoking async function to handle the background work
    runAutoConversation(
      conversation.id,
      apiResponse.conversation_id,
      system_prompt,
      initial_message,
      apiResponse.max_turns
    ).catch((error) => {
      console.error("Background auto conversation error:", error);
    });

    // Return immediately with the conversation
    return NextResponse.json(conversation, { status: 201 });
  } catch (error) {
    console.error("Error starting auto conversation:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to start auto conversation",
      },
      { status: 500 }
    );
  }
}
