import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"

export function PlaceholderContent({ title, description }: { title: string, description?: string }) {
  return (
    <div className="flex h-[50vh] w-full items-center justify-center rounded-lg border-2 border-dashed">
        <div className="text-center">
            <h2 className="text-2xl font-bold font-headline tracking-tight">{title}</h2>
            <p className="mt-2 text-muted-foreground">{description ?? "This feature is coming soon."}</p>
        </div>
    </div>
  )
}
