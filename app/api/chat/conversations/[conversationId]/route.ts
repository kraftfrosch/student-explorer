import { NextRequest, NextResponse } from "next/server"
import { getConversation } from "@/lib/supabase"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ conversationId: string }> }
) {
  try {
    const { conversationId } = await params
    const conversation = await getConversation(conversationId)
    return NextResponse.json(conversation)
  } catch (error) {
    console.error("Error fetching conversation:", error)
    return NextResponse.json(
      { error: "Failed to fetch conversation" },
      { status: 500 }
    )
  }
}
