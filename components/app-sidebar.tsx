"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Users, BookOpen, MessageSquare, GraduationCap, Trophy } from "lucide-react"

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useSetType } from "@/components/set-type-provider"
import type { SetType } from "@/lib/types"

const navigation = [
  {
    title: "Students",
    href: "/students",
    icon: Users,
  },
  {
    title: "Subjects",
    href: "/subjects",
    icon: BookOpen,
  },
  {
    title: "Conversations",
    href: "/chat",
    icon: MessageSquare,
  },
  {
    title: "Leaderboard",
    href: "/leaderboard",
    icon: Trophy,
  },
]

const setTypeLabels: Record<SetType, string> = {
  mini_dev: "Mini Dev",
  dev: "Development",
  eval: "Evaluation",
}

export function AppSidebar() {
  const pathname = usePathname()
  const { setType, setSetType } = useSetType()

  return (
    <Sidebar>
      <SidebarHeader className="border-b border-sidebar-border">
        <div className="flex items-center gap-2 px-2 py-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <GraduationCap className="h-4 w-4" />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-semibold">Student Explorer</span>
            <span className="text-xs text-muted-foreground">Tutoring Interface</span>
          </div>
        </div>
      </SidebarHeader>
      
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Student Set</SidebarGroupLabel>
          <SidebarGroupContent className="px-2">
            <Select value={setType} onValueChange={(value) => setSetType(value as SetType)}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select set" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="mini_dev">{setTypeLabels.mini_dev}</SelectItem>
                <SelectItem value="dev">{setTypeLabels.dev}</SelectItem>
                <SelectItem value="eval">{setTypeLabels.eval}</SelectItem>
              </SelectContent>
            </Select>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navigation.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname === item.href || pathname.startsWith(item.href + "/")}
                  >
                    <Link href={item.href}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border">
        <div className="px-4 py-3">
          <p className="text-xs text-muted-foreground">
            Knowunity Agent Olympics
          </p>
        </div>
      </SidebarFooter>
      
      <SidebarRail />
    </Sidebar>
  )
}
