import { NextRequest, NextResponse } from "next/server"
import { listStudents } from "@/lib/api"
import type { SetType } from "@/lib/types"

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const setType = searchParams.get("set_type") as SetType | null

  try {
    const data = await listStudents(setType || undefined)
    return NextResponse.json(data)
  } catch (error) {
    console.error("Error fetching students:", error)
    return NextResponse.json(
      { error: "Failed to fetch students" },
      { status: 500 }
    )
  }
}
