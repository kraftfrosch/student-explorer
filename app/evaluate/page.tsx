"use client";

import * as React from "react";
import { toast } from "sonner";
import {
  Loader2,
  Send,
  Trophy,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";
import { AppHeader } from "@/components/app-header";
import { useSetType } from "@/components/set-type-provider";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import type { Evaluation, Batch, SetType } from "@/lib/types";

const setTypeLabels: Record<SetType, string> = {
  mini_dev: "Mini Dev",
  dev: "Development",
  eval: "Evaluation",
};

const submissionLimits: Record<SetType, string> = {
  mini_dev: "Unlimited",
  dev: "100 submissions",
  eval: "10 submissions",
};

export default function EvaluatePage() {
  const { setType } = useSetType();
  const [evaluations, setEvaluations] = React.useState<Evaluation[]>([]);
  const [latestBatch, setLatestBatch] = React.useState<Batch | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  // Fetch evaluations and latest batch
  const fetchData = React.useCallback(async () => {
    try {
      const [evalRes, batchRes] = await Promise.all([
        fetch("/api/evaluate"),
        fetch("/api/chat/batch"),
      ]);

      if (evalRes.ok) {
        const evalData = await evalRes.json();
        setEvaluations(evalData);
      }

      if (batchRes.ok) {
        const batches = await batchRes.json();
        // Find latest completed batch for current set type
        const latest = batches.find(
          (b: Batch) => b.set_type === setType && b.status === "completed"
        );
        setLatestBatch(latest || null);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setIsLoading(false);
    }
  }, [setType]);

  React.useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleSubmitEvaluation = async () => {
    if (!latestBatch) {
      toast.error("No completed batch found for this set type");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/evaluate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ set_type: setType }),
      });

      if (!response.ok) {
        let errorData;
        try {
          errorData = await response.json();
        } catch (parseError) {
          // If response is not JSON, create a generic error
          errorData = {
            error: `Server error (${response.status}). Please try again.`,
            errorCode: "HTTP_ERROR",
          };
        }

        // Show specific error messages based on error code
        switch (errorData.errorCode) {
          case "RATE_LIMIT":
            toast.error(
              `Submission limit exceeded! You've reached the maximum number of submissions for ${setTypeLabels[setType]}.`,
              { duration: 6000 }
            );
            break;
          case "MISSING_CONVERSATIONS":
            toast.error(
              "Missing conversations! You need at least one completed conversation for each student-topic pair before evaluating.",
              { duration: 6000 }
            );
            break;
          case "VALIDATION_ERROR":
            toast.error(
              "Invalid request. Please ensure all conversations in your batch are completed.",
              { duration: 5000 }
            );
            break;
          case "DATABASE_ERROR":
            toast.error(
              "Evaluation was successful but failed to save. Please try again.",
              { duration: 5000 }
            );
            break;
          case "API_KEY_MISSING":
            toast.error(
              "API key is not configured. Please contact the administrator.",
              { duration: 6000 }
            );
            break;
          case "API_ERROR":
            toast.error(
              errorData.error ||
                "API error occurred. Please check your API key and try again.",
              { duration: 6000 }
            );
            break;
          case "HTTP_ERROR":
            toast.error(
              errorData.error ||
                "Server error occurred. Please try again later.",
              { duration: 5000 }
            );
            break;
          default:
            toast.error(
              errorData.error ||
                "Failed to submit evaluation. Please try again.",
              { duration: 5000 }
            );
        }
        return;
      }

      const data = await response.json();
      toast.success(
        `Evaluation submitted! Score: ${data.result.score.toFixed(2)}/5.0${
          data.result.submissions_remaining !== null
            ? ` (${data.result.submissions_remaining} submissions remaining)`
            : ""
        }`,
        { duration: 5000 }
      );
      fetchData();
    } catch (error) {
      console.error("Error submitting evaluation:", error);

      // Handle network errors
      if (error instanceof TypeError && error.message.includes("fetch")) {
        toast.error(
          "Network error: Could not connect to the server. Please check your internet connection and try again.",
          { duration: 6000 }
        );
      } else {
        const errorMessage =
          error instanceof Error
            ? error.message
            : "Failed to submit evaluation. Please check your connection and try again.";
        toast.error(errorMessage, { duration: 6000 });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filter evaluations for current set type
  const filteredEvaluations = evaluations.filter((e) => e.set_type === setType);
  const bestScore =
    filteredEvaluations.length > 0
      ? Math.max(...filteredEvaluations.map((e) => e.score))
      : null;

  return (
    <div className="flex h-full flex-col">
      <AppHeader title="Submit Evaluation" />

      <div className="flex-1 overflow-auto p-6">
        <div className="mx-auto max-w-4xl space-y-6">
          {/* Submit Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="h-5 w-5 text-amber-500" />
                Submit Tutoring Evaluation
              </CardTitle>
              <CardDescription>
                Submit your tutoring conversations for evaluation on the{" "}
                <strong>{setTypeLabels[setType]}</strong> set.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                <Badge variant="outline" className="text-sm">
                  {submissionLimits[setType]}
                </Badge>
                {filteredEvaluations.length > 0 && (
                  <Badge variant="secondary" className="text-sm">
                    {filteredEvaluations.length} submission(s) made
                  </Badge>
                )}
              </div>

              {latestBatch ? (
                <div className="rounded-lg border bg-muted/50 p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">Latest Batch:</span>
                    <Badge>{latestBatch.name}</Badge>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    <strong>Conversations:</strong>{" "}
                    {latestBatch.total_conversations}
                  </div>
                  <Separator />
                  <div className="text-sm">
                    <strong>System Prompt:</strong>
                    <pre className="mt-1 whitespace-pre-wrap text-xs bg-background p-2 rounded border max-h-32 overflow-auto">
                      {latestBatch.system_prompt}
                    </pre>
                  </div>
                  <div className="text-sm">
                    <strong>First Message:</strong>
                    <pre className="mt-1 whitespace-pre-wrap text-xs bg-background p-2 rounded border">
                      {latestBatch.initial_message}
                    </pre>
                  </div>
                </div>
              ) : (
                <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-4">
                  <div className="flex items-center gap-2 text-amber-700">
                    <AlertTriangle className="h-4 w-4" />
                    <span className="font-medium">
                      No completed batch found
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-amber-600">
                    Please run a batch conversation first before submitting an
                    evaluation.
                  </p>
                </div>
              )}

              <Button
                onClick={handleSubmitEvaluation}
                disabled={!latestBatch || isSubmitting}
                className="w-full"
                size="lg"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  <>
                    <Send className="mr-2 h-4 w-4" />
                    Submit Evaluation
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Previous Evaluations */}
          <Card>
            <CardHeader>
              <CardTitle>Evaluation History</CardTitle>
              <CardDescription>
                Previous evaluations for {setTypeLabels[setType]}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : filteredEvaluations.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No evaluations submitted yet for this set type.
                </div>
              ) : (
                <ScrollArea className="h-[400px]">
                  <div className="space-y-3">
                    {filteredEvaluations.map((evaluation) => (
                      <div
                        key={evaluation.id}
                        className="rounded-lg border p-4 space-y-2"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {evaluation.score === bestScore && (
                              <CheckCircle2 className="h-4 w-4 text-green-500" />
                            )}
                            <span className="font-semibold text-lg">
                              {evaluation.score.toFixed(2)}/5.0
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">
                              #{evaluation.submission_number}
                            </Badge>
                            <Badge variant="secondary">
                              {evaluation.num_conversations} conv.
                            </Badge>
                          </div>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {new Date(evaluation.created_at).toLocaleString()}
                        </div>
                        <Separator />
                        <details className="text-sm">
                          <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                            View prompt & message
                          </summary>
                          <div className="mt-2 space-y-2">
                            <div>
                              <strong>System Prompt:</strong>
                              <pre className="mt-1 whitespace-pre-wrap text-xs bg-muted p-2 rounded max-h-24 overflow-auto">
                                {evaluation.system_prompt}
                              </pre>
                            </div>
                            <div>
                              <strong>First Message:</strong>
                              <pre className="mt-1 whitespace-pre-wrap text-xs bg-muted p-2 rounded">
                                {evaluation.initial_message}
                              </pre>
                            </div>
                          </div>
                        </details>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
