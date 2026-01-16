import { NextRequest, NextResponse } from "next/server";
import {
  getInferenceLeaderboard,
  getTutoringLeaderboard,
  getCombinedLeaderboard,
} from "@/lib/api";
import type { SetType } from "@/lib/types";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const type = searchParams.get("type") || "combined";
    const setType = (searchParams.get("set_type") as SetType) || undefined;

    let data;
    switch (type) {
      case "inference":
        data = await getInferenceLeaderboard(setType);
        break;
      case "tutoring":
        data = await getTutoringLeaderboard(setType);
        break;
      case "combined":
      default:
        data = await getCombinedLeaderboard(setType);
        break;
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Error fetching leaderboard:", error);
    return NextResponse.json(
      { error: "Failed to fetch leaderboard" },
      { status: 500 }
    );
  }
}
