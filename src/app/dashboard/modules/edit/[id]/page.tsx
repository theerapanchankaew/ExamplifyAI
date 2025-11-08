

'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useFirestore, useDoc, useCollection, useMemoFirebase } from '@/firebase';
import { doc, updateDoc, serverTimestamp, collection, query, where } from 'firebase/firestore';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Loader2, ArrowLeft } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { Module } from '@/types/module';
import type { Chapter } from '@/types/chapter';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { AdminAuthGuard } from '@/components/admin-auth-guard';

const formSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters long.'),
});

function EditModuleContent() {
  const router = useRouter();
  const params = useParams();
  const { id: moduleId } = params;
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);

  const moduleDocRef = useMemoFirebase(() => {
    if (!firestore || !moduleId) return null;
    return doc(firestore, 'modules', moduleId as string);
  }, [firestore, moduleId]);

  const { data: module, isLoading: isModuleLoading } = useDoc<Module>(moduleDocRef);

  const chaptersQuery = useMemoFirebase(() => {
    if (!firestore || !moduleId) return null;
    return query(collection(firestore, 'chapters'), where('moduleId', '==', moduleId));
  }, [firestore, moduleId]);

  const { data: chapters, isLoading: areChaptersLoading } = useCollection<Chapter>(chaptersQuery);


  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: '',
    },
  });

  useEffect(() => {
    if (module) {
      form.reset({
        title: module.title,
      });
    }
  }, [module, form]);

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!moduleDocRef) return;

    setIsSaving(true);
    const updateData = {
        ...values,
        updatedAt: serverTimestamp(),
    };
    try {
      await updateDoc(moduleDocRef, updateData);
      toast({
        title: 'Module Updated',
        description: `"${values.title}" has been saved successfully.`,
      });
      router.push('/dashboard/modules');
    } catch (e) {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
            path: moduleDocRef.path,
            operation: 'update',
            requestResourceData: updateData,
        }));
    } finally {
      setIsSaving(false);
    }
  }

  const isLoading = isModuleLoading || areChaptersLoading;

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!module) {
    return (
      <div className="text-center">
        <p className="text-lg text-muted-foreground">Module not found.</p>
        <Button onClick={() => router.push('/dashboard/modules')} variant="outline" className="mt-4">
          <ArrowLeft className="mr-2" />
          Back to Modules
        </Button>
      </div>
    );
  }

  return (
    <Card className="max-w-3xl mx-auto">
      <CardHeader>
        <CardTitle>Edit Module</CardTitle>
        <CardDescription>Change the module title and review its chapters.</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Module Title</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Core Concepts" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className='space-y-4 pt-4'>
                <h3 className='text-base font-semibold'>Chapters in this Module</h3>
                {chapters && chapters.length > 0 ? (
                    <div className="rounded-md border p-4">
                        <ul className='list-disc pl-5 space-y-2 text-sm'>
                            {chapters.map(chapter => (
                                <li key={chapter.id}>{chapter.title}</li>
                            ))}
                        </ul>
                    </div>
                ): (
                    <p className='text-sm text-muted-foreground'>No chapters found for this module.</p>
                )}
            </div>
            
            <div className="flex justify-end gap-4 pt-6">
              <Button type="button" variant="outline" onClick={() => router.push('/dashboard/modules')} disabled={isSaving}>
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

export default function EditModulePage() {
  return (
    <AdminAuthGuard>
      <EditModuleContent />
    </AdminAuthGuard>
  )
}
