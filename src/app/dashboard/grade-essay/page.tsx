'use client'

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { gradeEssayWithAI, GradeEssayWithAIOutput } from "@/ai/flows/grade-essay-with-ai"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Textarea } from "@/components/ui/textarea"
import { Loader2 } from "lucide-react"

const formSchema = z.object({
  essayContent: z.string().min(50, "Essay must be at least 50 characters."),
  rubric: z.string().min(20, "Rubric must be at least 20 characters."),
})

export default function GradeEssayPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<GradeEssayWithAIOutput | null>(null);
  const [error, setError] = useState<string | null>(null);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      essayContent: "",
      rubric: "- Clarity and coherence (40%)\n- Use of evidence (30%)\n- Grammar and style (30%)",
    },
  })

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true);
    setResult(null);
    setError(null);
    try {
      const apiResult = await gradeEssayWithAI(values);
      setResult(apiResult);
    } catch (e) {
      setError("Failed to grade essay. Please try again.");
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="grid gap-8 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>AI Essay Grading Assistant</CardTitle>
          <CardDescription>Enter the essay and the grading rubric below.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField control={form.control} name="essayContent" render={({ field }) => (
                <FormItem>
                  <FormLabel>Essay Content</FormLabel>
                  <FormControl><Textarea placeholder="Paste the student's essay here..." {...field} rows={12} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="rubric" render={({ field }) => (
                <FormItem>
                  <FormLabel>Grading Rubric</FormLabel>
                  <FormControl><Textarea placeholder="Define the grading criteria..." {...field} rows={6} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Grade with AI
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      <div>
        {isLoading && (
          <div className="flex h-full min-h-[50vh] items-center justify-center rounded-lg border-2 border-dashed">
            <div className="flex flex-col items-center gap-4">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
              <p className="text-muted-foreground">AI is reading and grading...</p>
            </div>
          </div>
        )}
        {error && (
          <div className="flex h-full min-h-[50vh] items-center justify-center rounded-lg border-2 border-dashed border-destructive text-destructive">{error}</div>
        )}
        {result && (
          <div className="space-y-8">
            <Card>
              <CardHeader>
                <CardTitle>Result</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-5xl font-bold font-headline text-primary">{result.grade}</p>
                <p className="text-sm text-muted-foreground mt-2">Overall Grade</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Feedback</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="prose prose-sm max-w-none text-foreground space-y-4">
                    {result.feedback.split('\n').map((line, i) => <p key={i}>{line}</p>)}
                </div>
              </CardContent>
            </Card>
          </div>
        )}
        {!isLoading && !result && !error && (
          <div className="flex h-full min-h-[50vh] items-center justify-center rounded-lg border-2 border-dashed">
            <p className="text-center text-muted-foreground">Grading results will appear here.</p>
          </div>
        )}
      </div>
    </div>
  )
}
