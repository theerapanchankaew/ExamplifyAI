
'use client'

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  BookOpen,
  Waypoints,
  Calendar,
  Users,
  BarChart3,
  GraduationCap,
  PlusCircle,
  Library,
  BookMarked,
  Book,
} from "lucide-react"

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from "@/components/ui/sidebar"
import { useSidebar } from "./ui/sidebar"
import { cn } from "@/lib/utils"

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  {
    label: "Course Creator",
    icon: BookOpen,
    subItems: [
      { href: "/dashboard/add-course", label: "Add Course (AI)", icon: PlusCircle },
      { href: "/dashboard/courses", label: "Courses", icon: Library },
      { href: "/dashboard/lessons", label: "Lessons", icon: Book },
      { href: "/dashboard/master-course-creator", label: "Master Courses", icon: BookMarked },
      { href: "/dashboard/roadmap-creator", label: "Roadmaps", icon: Waypoints },
    ],
  },
  { href: "/dashboard/scheduler", label: "Scheduler", icon: Calendar },
  { href: "/dashboard/users", label: "Users", icon: Users },
  { href: "/dashboard/reports", label: "Reports", icon: BarChart3 },
  { href: "/dashboard/grade-essay", label: "Grade Essay (AI)", icon: GraduationCap },
]

export function DashboardNav() {
  const pathname = usePathname()
  const { state: sidebarState } = useSidebar()

  const isSubItemActive = (subItems: { href: string }[]) => {
    return subItems.some(item => pathname.startsWith(item.href))
  }

  return (
    <SidebarMenu>
      {navItems.map((item, index) =>
        item.subItems ? (
          <Collapsible key={`${item.label}-${index}`} asChild>
            <SidebarMenuItem className="group/collapsible">
              <>
                <CollapsibleTrigger asChild>
                  <SidebarMenuButton
                    variant="ghost"
                    className={cn(
                      "w-full justify-start",
                      isSubItemActive(item.subItems) &&
                        "bg-sidebar-accent text-sidebar-accent-foreground"
                    )}
                    tooltip={{ children: item.label }}
                  >
                    <item.icon />
                    <span>{item.label}</span>
                  </SidebarMenuButton>
                </CollapsibleTrigger>
                <CollapsibleContent
                  className={cn(
                    "data-[state=open]:my-1",
                    "group-data-[collapsible=icon]/sidebar-wrapper:hidden"
                  )}
                >
                  <SidebarMenu className="ml-4 border-l pl-4">
                    {item.subItems.map((subItem) => (
                      <SidebarMenuItem key={subItem.href}>
                        <SidebarMenuButton
                          asChild
                          href={subItem.href}
                          isActive={pathname.startsWith(subItem.href)}
                          size="sm"
                          variant="ghost"
                          className="w-full justify-start"
                        >
                          <Link href={subItem.href}>
                            <subItem.icon />
                            <span>{subItem.label}</span>
                          </Link>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    ))}
                  </SidebarMenu>
                </CollapsibleContent>
              </>
            </SidebarMenuItem>
          </Collapsible>
        ) : (
          <SidebarMenuItem key={item.href}>
            <SidebarMenuButton
              asChild
              href={item.href}
              isActive={
                pathname.startsWith(item.href) &&
                (item.href === "/dashboard" ? pathname === item.href : true)
              }
              tooltip={{ children: item.label }}
            >
              <Link href={item.href}>
                <item.icon />
                <span>{item.label}</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        )
      )}
    </SidebarMenu>
  )
}
