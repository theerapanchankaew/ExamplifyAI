
'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useFirestore, useDoc } from '@/firebase';
import { useMemoFirebase } from '@/firebase/provider';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, ArrowLeft } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { Lesson } from '@/types/lesson';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

const formSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters long.'),
  content: z.string().min(20, 'Content must be at least 20 characters long.'),
});

export default function EditLessonPage() {
  const router = useRouter();
  const params = useParams();
  const { id: lessonId } = params;
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);

  const lessonDocRef = useMemoFirebase(() => {
    if (!firestore || !lessonId) return null;
    return doc(firestore, 'lessons', lessonId as string);
  }, [firestore, lessonId]);

  const { data: lesson, isLoading: isLessonLoading } = useDoc<Lesson>(lessonDocRef);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: '',
      content: '',
    },
  });

  useEffect(() => {
    if (lesson) {
      form.reset({
        title: lesson.title,
        content: lesson.content,
      });
    }
  }, [lesson, form]);

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!lessonDocRef) return;

    setIsSaving(true);
    try {
      await updateDoc(lessonDocRef, {
        ...values,
        updatedAt: serverTimestamp(),
      });
      toast({
        title: 'Lesson Updated',
        description: `"${values.title}" has been saved successfully.`,
      });
      router.push('/dashboard/lessons');
    } catch (e) {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
            path: lessonDocRef.path,
            operation: 'update',
            requestResourceData: values,
        }));
    } finally {
      setIsSaving(false);
    }
  }

  if (isLessonLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!lesson) {
    return (
      <div className="text-center">
        <p className="text-lg text-muted-foreground">Lesson not found.</p>
        <Button onClick={() => router.push('/dashboard/lessons')} variant="outline" className="mt-4">
          <ArrowLeft className="mr-2" />
          Back to Lessons
        </Button>
      </div>
    );
  }

  return (
    <Card className="max-w-3xl mx-auto">
      <CardHeader>
        <CardTitle>Edit Lesson</CardTitle>
        <CardDescription>Make changes to your lesson content below.</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Lesson Title</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Introduction to Quality" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="content"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Lesson Content</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Enter the lesson content here..."
                      {...field}
                      rows={15}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex justify-end gap-4">
              <Button type="button" variant="outline" onClick={() => router.push('/dashboard/lessons')} disabled={isSaving}>
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
