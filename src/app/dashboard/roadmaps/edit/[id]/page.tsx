
'use client';

import { useEffect, useState, useMemo } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useFirestore, useDoc, useCollection, useMemoFirebase } from '@/firebase';
import { doc, updateDoc, serverTimestamp, collection } from 'firebase/firestore';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Loader2, ArrowLeft } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { Roadmap } from '@/types/roadmap';
import type { Course } from '@/types/course';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

const formSchema = z.object({
  title: z.string().min(3, 'Roadmap title must be at least 3 characters long.'),
  steps: z.array(z.string()).min(1, 'You must select at least one course.'),
});

export default function EditRoadmapPage() {
  const router = useRouter();
  const params = useParams();
  const { id: roadmapId } = params;
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);

  // Fetch the specific roadmap document
  const roadmapDocRef = useMemoFirebase(() => {
    if (!firestore || !roadmapId) return null;
    return doc(firestore, 'roadmaps', roadmapId as string);
  }, [firestore, roadmapId]);
  const { data: roadmap, isLoading: isRoadmapLoading } = useDoc<Roadmap>(roadmapDocRef);
  
  // Fetch all courses to display in the checkbox list
  const coursesQuery = useMemoFirebase(() => firestore ? collection(firestore, 'courses') : null, [firestore]);
  const { data: courses, isLoading: areCoursesLoading } = useCollection<Course>(coursesQuery);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: '',
      steps: [],
    },
  });

  // Populate form with roadmap data once it's loaded
  useEffect(() => {
    if (roadmap) {
      form.reset({
        title: roadmap.title,
        steps: roadmap.steps,
      });
    }
  }, [roadmap, form]);

  async function onSubmit(values: z.infer<typeof formSchema>) {
    if (!roadmapDocRef) return;

    setIsSaving(true);
    try {
      await updateDoc(roadmapDocRef, {
        ...values,
        updatedAt: serverTimestamp(),
      });
      toast({
        title: 'Roadmap Updated',
        description: `"${values.title}" has been saved successfully.`,
      });
      router.push('/dashboard/roadmap-creator');
    } catch (e) {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
            path: roadmapDocRef.path,
            operation: 'update',
            requestResourceData: values,
        }));
    } finally {
      setIsSaving(false);
    }
  }

  const isLoading = isRoadmapLoading || areCoursesLoading;

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!roadmap) {
    return (
      <div className="text-center">
        <p className="text-lg text-muted-foreground">Roadmap not found.</p>
        <Button onClick={() => router.push('/dashboard/roadmap-creator')} variant="outline" className="mt-4">
          <ArrowLeft className="mr-2" />
          Back to Roadmaps
        </Button>
      </div>
    );
  }

  return (
    <Card className="max-w-3xl mx-auto">
      <CardHeader>
        <CardTitle>Edit Roadmap</CardTitle>
        <CardDescription>Make changes to your learning path below.</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
             <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Roadmap Title</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g., Quality Manager Certification Path" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="steps"
              render={() => (
                <FormItem>
                  <FormLabel>Select Courses</FormLabel>
                  <div className="space-y-3 rounded-md border p-4 max-h-96 overflow-y-auto">
                    {courses?.map((course) => (
                      <FormField
                        key={course.id}
                        control={form.control}
                        name="steps"
                        render={({ field }) => {
                          return (
                            <FormItem
                              key={course.id}
                              className="flex flex-row items-start space-x-3 space-y-0"
                            >
                              <FormControl>
                                <Checkbox
                                  checked={field.value?.includes(course.id)}
                                  onCheckedChange={(checked) => {
                                    const currentValues = field.value || [];
                                    return checked
                                      ? field.onChange([...currentValues, course.id])
                                      : field.onChange(
                                          currentValues.filter(
                                            (value) => value !== course.id
                                          )
                                        );
                                  }}
                                />
                              </FormControl>
                              <FormLabel className="font-normal w-full">
                                <div className="flex justify-between items-center">
                                  <span>{course.title}</span>
                                  <Badge variant="outline">{course.courseCode}</Badge>
                                </div>
                              </FormLabel>
                            </FormItem>
                          );
                        }}
                      />
                    ))}
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex justify-end gap-4">
              <Button type="button" variant="outline" onClick={() => router.push('/dashboard/roadmap-creator')} disabled={isSaving}>
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

    