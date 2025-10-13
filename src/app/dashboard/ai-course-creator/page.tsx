'use client'

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { generateCourseFromTopic, GenerateCourseFromTopicOutput } from "@/ai/flows/generate-course-from-topic"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Slider } from "@/components/ui/slider"
import { Textarea } from "@/components/ui/textarea"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Loader2 } from "lucide-react"

const formSchema = z.object({
  topic: z.string().min(3, "Topic must be at least 3 characters long."),
  syllabus: z.string().min(10, "Syllabus must be at least 10 characters long."),
  difficulty: z.enum(['Beginner', 'Intermediate', 'Expert']),
  mcqCount: z.coerce.number().int().min(1).max(10),
  essayCount: z.coerce.number().int().min(0).max(5),
  creativity: z.number().min(0).max(1),
})

export default function AiCourseCreatorPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [course, setCourse] = useState<GenerateCourseFromTopicOutput | null>(null);
  const [error, setError] = useState<string | null>(null);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      topic: "",
      syllabus: "",
      difficulty: "Beginner",
      mcqCount: 5,
      essayCount: 2,
      creativity: 0.5,
    },
  })

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true);
    setCourse(null);
    setError(null);
    try {
      const result = await generateCourseFromTopic(values);
      setCourse(result);
    } catch (e) {
      setError("Failed to generate course. Please try again.");
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="grid gap-8 lg:grid-cols-3">
      <div className="lg:col-span-1">
        <Card>
          <CardHeader>
            <CardTitle>AI Course Creator</CardTitle>
            <CardDescription>Generate a course outline and lessons using AI.</CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField control={form.control} name="topic" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Topic</FormLabel>
                    <FormControl><Input placeholder="e.g., ISO 9001 Quality Management" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="syllabus" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Syllabus</FormLabel>
                    <FormControl><Textarea placeholder="- Introduction to ISO 9001&#10;- Key principles&#10;- Implementation steps" {...field} rows={4} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="difficulty" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Difficulty</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl><SelectTrigger><SelectValue placeholder="Select difficulty" /></SelectTrigger></FormControl>
                      <SelectContent>
                        <SelectItem value="Beginner">Beginner</SelectItem>
                        <SelectItem value="Intermediate">Intermediate</SelectItem>
                        <SelectItem value="Expert">Expert</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="mcqCount" render={({ field }) => (
                    <FormItem>
                      <FormLabel>MCQs</FormLabel>
                      <FormControl><Input type="number" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="essayCount" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Essays</FormLabel>
                      <FormControl><Input type="number" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
                <FormField control={form.control} name="creativity" render={({ field: { value, onChange } }) => (
                  <FormItem>
                    <FormLabel>Creativity: {value?.toFixed(1)}</FormLabel>
                    <FormControl><Slider defaultValue={[value]} min={0} max={1} step={0.1} onValueChange={(vals) => onChange(vals[0])} /></FormControl>
                    <FormDescription>Higher values produce more creative content.</FormDescription>
                  </FormItem>
                )} />

                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Generate Course
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
      <div className="lg:col-span-2">
        {isLoading && (
          <div className="flex h-full min-h-[50vh] items-center justify-center rounded-lg border-2 border-dashed">
            <div className="flex flex-col items-center gap-4">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
              <p className="text-muted-foreground">Generating your course... this may take a moment.</p>
            </div>
          </div>
        )}
        {error && (
            <div className="flex h-full min-h-[50vh] items-center justify-center rounded-lg border-2 border-dashed border-destructive text-destructive">
                {error}
            </div>
        )}
        {course && (
          <Card>
            <CardHeader>
              <CardTitle className="font-headline text-2xl">{course.title}</CardTitle>
              <CardDescription className="pt-2">{course.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <h3 className="mb-4 text-lg font-semibold font-headline">Lessons</h3>
              <Accordion type="single" collapsible className="w-full">
                {course.lessons.map((lesson, index) => (
                  <AccordionItem value={`item-${index}`} key={index}>
                    <AccordionTrigger>{lesson.title}</AccordionTrigger>
                    <AccordionContent>
                      <div className="prose prose-sm max-w-none text-foreground" dangerouslySetInnerHTML={{ __html: lesson.content.replace(/\n/g, '<br />') }} />
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </CardContent>
          </Card>
        )}
        {!isLoading && !course && !error && (
            <div className="flex h-full min-h-[50vh] items-center justify-center rounded-lg border-2 border-dashed">
                <p className="text-center text-muted-foreground">Your generated course will appear here.</p>
            </div>
        )}
      </div>
    </div>
  )
}
