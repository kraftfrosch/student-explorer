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
        {
          error: `No batch found for set type: ${set_type}. Please run a batch first.`,
        },
        { status: 400 }
      );
    }

    if (latestBatch.status !== "completed") {
      return NextResponse.json(
        {
          error:
            "Latest batch is not completed yet. Please wait for it to finish.",
        },
        { status: 400 }
      );
    }

    // Submit evaluation to the external API
    let result;
    try {
      result = await submitTutoringEvaluation(set_type as SetType);
    } catch (apiError) {
      console.error("Error from evaluation API:", apiError);

      // Parse the error message to provide better feedback
      const errorMessage =
        apiError instanceof Error ? apiError.message : String(apiError);

      // Check for API key errors
      if (
        errorMessage.includes("STUDENT_API_KEY") ||
        errorMessage.includes("API key")
      ) {
        return NextResponse.json(
          {
            error:
              "API key is not configured. Please contact the administrator.",
            errorCode: "API_KEY_MISSING",
          },
          { status: 500 }
        );
      }

      // Check for specific error codes
      if (errorMessage.includes("429")) {
        return NextResponse.json(
          {
            error:
              "Submission limit exceeded. You have reached the maximum number of submissions for this set type.",
            errorCode: "RATE_LIMIT",
          },
          { status: 429 }
        );
      }

      if (
        errorMessage.includes("400") ||
        errorMessage.includes("Missing conversations")
      ) {
        return NextResponse.json(
          {
            error:
              "Missing conversations. You need at least one completed conversation for each student-topic pair in this set before evaluating.",
            errorCode: "MISSING_CONVERSATIONS",
          },
          { status: 400 }
        );
      }

      if (errorMessage.includes("422")) {
        return NextResponse.json(
          {
            error:
              "Invalid request. Please check that all required conversations are completed.",
            errorCode: "VALIDATION_ERROR",
          },
          { status: 422 }
        );
      }

      // Generic API error
      return NextResponse.json(
        {
          error: `Evaluation API error: ${errorMessage}`,
          errorCode: "API_ERROR",
        },
        { status: 500 }
      );
    }

    // Store the evaluation with the batch's prompt and message
    let evaluation;
    try {
      evaluation = await createEvaluation({
        set_type: set_type as SetType,
        batch_id: latestBatch.id,
        score: result.score,
        num_conversations: result.num_conversations,
        submission_number: result.submission_number,
        submissions_remaining: result.submissions_remaining,
        system_prompt: latestBatch.system_prompt,
        initial_message: latestBatch.initial_message,
      });
    } catch (dbError) {
      console.error("Error saving evaluation to database:", dbError);
      return NextResponse.json(
        {
          error:
            "Evaluation was successful but failed to save. Please try again.",
          errorCode: "DATABASE_ERROR",
        },
        { status: 500 }
      );
    }

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
    console.error("Unexpected error submitting evaluation:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? `Unexpected error: ${error.message}`
            : "Failed to submit evaluation. Please try again.",
        errorCode: "UNKNOWN_ERROR",
      },
      { status: 500 }
    );
  }
}
