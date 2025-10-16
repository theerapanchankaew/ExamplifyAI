
'use client';

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
import { BookA } from "lucide-react"
import { CartProvider } from "@/context/cart-context"
import { CartButton } from "@/components/cart-button";
import { UserTokens } from "@/components/user-tokens";


export default function StudentDashboardLayout({ children }: { children: ReactNode }) {
  return (
    <CartProvider>
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
                <CartButton />
                <UserTokens />
            <UserNav />
            </header>
            <main className="flex-1 p-4 md:p-8 bg-muted/30">
            {children}
            </main>
        </SidebarInset>
        </SidebarProvider>
    </CartProvider>
  )
}
