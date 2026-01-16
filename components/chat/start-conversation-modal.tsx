"use client";

import * as React from "react";
import { Loader2, Bot, User } from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import { useSetType } from "@/components/set-type-provider";
import type { Student, Topic } from "@/lib/types";

interface StartConversationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConversationStarted: (conversationId: string) => void;
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

export function StartConversationModal({
  open,
  onOpenChange,
  onConversationStarted,
  initialStudentId,
  initialTopicId,
}: StartConversationModalProps) {
  const { setType } = useSetType();
  const [mode, setMode] = React.useState<"manual" | "auto">("manual");
  const [students, setStudents] = React.useState<Student[]>([]);
  const [topics, setTopics] = React.useState<Topic[]>([]);
  const [selectedStudentId, setSelectedStudentId] = React.useState<string>("");
  const [selectedTopicId, setSelectedTopicId] = React.useState<string>("");
  const [isLoadingStudents, setIsLoadingStudents] = React.useState(false);
  const [isLoadingTopics, setIsLoadingTopics] = React.useState(false);
  const [isStarting, setIsStarting] = React.useState(false);

  // Auto mode fields
  const [systemPrompt, setSystemPrompt] = React.useState(DEFAULT_SYSTEM_PROMPT);
  const [initialMessage, setInitialMessage] = React.useState(
    DEFAULT_INITIAL_MESSAGE
  );

  // Reset state when modal opens/closes
  React.useEffect(() => {
    if (open) {
      setSelectedStudentId(initialStudentId || "");
      setSelectedTopicId(initialTopicId || "");
      setMode("manual");
      setSystemPrompt(DEFAULT_SYSTEM_PROMPT);
      setInitialMessage(DEFAULT_INITIAL_MESSAGE);
    }
  }, [open, initialStudentId, initialTopicId]);

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

  // Clear topic selection when student changes (unless it's the initial load)
  React.useEffect(() => {
    if (selectedStudentId !== initialStudentId) {
      setSelectedTopicId("");
    }
  }, [selectedStudentId, initialStudentId]);

  const handleStartConversation = async () => {
    if (!selectedStudentId || !selectedTopicId) return;

    setIsStarting(true);
    try {
      if (mode === "manual") {
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
      } else {
        // Auto mode
        if (!systemPrompt.trim() || !initialMessage.trim()) {
          throw new Error(
            "System prompt and initial message are required for auto mode"
          );
        }

        toast.info("Starting auto conversation... This may take a minute.");

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
        toast.success("Auto conversation completed!");
        onConversationStarted(data.id);
      }

      onOpenChange(false);
    } catch (error) {
      console.error("Error starting conversation:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to start conversation"
      );
    } finally {
      setIsStarting(false);
    }
  };

  const selectedStudent = students.find((s) => s.id === selectedStudentId);
  const selectedTopic = topics.find((t) => t.id === selectedTopicId);

  const canStart =
    selectedStudentId &&
    selectedTopicId &&
    (mode === "manual" || (systemPrompt.trim() && initialMessage.trim()));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Start New Conversation</DialogTitle>
          <DialogDescription>
            Select a student and topic, then choose manual or auto tutoring.
          </DialogDescription>
        </DialogHeader>

        <Tabs
          value={mode}
          onValueChange={(v) => setMode(v as "manual" | "auto")}
        >
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="manual" className="flex items-center gap-2">
              <User className="h-4 w-4" />
              Manual
            </TabsTrigger>
            <TabsTrigger value="auto" className="flex items-center gap-2">
              <Bot className="h-4 w-4" />
              Auto (AI)
            </TabsTrigger>
          </TabsList>

          <div className="space-y-4 py-4">
            {/* Student/Topic selection - shared */}
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
                disabled={!selectedStudentId || isLoadingTopics || isStarting}
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
                <Label htmlFor="system-prompt">System Prompt</Label>
                <Textarea
                  id="system-prompt"
                  value={systemPrompt}
                  onChange={(e) => setSystemPrompt(e.target.value)}
                  placeholder="Instructions for the AI tutor..."
                  className="min-h-[160px] resize-y text-sm font-mono"
                  disabled={isStarting}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="initial-message">First Message</Label>
                <Textarea
                  id="initial-message"
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
                    ends. This may take a minute.
                  </p>
                </div>
              )}
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
                {mode === "auto" ? "Running..." : "Starting..."}
              </>
            ) : mode === "auto" ? (
              <>
                <Bot className="mr-2 h-4 w-4" />
                Run Auto Conversation
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
