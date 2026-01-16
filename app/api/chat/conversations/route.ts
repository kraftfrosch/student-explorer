import { NextResponse } from "next/server"
import { getConversations } from "@/lib/supabase"

export async function GET() {
  try {
    const conversations = await getConversations()
    return NextResponse.json(conversations)
  } catch (error) {
    console.error("Error fetching conversations:", error)
    return NextResponse.json(
      { error: "Failed to fetch conversations" },
      { status: 500 }
    )
  }
}
