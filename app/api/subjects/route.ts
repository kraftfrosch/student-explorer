import { NextResponse } from "next/server"
import { listSubjects } from "@/lib/api"

export async function GET() {
  try {
    const data = await listSubjects()
    return NextResponse.json(data)
  } catch (error) {
    console.error("Error fetching subjects:", error)
    return NextResponse.json(
      { error: "Failed to fetch subjects" },
      { status: 500 }
    )
  }
}
