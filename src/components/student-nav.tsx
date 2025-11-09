
'use client'

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  BookCopy,
  Waypoints,
  Store,
  Award,
  History,
  LifeBuoy,
  Users,
} from "lucide-react"

import {
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from "@/components/ui/sidebar"

const navItems = [
    { href: "/student-dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/student-dashboard/my-courses", label: "My Courses", icon: BookCopy },
    { href: "/student-dashboard/community", label: "Community", icon: Users },
    { href: "/student-dashboard/my-roadmap", label: "My Roadmap", icon: Waypoints },
    { href: "/student-dashboard/marketplace", label: "Marketplace", icon: Store },
    { href: "/student-dashboard/my-qualifications", label: "My Qualifications", icon: Award },
    { href: "/student-dashboard/my-history", label: "My History", icon: History },
    { href: "/student-dashboard/faqs", label: "FAQs", icon: LifeBuoy },
]

export function StudentNav() {
  const pathname = usePathname()

  const isActive = (href: string) => {
    if (href === "/student-dashboard") {
      return pathname === href;
    }
    return pathname.startsWith(href);
  }

  return (
    <SidebarMenu>
      {navItems.map((item) => (
        <SidebarMenuItem key={item.href}>
          <SidebarMenuButton
            asChild
            href={item.href}
            isActive={isActive(item.href)}
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
