import { NextRequest, NextResponse } from "next/server";
import { startConversation, sendMessage, listStudents, getStudentTopics } from "@/lib/api";
import {
  createConversation,
  createMessages,
  updateConversation,
  createBatch,
  updateBatch,
  getBatches,
} from "@/lib/supabase";
import type { SetType } from "@/lib/types";

export const maxDuration = 300;

async function generateTutorMessage(
  systemPrompt: string,
  conversationHistory: { role: string; content: string }[]
): Promise<string> {
  const openaiKey = process.env.OPENAI_API_KEY;
  if (!openaiKey) {
    throw new Error("OPENAI_API_KEY environment variable is not set");
  }

  const messages = [
    { role: "system", content: systemPrompt },
    ...conversationHistory.map((m) => ({
      role: m.role === "tutor" ? "assistant" : "user",
      content: m.content,
    })),
  ];

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${openaiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages,
      max_tokens: 500,
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenAI API Error: ${response.status} - ${error}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

async function runSingleConversation(
  conversationId: string,
  externalConversationId: string,
  systemPrompt: string,
  initialMessage: string,
  maxTurns: number,
  batchId: string
) {
  const conversationHistory: { role: string; content: string }[] = [];
  let currentMessage = initialMessage;
  let messagesRemaining = maxTurns;
  let isComplete = false;

  try {
    while (!isComplete && messagesRemaining > 0) {
      const studentResponse = await sendMessage({
        conversation_id: externalConversationId,
        tutor_message: currentMessage,
      });

      await createMessages([
        { conversation_id: conversationId, role: "tutor", content: currentMessage },
        { conversation_id: conversationId, role: "student", content: studentResponse.student_response },
      ]);

      conversationHistory.push(
        { role: "tutor", content: currentMessage },
        { role: "student", content: studentResponse.student_response }
      );

      messagesRemaining--;
      isComplete = studentResponse.is_complete;

      await updateConversation(conversationId, {
        messages_remaining: messagesRemaining,
        status: isComplete ? "closed" : "open",
      });

      if (!isComplete && messagesRemaining > 0) {
        currentMessage = await generateTutorMessage(systemPrompt, conversationHistory);
      }
    }

    await updateConversation(conversationId, {
      is_running: false,
      status: isComplete ? "closed" : "open",
    });

    return true;
  } catch (error) {
    console.error(`Error in conversation ${conversationId}:`, error);
    await updateConversation(conversationId, { is_running: false });
    return false;
  }
}

async function runBatchConversations(
  batchId: string,
  conversations: Array<{
    conversationId: string;
    externalConversationId: string;
    maxTurns: number;
  }>,
  systemPrompt: string,
  initialMessage: string
) {
  let completed = 0;

  for (const conv of conversations) {
    const success = await runSingleConversation(
      conv.conversationId,
      conv.externalConversationId,
      systemPrompt,
      initialMessage,
      conv.maxTurns,
      batchId
    );

    if (success) {
      completed++;
      await updateBatch(batchId, {
        completed_conversations: completed,
      });
    }
  }

  await updateBatch(batchId, {
    status: "completed",
    completed_conversations: completed,
  });
}

// GET - List all batches
export async function GET() {
  try {
    const batches = await getBatches();
    return NextResponse.json(batches);
  } catch (error) {
    console.error("Error fetching batches:", error);
    return NextResponse.json({ error: "Failed to fetch batches" }, { status: 500 });
  }
}

// POST - Create a new batch
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, set_type, system_prompt, initial_message } = body;

    if (!name || !set_type || !system_prompt || !initial_message) {
      return NextResponse.json(
        { error: "name, set_type, system_prompt, and initial_message are required" },
        { status: 400 }
      );
    }

    // Get all students for this set type
    const studentsResponse = await listStudents(set_type as SetType);
    const students = studentsResponse.students;

    if (students.length === 0) {
      return NextResponse.json(
        { error: "No students found for this set type" },
        { status: 400 }
      );
    }

    // Get all student-topic combinations
    const studentTopicPairs: Array<{
      student: typeof students[0];
      topic: { id: string; name: string; subject_name: string };
    }> = [];

    for (const student of students) {
      const topicsResponse = await getStudentTopics(student.id);
      for (const topic of topicsResponse.topics) {
        studentTopicPairs.push({ student, topic });
      }
    }

    if (studentTopicPairs.length === 0) {
      return NextResponse.json(
        { error: "No student-topic combinations found" },
        { status: 400 }
      );
    }

    // Create the batch
    const batch = await createBatch({
      name,
      set_type,
      system_prompt,
      initial_message,
      status: "running",
      total_conversations: studentTopicPairs.length,
      completed_conversations: 0,
    });

    // Create all conversations
    const conversationsData: Array<{
      conversationId: string;
      externalConversationId: string;
      maxTurns: number;
    }> = [];

    for (const { student, topic } of studentTopicPairs) {
      try {
        const apiResponse = await startConversation({
          student_id: student.id,
          topic_id: topic.id,
        });

        const conversation = await createConversation({
          external_conversation_id: apiResponse.conversation_id,
          student_id: student.id,
          student_name: student.name,
          topic_id: topic.id,
          topic_name: topic.name,
          subject_name: topic.subject_name,
          set_type,
          status: "open",
          messages_remaining: apiResponse.max_turns,
          is_auto: true,
          is_running: true,
          system_prompt,
          initial_message,
          batch_id: batch.id,
        });

        conversationsData.push({
          conversationId: conversation.id,
          externalConversationId: apiResponse.conversation_id,
          maxTurns: apiResponse.max_turns,
        });
      } catch (error) {
        console.error(`Failed to create conversation for ${student.name} - ${topic.name}:`, error);
      }
    }

    // Update batch with actual conversation count
    await updateBatch(batch.id, {
      total_conversations: conversationsData.length,
    });

    // Run all conversations in the background
    runBatchConversations(batch.id, conversationsData, system_prompt, initial_message).catch(
      (error) => {
        console.error("Batch conversation error:", error);
        updateBatch(batch.id, { status: "failed" }).catch(console.error);
      }
    );

    return NextResponse.json(batch, { status: 201 });
  } catch (error) {
    console.error("Error creating batch:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to create batch" },
      { status: 500 }
    );
  }
}
