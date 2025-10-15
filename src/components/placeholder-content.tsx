import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

export function PlaceholderContent({ title, description, icon: Icon }: { title: string, description?: string, icon?: ReactNode | LucideIcon }) {
  
  const IconComponent = Icon as LucideIcon;

  return (
    <div className="flex h-[50vh] w-full items-center justify-center rounded-lg border-2 border-dashed">
        <div className="text-center">
            {Icon && <IconComponent className="mx-auto h-12 w-12 text-muted-foreground" />}
            <h2 className="mt-4 text-2xl font-bold font-headline tracking-tight">{title}</h2>
            <p className="mt-2 text-muted-foreground">{description ?? "This feature is coming soon."}</p>
        </div>
    </div>
  )
}
