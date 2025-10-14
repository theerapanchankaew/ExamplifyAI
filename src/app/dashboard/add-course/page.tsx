

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
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Slider } from "@/components/ui/slider"
import { Textarea } from "@/components/ui/textarea"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Loader2, Save, Wand2, Upload, FileJson } from "lucide-react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

// Schema for AI Generation Form
const aiFormSchema = z.object({
  topic: z.string().min(3, "Topic must be at least 3 characters long."),
  syllabus: z.string().min(10, "Syllabus must be at least 10 characters long."),
  difficulty: z.enum(['Beginner', 'Intermediate', 'Expert']),
  mcqCount: z.coerce.number().int().min(1).max(10),
  essayCount: z.coerce.number().int().min(0).max(5),
  creativity: z.number().min(0).max(1),
})

// Schema for JSON Import
const jsonQuestionSchema = z.object({
  id: z.string(),
  type: z.enum(['mcq']),
  text: z.string(),
  options: z.array(z.string()),
  answer: z.string(),
  points: z.number(),
});
const jsonImportSchema = z.object({
  title: z.string(),
  description: z.string(),
  duration: z.number(),
  price: z.number(),
  taTechnicalArea: z.string(),
  isicCode: z.string(),
  passingScore: z.number(),
  learningMaterialUrl: z.string().optional(),
  questions: z.array(jsonQuestionSchema),
});


function generateCourseCode(topic: string): string {
  const cleanTopic = topic.toLowerCase()
    .replace(/\b(introduction to|quality|management|system|an|of|the|iaf|code)\b/g, '')
    .replace(/[^a-z0-9\s]/g, '');
  
  const parts = cleanTopic.split(' ').filter(Boolean);
  if (parts.length === 0) return 'GEN';

  const code = parts.map(part => {
    if (!isNaN(parseInt(part, 10))) {
        return part;
    }
    return part.charAt(0);
  }).join('').toUpperCase();
  
  return code.substring(0, 10) || 'COURSE';
}

export default function AiCourseCreatorPage() {
  // State for AI Generation
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [course, setCourse] = useState<GenerateCourseFromTopicOutput | null>(null);
  const [generationError, setGenerationError] = useState<string | null>(null);
  
  // State for JSON Import
  const [isImporting, setIsImporting] = useState(false);
  const [jsonContent, setJsonContent] = useState('');
  const [jsonError, setJsonError] = useState<string | null>(null);

  const firestore = useFirestore();
  const { toast } = useToast();

  const aiForm = useForm<z.infer<typeof aiFormSchema>>({
    resolver: zodResolver(aiFormSchema),
    defaultValues: {
      topic: "",
      syllabus: "",
      difficulty: "Beginner",
      mcqCount: 5,
      essayCount: 1,
      creativity: 0.5,
    },
  })

  // Handler for AI course generation
  async function onAiSubmit(values: z.infer<typeof aiFormSchema>) {
    setIsGenerating(true);
    setCourse(null);
    setGenerationError(null);
    try {
      const result = await generateCourseFromTopic(values);
      setCourse(result);
    } catch (e) {
      setGenerationError("Failed to generate course. Please try again.");
      console.error(e);
    } finally {
      setIsGenerating(false);
    }
  }

  // Handler to save AI-generated course
  async function handleSaveAiCourse() {
    if (!course || !firestore) return;
    setIsSaving(true);
  
    try {
      const batch = writeBatch(firestore);
      const difficulty = aiForm.getValues('difficulty');
      const topic = aiForm.getValues('topic');
      const courseCode = generateCourseCode(topic);
  
      const courseRef = doc(collection(firestore, "courses"));
  
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
  
          batch.set(quizRef, { id: quizRef.id, questionIds: quizQuestionIds });
        }
  
        batch.set(lessonRef, {
          id: lessonRef.id,
          courseId: courseRef.id,
          title: lessonData.title,
          content: lessonData.content,
          ...(quizId && { quizId: quizId }),
        });
      });
  
      const examRef = doc(collection(firestore, "exams"));
      batch.set(examRef, {
        id: examRef.id,
        courseId: courseRef.id,
        questionIds: questionIds,
        blueprint: `Exam for ${course.title}`,
      });
  
      batch.set(courseRef, {
        id: courseRef.id,
        title: course.title,
        description: course.description,
        difficulty: difficulty,
        competency: topic,
        courseCode: courseCode,
      });
  
      await batch.commit();
  
      toast({
        title: "Course Saved!",
        description: `"${course.title}" has been saved successfully.`,
      });
      
      setCourse(null);
      aiForm.reset();
  
    } catch (e: any) {
      errorEmitter.emit('permission-error', new FirestorePermissionError({
        path: 'batch operation',
        operation: 'write',
        requestResourceData: course,
      }));
    } finally {
      setIsSaving(false);
    }
  }

  // Handler for file upload
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result;
        setJsonContent(text as string);
      };
      reader.readAsText(file);
    }
  };

  // Handler for importing course from JSON
  async function handleJsonImport() {
    setIsImporting(true);
    setJsonError(null);

    try {
      const jsonData = JSON.parse(jsonContent);
      const parsedData = jsonImportSchema.parse(jsonData);
      
      if (!firestore) {
          throw new Error("Firestore is not initialized.");
      }

      const batch = writeBatch(firestore);
      const courseRef = doc(collection(firestore, "courses"));

      const questionIds = parsedData.questions.map((q) => {
          const questionRef = doc(collection(firestore, "questions"));
          batch.set(questionRef, {
              id: questionRef.id,
              stem: q.text,
              options: q.options,
              correctAnswer: q.answer,
              difficulty: "Expert", // Or derive from data if available
          });
          return questionRef.id;
      });

      const examRef = doc(collection(firestore, "exams"));
      batch.set(examRef, {
          id: examRef.id,
          courseId: courseRef.id,
          questionIds: questionIds,
          blueprint: `Exam for ${parsedData.title}`,
          duration: parsedData.duration,
          passingScore: parsedData.passingScore,
      });

      batch.set(courseRef, {
          id: courseRef.id,
          title: parsedData.title,
          description: parsedData.description,
          difficulty: "Expert", // Or derive from data
          competency: parsedData.taTechnicalArea,
          courseCode: generateCourseCode(parsedData.taTechnicalArea),
      });

      await batch.commit();

      toast({
        title: "Import Successful!",
        description: `Course "${parsedData.title}" has been created.`,
      });
      setJsonContent('');

    } catch (e: any) {
      if (e instanceof z.ZodError) {
        setJsonError("JSON validation failed: " + e.errors.map(err => `${err.path.join('.')} - ${err.message}`).join(', '));
      } else if (e instanceof SyntaxError) {
        setJsonError("Invalid JSON format: " + e.message);
      } else {
        setJsonError("An error occurred during import: " + e.message);
        errorEmitter.emit('permission-error', new FirestorePermissionError({
            path: 'batch operation (JSON import)',
            operation: 'write',
            requestResourceData: { json: jsonContent },
        }));
      }
      console.error(e);
    } finally {
      setIsImporting(false);
    }
  }

  return (
    <Tabs defaultValue="ai-generator" className="w-full">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="ai-generator"><Wand2 className="mr-2" /> Generate with AI</TabsTrigger>
        <TabsTrigger value="json-import"><FileJson className="mr-2" /> Import from JSON</TabsTrigger>
      </TabsList>
      
      {/* AI Generator Tab */}
      <TabsContent value="ai-generator">
        <div className="grid gap-8 lg:grid-cols-3 mt-4">
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle>AI Course Generator</CardTitle>
                <CardDescription>Generate a course with lessons and exams using AI.</CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...aiForm}>
                  <form onSubmit={aiForm.handleSubmit(onAiSubmit)} className="space-y-6">
                    <FormField control={aiForm.control} name="topic" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Topic / Competency</FormLabel>
                        <FormControl><Input placeholder="e.g., ISO 9001 Quality Management" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={aiForm.control} name="syllabus" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Syllabus</FormLabel>
                        <FormControl><Textarea placeholder="- Introduction to ISO 9001&#10;- Key principles&#10;- Implementation steps" {...field} rows={4} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={aiForm.control} name="difficulty" render={({ field }) => (
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
                      <FormField control={aiForm.control} name="mcqCount" render={({ field }) => (
                        <FormItem>
                          <FormLabel>MCQs for Exam</FormLabel>
                          <FormControl><Input type="number" {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <FormField control={aiForm.control} name="essayCount" render={({ field }) => (
                        <FormItem>
                          <FormLabel>Essays for Exam</FormLabel>
                          <FormControl><Input type="number" {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                    </div>
                    <FormField control={aiForm.control} name="creativity" render={({ field: { value, onChange } }) => (
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
            {generationError && (
                <div className="flex h-full min-h-[50vh] items-center justify-center rounded-lg border-2 border-dashed border-destructive text-destructive">
                    {generationError}
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
                        <Button onClick={handleSaveAiCourse} disabled={isSaving} size="lg">
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
            {!isGenerating && !course && !generationError && (
                <div className="flex h-full min-h-[50vh] items-center justify-center rounded-lg border-2 border-dashed">
                    <div className="text-center text-muted-foreground">
                        <Wand2 className="mx-auto h-12 w-12" />
                        <h3 className="mt-4 text-lg font-semibold">Ready to build a course?</h3>
                        <p className="mt-1 max-w-sm mx-auto">Fill out the form to generate a new course with lessons and exams, all powered by AI.</p>
                    </div>
                </div>
            )}
          </div>
        </div>
      </TabsContent>

      {/* JSON Import Tab */}
      <TabsContent value="json-import">
        <Card className="mt-4">
            <CardHeader>
                <CardTitle>Import Course from JSON</CardTitle>
                <CardDescription>Create a course and its exam by providing a JSON file or pasting the content directly.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="space-y-2">
                    <Label htmlFor="json-paste">Paste JSON content</Label>
                    <Textarea 
                        id="json-paste"
                        placeholder="Paste your JSON here..."
                        value={jsonContent}
                        onChange={(e) => setJsonContent(e.target.value)}
                        rows={16}
                        className="font-code text-xs"
                    />
                </div>
                <div className="flex items-center gap-4">
                    <div className="flex-1 border-t"></div>
                    <span className="text-sm text-muted-foreground">OR</span>
                    <div className="flex-1 border-t"></div>
                </div>
                <div className="space-y-2">
                    <Label htmlFor="json-upload">Upload a JSON file</Label>
                    <Input id="json-upload" type="file" accept=".json" onChange={handleFileChange} />
                </div>
                 {jsonError && (
                    <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">{jsonError}</div>
                 )}
                <Button onClick={handleJsonImport} disabled={isImporting || !jsonContent} className="w-full">
                    {isImporting ? <Loader2 className="mr-2 animate-spin"/> : <Upload className="mr-2"/>}
                    {isImporting ? 'Importing...' : 'Import Course'}
                </Button>
            </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  )
}

    