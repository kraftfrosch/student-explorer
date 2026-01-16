"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { StudentCard } from "./student-card"
import { Skeleton } from "@/components/ui/skeleton"
import { useSetType } from "@/components/set-type-provider"
import type { Student, Topic } from "@/lib/types"

export function StudentList() {
  const router = useRouter()
  const { setType } = useSetType()
  const [students, setStudents] = React.useState<Student[]>([])
  const [topicsMap, setTopicsMap] = React.useState<Record<string, Topic[]>>({})
  const [loadingTopics, setLoadingTopics] = React.useState<Record<string, boolean>>({})
  const [isLoading, setIsLoading] = React.useState(true)

  // Fetch students when setType changes
  React.useEffect(() => {
    async function fetchStudents() {
      setIsLoading(true)
      try {
        const response = await fetch(`/api/students?set_type=${setType}`)
        if (!response.ok) throw new Error("Failed to fetch students")
        const data = await response.json()
        setStudents(data.students)
        setTopicsMap({})
      } catch (error) {
        console.error("Error fetching students:", error)
        toast.error("Failed to load students")
      } finally {
        setIsLoading(false)
      }
    }
    fetchStudents()
  }, [setType])

  // Fetch topics for a student when they expand their card
  const fetchTopicsForStudent = React.useCallback(async (studentId: string) => {
    if (topicsMap[studentId] || loadingTopics[studentId]) return
    
    setLoadingTopics((prev) => ({ ...prev, [studentId]: true }))
    try {
      const response = await fetch(`/api/students/${studentId}/topics`)
      if (!response.ok) throw new Error("Failed to fetch topics")
      const data = await response.json()
      setTopicsMap((prev) => ({ ...prev, [studentId]: data.topics }))
    } catch (error) {
      console.error("Error fetching topics:", error)
      toast.error("Failed to load topics")
    } finally {
      setLoadingTopics((prev) => ({ ...prev, [studentId]: false }))
    }
  }, [topicsMap, loadingTopics])

  // Pre-fetch topics when students are loaded
  React.useEffect(() => {
    students.forEach((student) => {
      fetchTopicsForStudent(student.id)
    })
  }, [students, fetchTopicsForStudent])

  const handleStartConversation = (studentId: string, topicId: string) => {
    // Navigate to chat with pre-selected student and topic
    router.push(`/chat?student=${studentId}&topic=${topicId}`)
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>
    )
  }

  if (students.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <p className="text-lg font-medium">No students found</p>
        <p className="text-sm text-muted-foreground">
          Try selecting a different student set
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {students.map((student) => (
        <StudentCard
          key={student.id}
          student={student}
          topics={topicsMap[student.id] || []}
          isLoadingTopics={loadingTopics[student.id] || false}
          onStartConversation={handleStartConversation}
        />
      ))}
    </div>
  )
}
