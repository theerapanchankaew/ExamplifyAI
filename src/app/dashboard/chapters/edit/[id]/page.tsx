
'use client';

import { useEffect, useState, useMemo } from 'react';
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
import { Loader2, ArrowLeft } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { Chapter } from '@/types/chapter';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { AdminAuthGuard } from '@/components/admin-auth-guard';

const formSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters long.'),
  content: z.string().min(10, 'Content must be at least 10 characters long.'),
});

function EditChapterContent() {
  const router = useRouter();
  const params = useParams();
  const { id: chapterId } = params;
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);

  const chapterDocRef = useMemoFirebase(() => {
    if (!firestore || !chapterId) return null;
    return doc(firestore, 'chapters', chapterId as string);
  }, [firestore, chapterId]);

  const { data: chapter, isLoading: isChapterLoading } = useDoc<Chapter>(chapterDocRef);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: '',
      content: '',
    },
  });

  useEffect(() => {
    if (chapter) {
      form.reset({
        title: chapter.title,
        content: chapter.content,
      });
    }
  }, [chapter, form]);

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!chapterDocRef) return;

    setIsSaving(true);
    try {
      await updateDoc(chapterDocRef, {
        ...values,
        updatedAt: serverTimestamp(),
      });
      toast({
        title: 'Chapter Updated',
        description: `"${values.title}" has been saved successfully.`,
      });
      router.push('/dashboard/chapters');
    } catch (e) {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
            path: chapterDocRef.path,
            operation: 'update',
            requestResourceData: values,
        }));
    } finally {
      setIsSaving(false);
    }
  }

  if (isChapterLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!chapter) {
    return (
      <div className="text-center">
        <p className="text-lg text-muted-foreground">Chapter not found.</p>
        <Button onClick={() => router.push('/dashboard/chapters')} variant="outline" className="mt-4">
          <ArrowLeft className="mr-2" />
          Back to Chapters
        </Button>
      </div>
    );
  }

  return (
    <Card className="max-w-3xl mx-auto">
      <CardHeader>
        <CardTitle>Edit Chapter</CardTitle>
        <CardDescription>Make changes to the chapter's title and content.</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Chapter Title</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Understanding Key Principles" {...field} />
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
                  <FormLabel>Chapter Content</FormLabel>
                  <FormControl>
                    <Textarea placeholder="The core learning material for this chapter..." {...field} rows={15} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="flex justify-end gap-4 pt-6">
              <Button type="button" variant="outline" onClick={() => router.push('/dashboard/chapters')} disabled={isSaving}>
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

export default function EditChapterPage() {
  return (
    <AdminAuthGuard>
      <EditChapterContent />
    </AdminAuthGuard>
  )
}
