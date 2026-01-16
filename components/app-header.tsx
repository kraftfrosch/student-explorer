"use client";

import { SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { useSetType } from "@/components/set-type-provider";
import { cn } from "@/lib/utils";

interface AppHeaderProps {
  title: string;
  children?: React.ReactNode;
}

const setTypeColors: Record<string, string> = {
  mini_dev: "bg-emerald-500/10 border-emerald-500/30",
  dev: "bg-amber-500/10 border-amber-500/30",
  eval: "bg-red-500/10 border-red-500/30",
};

const setTypeAccent: Record<string, string> = {
  mini_dev: "text-emerald-600",
  dev: "text-amber-600",
  eval: "text-red-600",
};

export function AppHeader({ title, children }: AppHeaderProps) {
  const { setType } = useSetType();

  return (
    <header
      className={cn(
        "flex h-14 shrink-0 items-center gap-2 border-b px-4 transition-colors duration-200",
        setTypeColors[setType]
      )}
    >
      <SidebarTrigger className="-ml-1" />
      <Separator orientation="vertical" className="mr-2 h-4" />
      <h1 className={cn("text-lg font-semibold", setTypeAccent[setType])}>
        {title}
      </h1>
      {children}
    </header>
  );
}
