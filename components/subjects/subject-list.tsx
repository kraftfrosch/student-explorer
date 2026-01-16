"use client"

import * as React from "react"
import { toast } from "sonner"
import { BookOpen, ChevronDown } from "lucide-react"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import type { Subject, Topic } from "@/lib/types"

export function SubjectList() {
  const [subjects, setSubjects] = React.useState<Subject[]>([])
  const [topicsMap, setTopicsMap] = React.useState<Record<string, Topic[]>>({})
  const [loadingTopics, setLoadingTopics] = React.useState<Record<string, boolean>>({})
  const [isLoading, setIsLoading] = React.useState(true)

  // Fetch subjects on mount
  React.useEffect(() => {
    async function fetchSubjects() {
      try {
        const response = await fetch("/api/subjects")
        if (!response.ok) throw new Error("Failed to fetch subjects")
        const data = await response.json()
        setSubjects(data.subjects)
      } catch (error) {
        console.error("Error fetching subjects:", error)
        toast.error("Failed to load subjects")
      } finally {
        setIsLoading(false)
      }
    }
    fetchSubjects()
  }, [])

  // Fetch topics for a subject
  const fetchTopicsForSubject = React.useCallback(async (subjectId: string) => {
    if (topicsMap[subjectId] || loadingTopics[subjectId]) return
    
    setLoadingTopics((prev) => ({ ...prev, [subjectId]: true }))
    try {
      const response = await fetch(`/api/topics?subject_id=${subjectId}`)
      if (!response.ok) throw new Error("Failed to fetch topics")
      const data = await response.json()
      setTopicsMap((prev) => ({ ...prev, [subjectId]: data.topics }))
    } catch (error) {
      console.error("Error fetching topics:", error)
      toast.error("Failed to load topics")
    } finally {
      setLoadingTopics((prev) => ({ ...prev, [subjectId]: false }))
    }
  }, [topicsMap, loadingTopics])

  // Pre-fetch topics for all subjects
  React.useEffect(() => {
    subjects.forEach((subject) => {
      fetchTopicsForSubject(subject.id)
    })
  }, [subjects, fetchTopicsForSubject])

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-20 w-full" />
        ))}
      </div>
    )
  }

  if (subjects.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <p className="text-lg font-medium">No subjects found</p>
        <p className="text-sm text-muted-foreground">
          The API returned no subjects
        </p>
      </div>
    )
  }

  return (
    <Accordion type="multiple" className="space-y-4">
      {subjects.map((subject) => {
        const topics = topicsMap[subject.id] || []
        const isLoadingSubjectTopics = loadingTopics[subject.id]

        return (
          <AccordionItem
            key={subject.id}
            value={subject.id}
            className="rounded-lg border bg-card"
          >
            <AccordionTrigger className="px-4 py-3 hover:no-underline [&[data-state=open]>div>svg:last-child]:rotate-180">
              <div className="flex w-full items-center justify-between pr-2">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <BookOpen className="h-5 w-5" />
                  </div>
                  <span className="text-lg font-semibold">{subject.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  {!isLoadingSubjectTopics && (
                    <Badge variant="secondary">
                      {topics.length} topic{topics.length !== 1 ? "s" : ""}
                    </Badge>
                  )}
                  <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200" />
                </div>
              </div>
            </AccordionTrigger>
            <AccordionContent className="px-4 pb-4">
              {isLoadingSubjectTopics ? (
                <div className="flex items-center justify-center py-4">
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                </div>
              ) : topics.length === 0 ? (
                <p className="py-4 text-center text-sm text-muted-foreground">
                  No topics available for this subject
                </p>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  {topics.map((topic) => (
                    <Card key={topic.id} className="bg-muted/30">
                      <CardHeader className="p-4 pb-2">
                        <CardTitle className="text-base">{topic.name}</CardTitle>
                      </CardHeader>
                      <CardContent className="p-4 pt-0">
                        <p className="text-sm text-muted-foreground">
                          Grade {topic.grade_level}
                        </p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </AccordionContent>
          </AccordionItem>
        )
      })}
    </Accordion>
  )
}
