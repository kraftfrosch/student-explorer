import { NextRequest, NextResponse } from "next/server"
import { getStudentTopics } from "@/lib/api"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ studentId: string }> }
) {
  const { studentId } = await params

  try {
    const data = await getStudentTopics(studentId)
    return NextResponse.json(data)
  } catch (error) {
    console.error("Error fetching student topics:", error)
    return NextResponse.json(
      { error: "Failed to fetch student topics" },
      { status: 500 }
    )
  }
}
