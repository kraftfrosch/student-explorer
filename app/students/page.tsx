import { AppHeader } from "@/components/app-header"
import { StudentList } from "@/components/students/student-list"

export default function StudentsPage() {
  return (
    <div className="flex h-full flex-col">
      <AppHeader title="Students" />
      
      <main className="flex-1 overflow-auto p-6">
        <div className="mx-auto max-w-4xl">
          <div className="mb-6">
            <p className="text-muted-foreground">
              Browse students and start tutoring conversations on specific topics.
            </p>
          </div>
          <StudentList />
        </div>
      </main>
    </div>
  )
}
