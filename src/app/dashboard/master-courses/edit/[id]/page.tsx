

'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, ArrowLeft, PlusCircle, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { MasterCourse } from '@/types/master-course';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { AdminAuthGuard } from '@/components/admin-auth-guard';

const competencyPairSchema = z.object({
  taCode: z.string().min(1, 'TA Code is required.'),
  isicCode: z.string().min(1, 'ISIC Code is required.'),
});

const formSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters.'),
  facultyCode: z.string().min(1, 'Faculty code is required.'),
  description: z.string().optional(),
  requiredCompetencies: z.array(competencyPairSchema).min(1, 'At least one competency pair is required.'),
});

function EditMasterCourseContent() {
  const router = useRouter();
  const params = useParams();
  const { id: masterCourseId } = params;
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);

  const courseDocRef = useMemoFirebase(() => {
    if (!firestore || !masterCourseId) return null;
    return doc(firestore, 'masterCourses', masterCourseId as string);
  }, [firestore, masterCourseId]);

  const { data: masterCourse, isLoading: isCourseLoading } = useDoc<MasterCourse>(courseDocRef);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: '',
      facultyCode: '',
      description: '',
      requiredCompetencies: [{ taCode: '', isicCode: '' }],
    },
  });
  
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "requiredCompetencies"
  });


  useEffect(() => {
    if (masterCourse) {
      form.reset({
        title: masterCourse.title,
        description: masterCourse.description || '',
        facultyCode: masterCourse.facultyCode,
        requiredCompetencies: masterCourse.requiredCompetencies,
      });
    }
  }, [masterCourse, form]);

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!courseDocRef) return;

    setIsSaving(true);
    try {
      await updateDoc(courseDocRef, {
        ...values,
        updatedAt: serverTimestamp(),
      });
      toast({
        title: 'Master Course Updated',
        description: `"${values.title}" has been saved successfully.`,
      });
      router.push('/dashboard/master-course-creator');
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

  if (!masterCourse) {
    return (
      <div className="text-center">
        <p className="text-lg text-muted-foreground">Master Course not found.</p>
        <Button onClick={() => router.push('/dashboard/master-course-creator')} variant="outline" className="mt-4">
          <ArrowLeft className="mr-2" />
          Back to Master Courses
        </Button>
      </div>
    );
  }

  return (
    <Card className="max-w-3xl mx-auto">
      <CardHeader>
        <CardTitle>Edit Master Course</CardTitle>
        <CardDescription>Make changes to your master course details below.</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <FormField control={form.control} name="title" render={({ field }) => (
                    <FormItem>
                    <FormLabel>Master Course Title</FormLabel>
                    <FormControl><Input placeholder="e.g., Certified Quality Management Professional" {...field} /></FormControl>
                    <FormMessage />
                    </FormItem>
                )} />
                <FormField control={form.control} name="facultyCode" render={({ field }) => (
                    <FormItem>
                    <FormLabel>Faculty Code</FormLabel>
                    <FormControl><Input placeholder="e.g., QMS" {...field} /></FormControl>
                    <FormMessage />
                    </FormItem>
                )} />
                <FormField control={form.control} name="description" render={({ field }) => (
                    <FormItem>
                    <FormLabel>Description</FormLabel>
                    <FormControl><Textarea placeholder="Describe what this master certification represents." {...field} /></FormControl>
                    <FormMessage />
                    </FormItem>
                )} />

                <div>
                    <FormLabel>Required Competencies</FormLabel>
                    <FormDescription className="text-xs mb-2">Define the TA and ISIC code pairs a user must obtain.</FormDescription>
                    <div className="space-y-4">
                    {fields.map((field, index) => (
                        <div key={field.id} className="flex gap-2 items-start">
                        <FormField control={form.control} name={`requiredCompetencies.${index}.taCode`} render={({ field }) => (
                            <FormItem className="flex-1">
                            <FormControl><Input placeholder="TA Code (e.g., IAF 32)" {...field} /></FormControl>
                            <FormMessage />
                            </FormItem>
                        )} />
                        <FormField control={form.control} name={`requiredCompetencies.${index}.isicCode`} render={({ field }) => (
                            <FormItem className="flex-1">
                            <FormControl><Input placeholder="ISIC Code (e.g., 4010)" {...field} /></FormControl>
                            <FormMessage />
                            </FormItem>
                        )} />
                        <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)} disabled={fields.length <= 1} className="shrink-0 mt-1">
                            <X className="h-4 w-4" />
                        </Button>
                        </div>
                    ))}
                    </div>
                    <Button type="button" variant="outline" size="sm" onClick={() => append({ taCode: '', isicCode: '' })} className="mt-4">
                    <PlusCircle className="mr-2" /> Add Competency Pair
                    </Button>
                </div>
                <FormMessage>{form.formState.errors.requiredCompetencies?.message}</FormMessage>

            <div className="flex justify-end gap-4">
              <Button type="button" variant="outline" onClick={() => router.push('/dashboard/master-course-creator')} disabled={isSaving}>
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

export default function EditMasterCoursePage() {
  return (
    <AdminAuthGuard>
      <EditMasterCourseContent />
    </AdminAuthGuard>
  )
}
