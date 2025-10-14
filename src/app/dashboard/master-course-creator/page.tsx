
'use client';

import { useState } from 'react';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, addDoc, doc, deleteDoc } from 'firebase/firestore';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useToast } from "@/hooks/use-toast";
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Loader2, PlusCircle, Trash2, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

import type { MasterCourse } from '@/types/master-course';

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

export default function MasterCourseCreatorPage() {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<MasterCourse | null>(null);

  const masterCoursesQuery = useMemoFirebase(() => firestore ? collection(firestore, 'masterCourses') : null, [firestore]);
  const { data: masterCourses, isLoading } = useCollection<MasterCourse>(masterCoursesQuery);

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

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!firestore) return;
    setIsSaving(true);
    
    try {
      const collectionRef = collection(firestore, "masterCourses");
      const newDocRef = doc(collectionRef);
      const dataToSave = {
        id: newDocRef.id,
        ...values,
      }
      await addDoc(collectionRef, dataToSave);

      toast({
        title: 'Master Course Created',
        description: `"${values.title}" has been saved successfully.`,
      });
      form.reset();
    } catch (e) {
      errorEmitter.emit('permission-error', new FirestorePermissionError({
          path: 'masterCourses',
          operation: 'create',
          requestResourceData: values,
      }));
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteClick = (item: MasterCourse) => {
    setItemToDelete(item);
  };

  const confirmDelete = async () => {
    if (!itemToDelete || !firestore) return;
    setIsDeleting(true);
    
    const itemRef = doc(firestore, "masterCourses", itemToDelete.id);
    try {
      await deleteDoc(itemRef);
      toast({
        title: "Master Course Deleted",
        description: `"${itemToDelete.title}" has been successfully deleted.`,
      });
    } catch (e) {
      errorEmitter.emit('permission-error', new FirestorePermissionError({
          path: itemRef.path,
          operation: 'delete',
      }));
    } finally {
      setIsDeleting(false);
      setItemToDelete(null);
    }
  };

  return (
    <div className="grid gap-8 lg:grid-cols-5">
      <div className="lg:col-span-2">
        <Card>
          <CardHeader>
            <CardTitle>Create New Master Course</CardTitle>
            <CardDescription>Define a certification program by grouping required competencies.</CardDescription>
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

                <Button type="submit" className="w-full" disabled={isSaving}>
                  {isSaving ? <Loader2 className="mr-2 animate-spin" /> : <PlusCircle className="mr-2" />}
                  Create Master Course
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>

      <div className="lg:col-span-3">
        <Card>
          <CardHeader>
            <CardTitle>Existing Master Courses</CardTitle>
            <CardDescription>A list of defined certification programs.</CardDescription>
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
                    <TableHead>Title</TableHead>
                    <TableHead>Code</TableHead>
                    <TableHead>Competencies</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {masterCourses && masterCourses.length > 0 ? (
                    masterCourses.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">{item.title}</TableCell>
                        <TableCell><Badge variant="secondary">{item.facultyCode}</Badge></TableCell>
                        <TableCell>
                           <div className="flex flex-col gap-1">
                            {item.requiredCompetencies.map((p, i) => <span key={i} className="text-xs font-mono">{p.taCode}/{p.isicCode}</span>)}
                           </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="icon" onClick={() => handleDeleteClick(item)} className="text-destructive hover:text-destructive" disabled={isDeleting}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={4} className="h-24 text-center">
                        No master courses found.
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

       <AlertDialog open={!!itemToDelete} onOpenChange={(open) => !open && setItemToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the master course <span className="font-bold">"{itemToDelete?.title}"</span>.
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

    