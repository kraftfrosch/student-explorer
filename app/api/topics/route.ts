import { NextRequest, NextResponse } from "next/server"
import { listTopics } from "@/lib/api"

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const subjectId = searchParams.get("subject_id")

  try {
    const data = await listTopics(subjectId || undefined)
    return NextResponse.json(data)
  } catch (error) {
    console.error("Error fetching topics:", error)
    return NextResponse.json(
      { error: "Failed to fetch topics" },
      { status: 500 }
    )
  }
}
