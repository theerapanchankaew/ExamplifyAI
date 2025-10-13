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
  GraduationCap
} from "lucide-react"

import {
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from "@/components/ui/sidebar"

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/dashboard/ai-course-creator", label: "AI Course Creator", icon: BotMessageSquare },
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
          <Link href={item.href} passHref>
            <SidebarMenuButton
              as="a"
              isActive={pathname.startsWith(item.href) && (item.href === '/dashboard' ? pathname === item.href : true) }
              tooltip={{ children: item.label }}
            >
              <item.icon />
              <span>{item.label}</span>
            </SidebarMenuButton>
          </Link>
        </SidebarMenuItem>
      ))}
    </SidebarMenu>
  )
}
