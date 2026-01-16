"use client";

import * as React from "react";
import { Loader2, Bot, User, FolderPlus } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useSetType } from "@/components/set-type-provider";
import type { Student, Topic, Batch } from "@/lib/types";

interface StartConversationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConversationStarted: (conversationId: string) => void;
  onBatchStarted?: () => void;
  initialStudentId?: string;
  initialTopicId?: string;
}

const DEFAULT_SYSTEM_PROMPT = `You are an expert tutor helping a student learn. Your goal is to:
1. Ask probing questions to understand their current knowledge level
2. Provide clear explanations when they struggle
3. Encourage them and celebrate their progress
4. Guide them to discover answers rather than giving direct solutions
5. Keep responses concise and focused`;

const DEFAULT_INITIAL_MESSAGE =
  "Hi! I'm here to help you learn. Let's start by understanding what you already know about this topic. Can you tell me what comes to mind when you think about it?";

const setTypeLabels: Record<string, string> = {
  mini_dev: "Mini Dev",
  dev: "Development",
  eval: "Evaluation",
};

export function StartConversationModal({
  open,
  onOpenChange,
  onConversationStarted,
  onBatchStarted,
  initialStudentId,
  initialTopicId,
}: StartConversationModalProps) {
  const { setType } = useSetType();
  const [mode, setMode] = React.useState<"manual" | "auto" | "batch">("manual");
  const [students, setStudents] = React.useState<Student[]>([]);
  const [topics, setTopics] = React.useState<Topic[]>([]);
  const [selectedStudentId, setSelectedStudentId] = React.useState<string>("");
  const [selectedTopicId, setSelectedTopicId] = React.useState<string>("");
  const [isLoadingStudents, setIsLoadingStudents] = React.useState(false);
  const [isLoadingTopics, setIsLoadingTopics] = React.useState(false);
  const [isStarting, setIsStarting] = React.useState(false);

  // Auto/Batch mode fields
  const [systemPrompt, setSystemPrompt] = React.useState(DEFAULT_SYSTEM_PROMPT);
  const [initialMessage, setInitialMessage] = React.useState(
    DEFAULT_INITIAL_MESSAGE
  );
  const [batchName, setBatchName] = React.useState("");
  const [latestBatch, setLatestBatch] = React.useState<Batch | null>(null);

  // Reset state when modal opens/closes
  React.useEffect(() => {
    if (open) {
      setSelectedStudentId(initialStudentId || "");
      setSelectedTopicId(initialTopicId || "");
      setMode("manual");
      // Defaults will be set by the latest batch fetch effect if in batch mode
      setSystemPrompt(DEFAULT_SYSTEM_PROMPT);
      setInitialMessage(DEFAULT_INITIAL_MESSAGE);
      const now = new Date();
      const timeStr = now.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });
      setBatchName(`Batch ${setTypeLabels[setType]} ${timeStr}`);
    } else {
      // Reset latest batch when modal closes
      setLatestBatch(null);
    }
  }, [open, initialStudentId, initialTopicId, setType]);

  // Fetch latest batch when modal opens to get default prompts
  React.useEffect(() => {
    if (!open) return;

    async function fetchLatestBatch() {
      try {
        const response = await fetch("/api/chat/batch");
        if (response.ok) {
          const batches: Batch[] = await response.json();
          // Find latest batch for current set type (prefer completed, but any batch works)
          const latest = batches
            .filter((b) => b.set_type === setType)
            .sort(
              (a, b) =>
                new Date(b.created_at).getTime() -
                new Date(a.created_at).getTime()
            )[0];
          if (latest) {
            setLatestBatch(latest);
            // Update prompts if we're in batch mode
            if (mode === "batch") {
              setSystemPrompt(latest.system_prompt);
              setInitialMessage(latest.initial_message);
            }
          }
        }
      } catch (error) {
        console.error("Error fetching latest batch:", error);
        // Don't show error toast, just use defaults
      }
    }

    fetchLatestBatch();
  }, [open, setType, mode]);

  // Fetch students when modal opens
  React.useEffect(() => {
    if (!open) return;

    async function fetchStudents() {
      setIsLoadingStudents(true);
      try {
        const response = await fetch(`/api/students?set_type=${setType}`);
        if (!response.ok) throw new Error("Failed to fetch students");
        const data = await response.json();
        setStudents(data.students);
      } catch (error) {
        console.error("Error fetching students:", error);
        toast.error("Failed to load students");
      } finally {
        setIsLoadingStudents(false);
      }
    }

    fetchStudents();
  }, [open, setType]);

  // Fetch topics when student changes
  React.useEffect(() => {
    if (!selectedStudentId) {
      setTopics([]);
      return;
    }

    async function fetchTopics() {
      setIsLoadingTopics(true);
      try {
        const response = await fetch(
          `/api/students/${selectedStudentId}/topics`
        );
        if (!response.ok) throw new Error("Failed to fetch topics");
        const data = await response.json();
        setTopics(data.topics);
      } catch (error) {
        console.error("Error fetching topics:", error);
        toast.error("Failed to load topics");
      } finally {
        setIsLoadingTopics(false);
      }
    }

    fetchTopics();
  }, [selectedStudentId]);

  // Clear topic selection when student changes
  React.useEffect(() => {
    if (selectedStudentId !== initialStudentId) {
      setSelectedTopicId("");
    }
  }, [selectedStudentId, initialStudentId]);

  const handleStartConversation = async () => {
    setIsStarting(true);
    try {
      if (mode === "manual") {
        if (!selectedStudentId || !selectedTopicId) return;

        const response = await fetch("/api/chat/start", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            student_id: selectedStudentId,
            topic_id: selectedTopicId,
            set_type: setType,
          }),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || "Failed to start conversation");
        }

        const data = await response.json();
        toast.success("Conversation started!");
        onConversationStarted(data.id);
        onOpenChange(false);
      } else if (mode === "auto") {
        if (!selectedStudentId || !selectedTopicId) return;
        if (!systemPrompt.trim() || !initialMessage.trim()) {
          throw new Error("System prompt and initial message are required");
        }

        toast.info("Starting auto conversation...");

        const response = await fetch("/api/chat/auto", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            student_id: selectedStudentId,
            topic_id: selectedTopicId,
            set_type: setType,
            system_prompt: systemPrompt,
            initial_message: initialMessage,
          }),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || "Failed to run auto conversation");
        }

        const data = await response.json();
        toast.success("Auto conversation started!");
        onConversationStarted(data.id);
        onOpenChange(false);
      } else if (mode === "batch") {
        if (
          !batchName.trim() ||
          !systemPrompt.trim() ||
          !initialMessage.trim()
        ) {
          throw new Error(
            "Batch name, system prompt, and initial message are required"
          );
        }

        toast.info(
          `Starting batch with all ${setTypeLabels[setType]} students...`
        );

        const response = await fetch("/api/chat/batch", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: batchName,
            set_type: setType,
            system_prompt: systemPrompt,
            initial_message: initialMessage,
          }),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || "Failed to create batch");
        }

        const data = await response.json();
        toast.success(
          `Batch "${data.name}" created with ${data.total_conversations} conversations!`
        );
        onBatchStarted?.();
        onOpenChange(false);
      }
    } catch (error) {
      console.error("Error:", error);
      toast.error(error instanceof Error ? error.message : "Failed to start");
    } finally {
      setIsStarting(false);
    }
  };

  const selectedStudent = students.find((s) => s.id === selectedStudentId);
  const selectedTopic = topics.find((t) => t.id === selectedTopicId);

  const canStartManual = selectedStudentId && selectedTopicId;
  const canStartAuto =
    selectedStudentId &&
    selectedTopicId &&
    systemPrompt.trim() &&
    initialMessage.trim();
  const canStartBatch =
    batchName.trim() && systemPrompt.trim() && initialMessage.trim();

  const canStart =
    mode === "manual"
      ? canStartManual
      : mode === "auto"
      ? canStartAuto
      : canStartBatch;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Start New Conversation</DialogTitle>
          <DialogDescription>
            Choose a mode: manual tutoring, single auto conversation, or batch
            all students.
          </DialogDescription>
        </DialogHeader>

        <Tabs
          value={mode}
          onValueChange={(v) => {
            const newMode = v as "manual" | "auto" | "batch";
            setMode(newMode);
            // When switching to batch mode, use latest batch prompts if available
            if (newMode === "batch" && latestBatch) {
              setSystemPrompt(latestBatch.system_prompt);
              setInitialMessage(latestBatch.initial_message);
            } else if (newMode === "auto") {
              // Reset to defaults for auto mode
              setSystemPrompt(DEFAULT_SYSTEM_PROMPT);
              setInitialMessage(DEFAULT_INITIAL_MESSAGE);
            }
          }}
        >
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="manual" className="flex items-center gap-2">
              <User className="h-4 w-4" />
              Manual
            </TabsTrigger>
            <TabsTrigger value="auto" className="flex items-center gap-2">
              <Bot className="h-4 w-4" />
              Auto
            </TabsTrigger>
            <TabsTrigger value="batch" className="flex items-center gap-2">
              <FolderPlus className="h-4 w-4" />
              Batch
            </TabsTrigger>
          </TabsList>

          <div className="space-y-4 py-4">
            {/* Manual & Auto modes - need student/topic selection */}
            {(mode === "manual" || mode === "auto") && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="student">Student</Label>
                  <Select
                    value={selectedStudentId}
                    onValueChange={setSelectedStudentId}
                    disabled={isLoadingStudents || isStarting}
                  >
                    <SelectTrigger id="student" className="w-full">
                      <SelectValue placeholder="Select a student" />
                    </SelectTrigger>
                    <SelectContent>
                      {isLoadingStudents ? (
                        <div className="flex items-center justify-center py-4">
                          <Loader2 className="h-4 w-4 animate-spin" />
                        </div>
                      ) : (
                        students.map((student) => (
                          <SelectItem key={student.id} value={student.id}>
                            {student.name} (Grade {student.grade_level})
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="topic">Topic</Label>
                  <Select
                    value={selectedTopicId}
                    onValueChange={setSelectedTopicId}
                    disabled={
                      !selectedStudentId || isLoadingTopics || isStarting
                    }
                  >
                    <SelectTrigger id="topic" className="w-full">
                      <SelectValue
                        placeholder={
                          !selectedStudentId
                            ? "Select a student first"
                            : "Select a topic"
                        }
                      />
                    </SelectTrigger>
                    <SelectContent>
                      {isLoadingTopics ? (
                        <div className="flex items-center justify-center py-4">
                          <Loader2 className="h-4 w-4 animate-spin" />
                        </div>
                      ) : (
                        topics.map((topic) => (
                          <SelectItem key={topic.id} value={topic.id}>
                            {topic.name} ({topic.subject_name})
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}

            <TabsContent value="manual" className="mt-0 space-y-4">
              {selectedStudent && selectedTopic && (
                <div className="rounded-lg border bg-muted/50 p-3">
                  <p className="text-sm">
                    <strong>Summary:</strong> Start a tutoring session with{" "}
                    <strong>{selectedStudent.name}</strong> on{" "}
                    <strong>{selectedTopic.name}</strong> (
                    {selectedTopic.subject_name})
                  </p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="auto" className="mt-0 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="system-prompt-auto">System Prompt</Label>
                <Textarea
                  id="system-prompt-auto"
                  value={systemPrompt}
                  onChange={(e) => setSystemPrompt(e.target.value)}
                  placeholder="Instructions for the AI tutor..."
                  className="min-h-[160px] resize-y text-sm font-mono"
                  disabled={isStarting}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="initial-message-auto">First Message</Label>
                <Textarea
                  id="initial-message-auto"
                  value={initialMessage}
                  onChange={(e) => setInitialMessage(e.target.value)}
                  placeholder="The AI's first message to the student..."
                  className="min-h-[100px] resize-y text-sm"
                  disabled={isStarting}
                />
              </div>

              {selectedStudent && selectedTopic && (
                <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3">
                  <p className="text-sm text-amber-700">
                    <strong>Auto Mode:</strong> The AI will tutor{" "}
                    <strong>{selectedStudent.name}</strong> on{" "}
                    <strong>{selectedTopic.name}</strong> until the conversation
                    ends.
                  </p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="batch" className="mt-0 space-y-4">
              <div className="space-y-2">
                <Label htmlFor="batch-name">Batch Name</Label>
                <Input
                  id="batch-name"
                  value={batchName}
                  onChange={(e) => setBatchName(e.target.value)}
                  placeholder="Enter a name for this batch..."
                  disabled={isStarting}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="system-prompt-batch">System Prompt</Label>
                <Textarea
                  id="system-prompt-batch"
                  value={systemPrompt}
                  onChange={(e) => setSystemPrompt(e.target.value)}
                  placeholder="Instructions for the AI tutor..."
                  className="min-h-[160px] resize-y text-sm font-mono"
                  disabled={isStarting}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="initial-message-batch">First Message</Label>
                <Textarea
                  id="initial-message-batch"
                  value={initialMessage}
                  onChange={(e) => setInitialMessage(e.target.value)}
                  placeholder="The AI's first message to all students..."
                  className="min-h-[100px] resize-y text-sm"
                  disabled={isStarting}
                />
              </div>

              <div className="rounded-lg border border-purple-500/30 bg-purple-500/10 p-3">
                <p className="text-sm text-purple-700">
                  <strong>Batch Mode:</strong> This will create conversations
                  with <strong>ALL students</strong> in the{" "}
                  <strong>{setTypeLabels[setType]}</strong> set, each on their
                  available topics. All conversations will use the same prompt
                  and run automatically.
                </p>
                {!isLoadingStudents && (
                  <p className="text-xs text-purple-600 mt-1">
                    {students.length} students available
                  </p>
                )}
              </div>
            </TabsContent>
          </div>
        </Tabs>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isStarting}
          >
            Cancel
          </Button>
          <Button
            onClick={handleStartConversation}
            disabled={!canStart || isStarting}
          >
            {isStarting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {mode === "batch"
                  ? "Creating Batch..."
                  : mode === "auto"
                  ? "Running..."
                  : "Starting..."}
              </>
            ) : mode === "batch" ? (
              <>
                <FolderPlus className="mr-2 h-4 w-4" />
                Create Batch
              </>
            ) : mode === "auto" ? (
              <>
                <Bot className="mr-2 h-4 w-4" />
                Run Auto
              </>
            ) : (
              "Start Conversation"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
