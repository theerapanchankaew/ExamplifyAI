

'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useFirestore, useDoc, useCollection, useMemoFirebase } from '@/firebase';
import { doc, updateDoc, serverTimestamp, collection, query, where, getDocs } from 'firebase/firestore';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Loader2, ArrowLeft } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { Lesson } from '@/types/lesson';
import type { Module } from '@/types/module';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { PlaceholderContent } from '@/components/placeholder-content';
import { AdminAuthGuard } from '@/components/admin-auth-guard';

const formSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters long.'),
});

function EditLessonContent() {
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

  const modulesQuery = useMemoFirebase(() => {
    if (!firestore || !lessonId) return null;
    return query(collection(firestore, 'modules'), where('lessonId', '==', lessonId));
  }, [firestore, lessonId]);

  const { data: modules, isLoading: areModulesLoading } = useCollection<Module>(modulesQuery);


  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: '',
    },
  });

  useEffect(() => {
    if (lesson) {
      form.reset({
        title: lesson.title,
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

  const isLoading = isLessonLoading || areModulesLoading;

  if (isLoading) {
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
        <CardDescription>Change the lesson title. Modules and Chapters are managed separately.</CardDescription>
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

            <div className='space-y-4 pt-4'>
                <h3 className='text-lg font-semibold'>Modules in this Lesson</h3>
                {modules && modules.length > 0 ? (
                    <ul className='list-disc pl-5 space-y-2'>
                        {modules.map(module => (
                            <li key={module.id}>{module.title}</li>
                        ))}
                    </ul>
                ): (
                    <p className='text-sm text-muted-foreground'>No modules found for this lesson.</p>
                )}

            </div>
            
            <div className="flex justify-end gap-4 pt-6">
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


export default function EditLessonPage() {
  return (
    <AdminAuthGuard>
      <EditLessonContent />
    </AdminAuthGuard>
  )
}
