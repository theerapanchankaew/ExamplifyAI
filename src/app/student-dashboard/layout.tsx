
import type { ReactNode } from "react"
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { UserNav } from "@/components/user-nav"
import { StudentNav } from "@/components/student-nav"
import { BookA, ShoppingCart } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function StudentDashboardLayout({ children }: { children: ReactNode }) {
  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarHeader>
          <div className="flex items-center gap-2 p-2">
            <BookA className="h-8 w-8 text-primary" />
            <h1 className="font-headline text-xl font-semibold">ExamplifyAI</h1>
          </div>
        </SidebarHeader>
        <SidebarContent>
          <StudentNav />
        </SidebarContent>
      </Sidebar>
      <SidebarInset>
        <header className="flex h-14 items-center gap-4 border-b bg-background/80 px-6 backdrop-blur-sm">
          <SidebarTrigger className="md:hidden" />
          <div className="flex-1">
             {/* Breadcrumbs or page title can go here */}
          </div>
          <Button variant="ghost" size="icon">
            <ShoppingCart className="h-5 w-5" />
            <span className="sr-only">Shopping Cart</span>
          </Button>
          <UserNav />
        </header>
        <main className="flex-1 p-4 md:p-8 bg-muted/30">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  )
}
