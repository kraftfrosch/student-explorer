"use client"

import * as React from "react"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { useSetType } from "@/components/set-type-provider"
import type { Student, Topic } from "@/lib/types"

interface StartConversationModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConversationStarted: (conversationId: string) => void
  initialStudentId?: string
  initialTopicId?: string
}

export function StartConversationModal({
  open,
  onOpenChange,
  onConversationStarted,
  initialStudentId,
  initialTopicId,
}: StartConversationModalProps) {
  const { setType } = useSetType()
  const [students, setStudents] = React.useState<Student[]>([])
  const [topics, setTopics] = React.useState<Topic[]>([])
  const [selectedStudentId, setSelectedStudentId] = React.useState<string>("")
  const [selectedTopicId, setSelectedTopicId] = React.useState<string>("")
  const [isLoadingStudents, setIsLoadingStudents] = React.useState(false)
  const [isLoadingTopics, setIsLoadingTopics] = React.useState(false)
  const [isStarting, setIsStarting] = React.useState(false)

  // Reset state when modal opens/closes
  React.useEffect(() => {
    if (open) {
      setSelectedStudentId(initialStudentId || "")
      setSelectedTopicId(initialTopicId || "")
    }
  }, [open, initialStudentId, initialTopicId])

  // Fetch students when modal opens
  React.useEffect(() => {
    if (!open) return

    async function fetchStudents() {
      setIsLoadingStudents(true)
      try {
        const response = await fetch(`/api/students?set_type=${setType}`)
        if (!response.ok) throw new Error("Failed to fetch students")
        const data = await response.json()
        setStudents(data.students)
      } catch (error) {
        console.error("Error fetching students:", error)
        toast.error("Failed to load students")
      } finally {
        setIsLoadingStudents(false)
      }
    }

    fetchStudents()
  }, [open, setType])

  // Fetch topics when student changes
  React.useEffect(() => {
    if (!selectedStudentId) {
      setTopics([])
      return
    }

    async function fetchTopics() {
      setIsLoadingTopics(true)
      try {
        const response = await fetch(`/api/students/${selectedStudentId}/topics`)
        if (!response.ok) throw new Error("Failed to fetch topics")
        const data = await response.json()
        setTopics(data.topics)
      } catch (error) {
        console.error("Error fetching topics:", error)
        toast.error("Failed to load topics")
      } finally {
        setIsLoadingTopics(false)
      }
    }

    fetchTopics()
  }, [selectedStudentId])

  // Clear topic selection when student changes (unless it's the initial load)
  React.useEffect(() => {
    if (selectedStudentId !== initialStudentId) {
      setSelectedTopicId("")
    }
  }, [selectedStudentId, initialStudentId])

  const handleStartConversation = async () => {
    if (!selectedStudentId || !selectedTopicId) return

    setIsStarting(true)
    try {
      const response = await fetch("/api/chat/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          student_id: selectedStudentId,
          topic_id: selectedTopicId,
          set_type: setType,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to start conversation")
      }

      const data = await response.json()
      toast.success("Conversation started!")
      onConversationStarted(data.id)
      onOpenChange(false)
    } catch (error) {
      console.error("Error starting conversation:", error)
      toast.error(error instanceof Error ? error.message : "Failed to start conversation")
    } finally {
      setIsStarting(false)
    }
  }

  const selectedStudent = students.find((s) => s.id === selectedStudentId)
  const selectedTopic = topics.find((t) => t.id === selectedTopicId)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Start New Conversation</DialogTitle>
          <DialogDescription>
            Select a student and topic to begin tutoring.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="student">Student</Label>
            <Select
              value={selectedStudentId}
              onValueChange={setSelectedStudentId}
              disabled={isLoadingStudents}
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
              disabled={!selectedStudentId || isLoadingTopics}
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

          {selectedStudent && selectedTopic && (
            <div className="rounded-lg border bg-muted/50 p-3">
              <p className="text-sm">
                <strong>Summary:</strong> Start a tutoring session with{" "}
                <strong>{selectedStudent.name}</strong> on{" "}
                <strong>{selectedTopic.name}</strong> ({selectedTopic.subject_name})
              </p>
            </div>
          )}
        </div>

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
            disabled={!selectedStudentId || !selectedTopicId || isStarting}
          >
            {isStarting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Starting...
              </>
            ) : (
              "Start Conversation"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
