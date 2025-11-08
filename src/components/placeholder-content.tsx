import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import type { LucideIcon } from "lucide-react";
import type { ReactNode, ElementType } from "react";
import {isValidElement} from "react";

export function PlaceholderContent({ title, description, icon: Icon }: { title: string, description?: string, icon?: ReactNode | LucideIcon | ElementType }) {
  
  const renderIcon = () => {
    if (!Icon) return null;

    if (isValidElement(Icon)) {
      return Icon;
    }
    
    const IconComponent = Icon as ElementType;
    return <IconComponent className="mx-auto h-12 w-12 text-muted-foreground" />;
  }

  return (
    <div className="flex h-[50vh] w-full items-center justify-center rounded-lg border-2 border-dashed">
        <div className="text-center">
            {renderIcon()}
            <h2 className="mt-4 text-2xl font-bold font-headline tracking-tight">{title}</h2>
            <p className="mt-2 text-muted-foreground">{description ?? "This feature is coming soon."}</p>
        </div>
    </div>
  )
}
