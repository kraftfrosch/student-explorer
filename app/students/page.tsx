import { SidebarTrigger } from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
import { StudentList } from "@/components/students/student-list"

export default function StudentsPage() {
  return (
    <div className="flex h-full flex-col">
      <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
        <SidebarTrigger className="-ml-1" />
        <Separator orientation="vertical" className="mr-2 h-4" />
        <h1 className="text-lg font-semibold">Students</h1>
      </header>
      
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
