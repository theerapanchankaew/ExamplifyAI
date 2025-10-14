'use client'

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { generateCourseFromTopic, GenerateCourseFromTopicOutput } from "@/ai/flows/generate-course-from-topic"
import { useFirestore } from "@/firebase"
import { collection, writeBatch, doc } from "firebase/firestore"
import { useToast } from "@/hooks/use-toast"
import { errorEmitter } from "@/firebase/error-emitter"
import { FirestorePermissionError } from "@/firebase/errors"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Slider } from "@/components/ui/slider"
import { Textarea } from "@/components/ui/textarea"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Loader2, Save, Wand2 } from "lucide-react"

const formSchema = z.object({
  topic: z.string().min(3, "Topic must be at least 3 characters long."),
  syllabus: z.string().min(10, "Syllabus must be at least 10 characters long."),
  difficulty: z.enum(['Beginner', 'Intermediate', 'Expert']),
  mcqCount: z.coerce.number().int().min(1).max(10),
  essayCount: z.coerce.number().int().min(0).max(5),
  creativity: z.number().min(0).max(1),
})

function generateCourseCode(topic: string): string {
    // Remove common words and special characters
    const cleanTopic = topic.toLowerCase()
      .replace(/\b(introduction to|quality|management|system)\b/g, '')
      .replace(/[^a-z0-9\s]/g, '');
  
    // Take the first letters of the remaining words and numbers
    const parts = cleanTopic.split(' ').filter(Boolean);
    const code = parts.map(part => {
      if (isNaN(parseInt(part))) {
        return part.charAt(0);
      }
      return part;
    }).join('').toUpperCase();
  
    return code || 'GEN'; // Fallback code
  }
  

export default function AiCourseCreatorPage() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [course, setCourse] = useState<GenerateCourseFromTopicOutput | null>(null);
  const [error, setError] = useState<string | null>(null);
  const firestore = useFirestore();
  const { toast } = useToast();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      topic: "",
      syllabus: "",
      difficulty: "Beginner",
      mcqCount: 5,
      essayCount: 1,
      creativity: 0.5,
    },
  })

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsGenerating(true);
    setCourse(null);
    setError(null);
    try {
      const result = await generateCourseFromTopic(values);
      setCourse(result);
    } catch (e) {
      setError("Failed to generate course. Please try again.");
      console.error(e);
    } finally {
      setIsGenerating(false);
    }
  }

  async function handleSaveCourse() {
    if (!course || !firestore) return;
    setIsSaving(true);
  
    try {
      const batch = writeBatch(firestore);
      const difficulty = form.getValues('difficulty');
      const topic = form.getValues('topic');
      const courseCode = generateCourseCode(topic);
  
      // 1. Create Course Ref
      const courseRef = doc(collection(firestore, "courses"));
  
      // 2. Create and batch write all general Questions for the main exam
      const questionIds = course.questions.map((q) => {
        const questionRef = doc(collection(firestore, "questions"));
        batch.set(questionRef, {
          stem: q.stem,
          options: q.options,
          correctAnswer: q.answer,
          difficulty: q.difficulty,
          id: questionRef.id,
        });
        return questionRef.id;
      });
  
      // 3. Prepare lessons and their related quizzes/questions
      course.lessons.forEach((lessonData) => {
        const lessonRef = doc(collection(firestore, "lessons"));
        let quizId: string | null = null;
  
        if (lessonData.quiz && lessonData.quiz.length > 0) {
          const quizRef = doc(collection(firestore, "quizzes"));
          quizId = quizRef.id;
  
          const quizQuestionIds = lessonData.quiz.map((quizItem) => {
            const quizQuestionRef = doc(collection(firestore, "questions"));
            batch.set(quizQuestionRef, {
              stem: quizItem.stem,
              options: quizItem.options,
              correctAnswer: quizItem.answer,
              difficulty: difficulty,
              id: quizQuestionRef.id,
            });
            return quizQuestionRef.id;
          });
  
          batch.set(quizRef, {
            id: quizRef.id,
            questionIds: quizQuestionIds,
          });
        }
  
        batch.set(lessonRef, {
          id: lessonRef.id,
          courseId: courseRef.id,
          title: lessonData.title,
          content: lessonData.content,
          ...(quizId && { quizId: quizId }),
        });
      });
  
      // 4. Batch write the main exam document
      const examRef = doc(collection(firestore, "exams"));
      batch.set(examRef, {
        id: examRef.id,
        courseId: courseRef.id,
        questionIds: questionIds,
        blueprint: `Exam for ${course.title}`,
      });
  
      // 5. Batch write the main course document
      batch.set(courseRef, {
        id: courseRef.id,
        title: course.title,
        description: course.description,
        difficulty: difficulty,
        competency: topic,
        courseCode: courseCode,
      });
  
      // 6. Commit the entire batch
      await batch.commit();
  
      toast({
        title: "Course Saved!",
        description: `"${course.title}" has been saved successfully.`,
      });
      
      setCourse(null);
      form.reset();
  
    } catch (e: any) {
      const permissionError = new FirestorePermissionError({
        path: 'batch operation',
        operation: 'write',
        requestResourceData: course,
      });
      errorEmitter.emit('permission-error', permissionError);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="grid gap-8 lg:grid-cols-3">
      <div className="lg:col-span-1">
        <Card>
          <CardHeader>
            <CardTitle>Add Course</CardTitle>
            <CardDescription>Generate a complete course with lessons and exams using AI.</CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField control={form.control} name="topic" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Topic / Competency</FormLabel>
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
                      <FormLabel>MCQs for Exam</FormLabel>
                      <FormControl><Input type="number" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="essayCount" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Essays for Exam</FormLabel>
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

                <Button type="submit" className="w-full" disabled={isGenerating}>
                  <Wand2 className="mr-2" />
                  {isGenerating ? "Generating..." : "Generate Course with AI"}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
      <div className="lg:col-span-2">
        {isGenerating && (
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
                <div className="flex items-start justify-between gap-4">
                    <div>
                        <CardTitle className="font-headline text-2xl">{course.title}</CardTitle>
                        <CardDescription className="pt-2">{course.description}</CardDescription>
                    </div>
                    <Button onClick={handleSaveCourse} disabled={isSaving} size="lg">
                        {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                        Save Course
                    </Button>
                </div>
            </CardHeader>
            <CardContent>
              <h3 className="mb-4 text-lg font-semibold font-headline">Lessons</h3>
              <Accordion type="single" collapsible className="w-full">
                {course.lessons.map((lesson, index) => (
                  <AccordionItem value={`item-${index}`} key={index}>
                    <AccordionTrigger>{lesson.title}</AccordionTrigger>

                    <AccordionContent>
                      <div className="prose prose-sm max-w-none text-foreground" dangerouslySetInnerHTML={{ __html: lesson.content.replace(/\n/g, '<br />') }} />
                      {lesson.quiz && lesson.quiz.length > 0 && (
                        <div className="mt-4 rounded-md border p-4">
                          <h4 className="font-semibold text-sm mb-3">Lesson Quiz</h4>
                          <ul className="list-decimal pl-5 space-y-3 text-sm">
                            {lesson.quiz.map((q, i) => (
                              <li key={i}>
                                <p className="font-medium">{q.stem}</p>
                                <ul className="list-disc pl-5 mt-2 space-y-1">
                                  {q.options.map((opt, j) => (
                                    <li key={j} className={opt === q.answer ? 'font-bold text-primary' : ''}>
                                      {opt}
                                      {opt === q.answer && ' (Correct Answer)'}
                                    </li>
                                  ))}
                                </ul>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </CardContent>
          </Card>
        )}
        {!isGenerating && !course && !error && (
            <div className="flex h-full min-h-[50vh] items-center justify-center rounded-lg border-2 border-dashed">
                <div className="text-center text-muted-foreground">
                    <Wand2 className="mx-auto h-12 w-12" />
                    <h3 className="mt-4 text-lg font-semibold">Ready to build a course?</h3>
                    <p className="mt-1 max-w-sm mx-auto">Fill out the form on the left to generate a new course outline, complete with lessons and exam questions, all powered by AI.</p>
                </div>
            </div>
        )}
      </div>
    </div>
  )
}
