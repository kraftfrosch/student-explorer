"use client"

import * as React from "react"
import { ChevronDown, MessageSquare, GraduationCap } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import type { Student, Topic } from "@/lib/types"

interface StudentCardProps {
  student: Student
  topics: Topic[]
  isLoadingTopics: boolean
  onStartConversation: (studentId: string, topicId: string) => void
}

export function StudentCard({ 
  student, 
  topics, 
  isLoadingTopics,
  onStartConversation 
}: StudentCardProps) {
  const [isOpen, setIsOpen] = React.useState(false)

  // Group topics by subject
  const topicsBySubject = React.useMemo(() => {
    const grouped: Record<string, Topic[]> = {}
    topics.forEach((topic) => {
      if (!grouped[topic.subject_name]) {
        grouped[topic.subject_name] = []
      }
      grouped[topic.subject_name].push(topic)
    })
    return grouped
  }, [topics])

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card className="transition-all hover:shadow-md">
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <GraduationCap className="h-5 w-5" />
                </div>
                <div>
                  <CardTitle className="text-lg">{student.name}</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Grade {student.grade_level}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary">
                  {topics.length} topic{topics.length !== 1 ? "s" : ""}
                </Badge>
                <ChevronDown
                  className={`h-4 w-4 text-muted-foreground transition-transform ${
                    isOpen ? "rotate-180" : ""
                  }`}
                />
              </div>
            </div>
          </CardHeader>
        </CollapsibleTrigger>
        
        <CollapsibleContent>
          <CardContent className="pt-0">
            {isLoadingTopics ? (
              <div className="flex items-center justify-center py-4">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              </div>
            ) : topics.length === 0 ? (
              <p className="py-4 text-center text-sm text-muted-foreground">
                No topics available for this student
              </p>
            ) : (
              <div className="space-y-4">
                {Object.entries(topicsBySubject).map(([subject, subjectTopics]) => (
                  <div key={subject}>
                    <h4 className="mb-2 text-sm font-medium text-muted-foreground">
                      {subject}
                    </h4>
                    <div className="space-y-2">
                      {subjectTopics.map((topic) => (
                        <div
                          key={topic.id}
                          className="flex items-center justify-between rounded-lg border bg-muted/30 p-3"
                        >
                          <div>
                            <p className="font-medium">{topic.name}</p>
                            <p className="text-xs text-muted-foreground">
                              Grade {topic.grade_level}
                            </p>
                          </div>
                          <Button
                            size="sm"
                            onClick={() => onStartConversation(student.id, topic.id)}
                          >
                            <MessageSquare className="mr-1 h-3 w-3" />
                            Chat
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  )
}
