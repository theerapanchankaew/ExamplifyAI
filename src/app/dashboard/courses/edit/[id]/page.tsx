
'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, ArrowLeft } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { Course } from '@/types/course';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

const formSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters long.'),
  description: z.string().optional(),
  courseCode: z.string().optional(),
  competency: z.string().min(3, 'Competency must be at least 3 characters long.'),
  difficulty: z.enum(['Beginner', 'Intermediate', 'Expert']),
});

export default function EditCoursePage() {
  const router = useRouter();
  const params = useParams();
  const { id: courseId } = params;
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);

  const courseDocRef = useMemoFirebase(() => {
    if (!firestore || !courseId) return null;
    return doc(firestore, 'courses', courseId as string);
  }, [firestore, courseId]);

  const { data: course, isLoading: isCourseLoading } = useDoc<Course>(courseDocRef);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: '',
      description: '',
      courseCode: '',
      competency: '',
      difficulty: 'Beginner',
    },
  });

  useEffect(() => {
    if (course) {
      form.reset({
        title: course.title,
        description: course.description || '',
        courseCode: course.courseCode || '',
        competency: course.competency,
        difficulty: course.difficulty || 'Beginner',
      });
    }
  }, [course, form]);

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!courseDocRef) return;

    setIsSaving(true);
    try {
      await updateDoc(courseDocRef, {
        ...values,
        updatedAt: serverTimestamp(),
      });
      toast({
        title: 'Course Updated',
        description: `"${values.title}" has been saved successfully.`,
      });
      router.push('/dashboard/courses');
    } catch (e) {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
            path: courseDocRef.path,
            operation: 'update',
            requestResourceData: values,
        }));
    } finally {
      setIsSaving(false);
    }
  }

  if (isCourseLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!course) {
    return (
      <div className="text-center">
        <p className="text-lg text-muted-foreground">Course not found.</p>
        <Button onClick={() => router.push('/dashboard/courses')} variant="outline" className="mt-4">
          <ArrowLeft className="mr-2" />
          Back to Courses
        </Button>
      </div>
    );
  }

  return (
    <Card className="max-w-3xl mx-auto">
      <CardHeader>
        <CardTitle>Edit Course</CardTitle>
        <CardDescription>Make changes to your course details below.</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Course Title</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Introduction to Quality Management" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
             <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea placeholder="A brief summary of the course..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-6">
                <FormField
                control={form.control}
                name="courseCode"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Course Code</FormLabel>
                    <FormControl>
                        <Input placeholder="e.g., QM101" {...field} />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />
                <FormField
                control={form.control}
                name="competency"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Competency</FormLabel>
                    <FormControl>
                        <Input placeholder="e.g., ISO 9001" {...field} />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />
            </div>
             <FormField
                control={form.control}
                name="difficulty"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Difficulty</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl><SelectTrigger><SelectValue placeholder="Select difficulty" /></SelectTrigger></FormControl>
                        <SelectContent>
                        <SelectItem value="Beginner">Beginner</SelectItem>
                        <SelectItem value="Intermediate">Intermediate</SelectItem>
                        <SelectItem value="Expert">Expert</SelectItem>
                        </SelectContent>
                    </Select>
                    <FormMessage />
                    </FormItem>
                )}
            />
            <div className="flex justify-end gap-4">
              <Button type="button" variant="outline" onClick={() => router.push('/dashboard/courses')} disabled={isSaving}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Changes
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
