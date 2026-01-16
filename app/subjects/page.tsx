import { AppHeader } from "@/components/app-header"
import { SubjectList } from "@/components/subjects/subject-list"

export default function SubjectsPage() {
  return (
    <div className="flex h-full flex-col">
      <AppHeader title="Subjects" />
      
      <main className="flex-1 overflow-auto p-6">
        <div className="mx-auto max-w-4xl">
          <div className="mb-6">
            <p className="text-muted-foreground">
              Explore available subjects and their topics.
            </p>
          </div>
          <SubjectList />
        </div>
      </main>
    </div>
  )
}
