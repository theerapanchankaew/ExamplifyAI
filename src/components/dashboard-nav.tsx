'use client'

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  BotMessageSquare,
  BookOpen,
  BookMarked,
  Waypoints,
  Calendar,
  Book,
  Users,
  BarChart3,
  GraduationCap,
  PlusCircle,
  Library,
} from "lucide-react"

import {
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from "@/components/ui/sidebar"

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/dashboard/add-course", label: "Add Course", icon: PlusCircle },
  { href: "/dashboard/courses", label: "Courses", icon: Library },
  { href: "/dashboard/course-creator", label: "Course Creator", icon: BookOpen },
  { href: "/dashboard/master-course-creator", label: "Master Courses", icon: BookMarked },
  { href: "/dashboard/roadmap-creator", label: "Roadmaps", icon: Waypoints },
  { href: "/dashboard/scheduler", label: "Scheduler", icon: Calendar },
  { href: "/dashboard/lessons", label: "Lessons", icon: Book },
  { href: "/dashboard/users", label: "Users", icon: Users },
  { href: "/dashboard/reports", label: "Reports", icon: BarChart3 },
  { href: "/dashboard/grade-essay", label: "Grade Essay (AI)", icon: GraduationCap },
]

export function DashboardNav() {
  const pathname = usePathname()

  return (
    <SidebarMenu>
      {navItems.map((item) => (
        <SidebarMenuItem key={item.href}>
          <SidebarMenuButton
            asChild
            href={item.href}
            isActive={pathname.startsWith(item.href) && (item.href === '/dashboard' ? pathname === item.href : true) }
            tooltip={{ children: item.label }}
          >
            <Link href={item.href}>
              <item.icon />
              <span>{item.label}</span>
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>
      ))}
    </SidebarMenu>
  )
}
