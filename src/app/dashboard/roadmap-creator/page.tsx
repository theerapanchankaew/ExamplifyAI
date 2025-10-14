
'use client';

import { useState, useMemo } from 'react';
import { useFirestore } from '@/firebase';
import { useCollection } from '@/firebase';
import { useMemoFirebase } from '@/firebase/provider';
import { collection, addDoc, doc, deleteDoc, writeBatch } from 'firebase/firestore';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useToast } from "@/hooks/use-toast";
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Loader2, PlusCircle, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

import type { Course } from '@/types/course';
import type { Roadmap } from '@/types/roadmap';

const formSchema = z.object({
  title: z.string().min(3, 'Roadmap title must be at least 3 characters long.'),
  steps: z.array(z.string()).min(1, 'You must select at least one course.'),
});

export default function RoadmapCreatorPage() {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [roadmapToDelete, setRoadmapToDelete] = useState<Roadmap | null>(null);

  // Data fetching
  const coursesQuery = useMemoFirebase(() => firestore ? collection(firestore, 'courses') : null, [firestore]);
  const { data: courses, isLoading: coursesLoading } = useCollection<Course>(coursesQuery);

  const roadmapsQuery = useMemoFirebase(() => firestore ? collection(firestore, 'roadmaps') : null, [firestore]);
  const { data: roadmaps, isLoading: roadmapsLoading } = useCollection<Roadmap>(roadmapsQuery);

  // Form setup
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: '',
      steps: [],
    },
  });

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!firestore) return;
    setIsSaving(true);
    
    try {
      const roadmapCollectionRef = collection(firestore, "roadmaps");
      const newRoadmapRef = doc(roadmapCollectionRef);

      // Using a batch for a single operation is fine, but not strictly necessary.
      // It's good practice if you plan to add more operations to the transaction.
      const batch = writeBatch(firestore);
      batch.set(newRoadmapRef, {
        id: newRoadmapRef.id,
        title: values.title,
        steps: values.steps,
      });

      await batch.commit();

      toast({
        title: 'Roadmap Created',
        description: `"${values.title}" has been saved successfully.`,
      });
      form.reset();
    } catch (e) {
      errorEmitter.emit('permission-error', new FirestorePermissionError({
          path: 'roadmaps',
          operation: 'create',
          requestResourceData: values,
      }));
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteClick = (roadmap: Roadmap) => {
    setRoadmapToDelete(roadmap);
  };

  const confirmDelete = async () => {
    if (!roadmapToDelete || !firestore) return;
    setIsDeleting(true);
    
    const roadmapRef = doc(firestore, "roadmaps", roadmapToDelete.id);
    try {
      await deleteDoc(roadmapRef);
      toast({
        title: "Roadmap Deleted",
        description: `"${roadmapToDelete.title}" has been successfully deleted.`,
      });
    } catch (e) {
      errorEmitter.emit('permission-error', new FirestorePermissionError({
          path: roadmapRef.path,
          operation: 'delete',
      }));
    } finally {
      setIsDeleting(false);
      setRoadmapToDelete(null);
    }
  };
  
  const coursesById = useMemo(() => {
    if (!courses) return new Map<string, Course>();
    return new Map(courses.map(course => [course.id, course]));
  }, [courses]);

  const isLoading = coursesLoading || roadmapsLoading;

  return (
    <div className="grid gap-8 lg:grid-cols-5">
      <div className="lg:col-span-2">
        <Card>
          <CardHeader>
            <CardTitle>Create Roadmap</CardTitle>
            <CardDescription>Build a structured learning path by sequencing multiple courses.</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading ? (
               <div className="flex h-64 items-center justify-center">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
               </div>
            ) : (
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

                <Button type="submit" className="w-full" disabled={isSaving}>
                  {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <PlusCircle className="mr-2 h-4 w-4" />}
                  Create Roadmap
                </Button>
              </form>
            </Form>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="lg:col-span-3">
        <Card>
          <CardHeader>
            <CardTitle>Existing Roadmaps</CardTitle>
            <CardDescription>A list of all learning paths currently in the system.</CardDescription>
          </CardHeader>
          <CardContent>
             {isLoading ? (
               <div className="flex h-64 items-center justify-center">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
               </div>
            ) : (
            <div className="overflow-x-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Roadmap Title</TableHead>
                    <TableHead>Courses</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {roadmaps && roadmaps.length > 0 ? (
                    roadmaps.map((roadmap) => (
                      <TableRow key={roadmap.id}>
                        <TableCell className="font-medium">{roadmap.title}</TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {roadmap.steps.map(stepId => {
                              const course = coursesById.get(stepId);
                              return (
                               <Badge key={stepId} variant="secondary">{course?.courseCode || 'N/A'}</Badge>
                              )
                            })}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => handleDeleteClick(roadmap)}
                            className="text-destructive hover:text-destructive"
                            disabled={isDeleting}
                           >
                            <Trash2 className="h-4 w-4" />
                            <span className="sr-only">Delete Roadmap</span>
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={3} className="h-24 text-center">
                        No roadmaps found. Create one to get started!
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
            )}
          </CardContent>
        </Card>
      </div>

       <AlertDialog open={!!roadmapToDelete} onOpenChange={(open) => !open && setRoadmapToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the roadmap
              <span className="font-bold"> "{roadmapToDelete?.title}"</span>.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} disabled={isDeleting} className="bg-destructive hover:bg-destructive/90">
              {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

    