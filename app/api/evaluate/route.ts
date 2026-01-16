import { NextRequest, NextResponse } from "next/server";
import { submitTutoringEvaluation } from "@/lib/api";
import {
  getEvaluations,
  createEvaluation,
  getLatestBatchBySetType,
} from "@/lib/supabase";
import type { SetType } from "@/lib/types";

// GET - List all evaluations
export async function GET() {
  try {
    const evaluations = await getEvaluations();
    return NextResponse.json(evaluations);
  } catch (error) {
    console.error("Error fetching evaluations:", error);
    return NextResponse.json(
      { error: "Failed to fetch evaluations" },
      { status: 500 }
    );
  }
}

// POST - Submit a new evaluation
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { set_type } = body;

    if (!set_type) {
      return NextResponse.json(
        { error: "set_type is required" },
        { status: 400 }
      );
    }

    // Get the latest batch for this set type to get the prompt/message
    const latestBatch = await getLatestBatchBySetType(set_type as SetType);

    if (!latestBatch) {
      return NextResponse.json(
        { error: `No batch found for set type: ${set_type}. Please run a batch first.` },
        { status: 400 }
      );
    }

    if (latestBatch.status !== "completed") {
      return NextResponse.json(
        { error: "Latest batch is not completed yet. Please wait for it to finish." },
        { status: 400 }
      );
    }

    // Submit evaluation to the external API
    const result = await submitTutoringEvaluation(set_type as SetType);

    // Store the evaluation with the batch's prompt and message
    const evaluation = await createEvaluation({
      set_type: set_type as SetType,
      batch_id: latestBatch.id,
      score: result.score,
      num_conversations: result.num_conversations,
      submission_number: result.submission_number,
      submissions_remaining: result.submissions_remaining,
      system_prompt: latestBatch.system_prompt,
      initial_message: latestBatch.initial_message,
    });

    return NextResponse.json(
      {
        evaluation,
        result,
        batch: {
          id: latestBatch.id,
          name: latestBatch.name,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error submitting evaluation:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to submit evaluation",
      },
      { status: 500 }
    );
  }
}
