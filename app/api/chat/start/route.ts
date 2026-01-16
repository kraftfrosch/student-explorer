import { NextRequest, NextResponse } from "next/server"
import { startConversation } from "@/lib/api"
import { createConversation } from "@/lib/supabase"
import { getStudentTopics, listStudents } from "@/lib/api"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { student_id, topic_id } = body

    if (!student_id || !topic_id) {
      return NextResponse.json(
        { error: "student_id and topic_id are required" },
        { status: 400 }
      )
    }

    // Start conversation with external API
    const apiResponse = await startConversation({
      student_id,
      topic_id,
    })

    // Get student and topic details for storage
    const [studentsResponse, topicsResponse] = await Promise.all([
      listStudents(),
      getStudentTopics(student_id),
    ])

    const student = studentsResponse.students.find((s) => s.id === student_id)
    const topic = topicsResponse.topics.find((t) => t.id === topic_id)

    if (!student || !topic) {
      return NextResponse.json(
        { error: "Student or topic not found" },
        { status: 404 }
      )
    }

    // Create conversation in Supabase
    const conversation = await createConversation({
      external_conversation_id: apiResponse.conversation_id,
      student_id,
      student_name: student.name,
      topic_id,
      topic_name: topic.name,
      subject_name: topic.subject_name,
      status: "open",
      messages_remaining: apiResponse.max_turns,
    })

    return NextResponse.json(conversation, { status: 201 })
  } catch (error) {
    console.error("Error starting conversation:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to start conversation" },
      { status: 500 }
    )
  }
}
