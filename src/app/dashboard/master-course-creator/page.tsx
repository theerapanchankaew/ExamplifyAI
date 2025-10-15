
'use client';

import { useState } from 'react';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, addDoc, doc, deleteDoc, writeBatch } from 'firebase/firestore';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useToast } from "@/hooks/use-toast";
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, PlusCircle, Trash2, X, Download, Upload, FileJson, Pencil } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

import type { MasterCourse } from '@/types/master-course';

// Manual form schema
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

// JSON import schema
const masterCourseJsonSchema = z.object({
    title: z.string().min(3, 'Title must be at least 3 characters.'),
    facultyCode: z.string().min(1, 'Faculty code is required.'),
    description: z.string().optional(),
    requiredCompetencies: z.array(competencyPairSchema).min(1, 'At least one competency pair is required.'),
});
const jsonImportSchema = z.array(masterCourseJsonSchema);


export default function MasterCourseCreatorPage() {
  const firestore = useFirestore();
  const { toast } = useToast();
  // State for manual form
  const [isSaving, setIsSaving] = useState(false);
  
  // State for existing items list
  const [isDeleting, setIsDeleting] = useState(false);
  const [itemToDelete, setItemToDelete] = useState<MasterCourse | null>(null);

  // State for JSON Import
  const [isImporting, setIsImporting] = useState(false);
  const [jsonContent, setJsonContent] = useState('');
  const [jsonError, setJsonError] = useState<string | null>(null);


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

  const onManualSubmit = async (values: z.infer<typeof formSchema>) => {
    if (!firestore) return;
    setIsSaving(true);
    
    try {
      const collectionRef = collection(firestore, "masterCourses");
      const newDocRef = doc(collectionRef);
      const dataToSave = {
        id: newDocRef.id,
        ...values,
      }
      // Firestore `addDoc` does not return the document reference with the ID immediately in a way that can be easily merged.
      // We are creating an ID beforehand and setting it.
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

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result;
        setJsonContent(text as string);
        setJsonError(null);
      };
      reader.readAsText(file);
    }
  };

  const handleDownloadTemplate = () => {
    const template = [
      {
        title: "Certified Quality Management Professional",
        facultyCode: "QMP",
        description: "A comprehensive certification for professionals mastering quality management principles and practices.",
        requiredCompetencies: [
          { taCode: "IAF 35", isicCode: "8549" },
          { taCode: "IAF 37", isicCode: "8690" }
        ]
      },
      {
        title: "Advanced Food Safety Specialist",
        facultyCode: "AFSS",
        description: "Demonstrates expert-level knowledge in food safety standards and HACCP systems.",
        requiredCompetencies: [
          { taCode: "IAF 03", isicCode: "1079" },
          { taCode: "IAF 01", isicCode: "0163" }
        ]
      }
    ];
    const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(template, null, 2))}`;
    const link = document.createElement("a");
    link.href = jsonString;
    link.download = "master-course-template.json";
    link.click();
  };

  const handleJsonImport = async () => {
    setIsImporting(true);
    setJsonError(null);
    if (!firestore) {
      setJsonError("Firestore not available. Please try again later.");
      setIsImporting(false);
      return;
    }

    try {
      const jsonData = JSON.parse(jsonContent);
      const parsedData = jsonImportSchema.parse(jsonData);

      const batch = writeBatch(firestore);
      parsedData.forEach(mc => {
        const docRef = doc(collection(firestore, "masterCourses"));
        batch.set(docRef, { ...mc, id: docRef.id });
      });

      await batch.commit();

      toast({
        title: "Import Successful!",
        description: `${parsedData.length} master course(s) have been created.`,
      });
      setJsonContent('');

    } catch (e: any) {
      if (e instanceof z.ZodError) {
        setJsonError(`JSON validation failed: ${e.errors.map(err => `[${err.path.join('.')}] ${err.message}`).join(', ')}`);
      } else if (e instanceof SyntaxError) {
        setJsonError(`Invalid JSON format: ${e.message}`);
      } else {
        setJsonError(`An error occurred during import: ${e.message}`);
        errorEmitter.emit('permission-error', new FirestorePermissionError({
            path: 'masterCourses (batch import)',
            operation: 'write',
            requestResourceData: { json: jsonContent },
        }));
      }
    } finally {
      setIsImporting(false);
    }
  };


  return (
    <div className="grid gap-8 lg:grid-cols-5">
      <div className="lg:col-span-2">
        <Tabs defaultValue="manual-create">
            <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="manual-create"><Pencil className="mr-2" /> Create Manually</TabsTrigger>
                <TabsTrigger value="json-import"><FileJson className="mr-2" /> Import from JSON</TabsTrigger>
            </TabsList>
            <TabsContent value="manual-create">
                <Card className="mt-4">
                  <CardHeader>
                    <CardTitle>Create New Master Course</CardTitle>
                    <CardDescription>Define a certification program by grouping required competencies.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Form {...form}>
                      <form onSubmit={form.handleSubmit(onManualSubmit)} className="space-y-6">
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
            </TabsContent>
            <TabsContent value="json-import">
                <Card className="mt-4">
                    <CardHeader>
                        <div className='flex justify-between items-center'>
                             <CardTitle>Import from JSON</CardTitle>
                             <Button variant="outline" size="sm" onClick={handleDownloadTemplate}>
                                <Download className="mr-2 h-4 w-4" />
                                Template
                            </Button>
                        </div>
                        <CardDescription>Quickly create multiple master courses by uploading a JSON file.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="space-y-2">
                            <Label htmlFor="json-paste">Paste JSON content</Label>
                            <Textarea 
                                id="json-paste"
                                placeholder='[{"title": "...", "facultyCode": "...", ...}]'
                                value={jsonContent}
                                onChange={(e) => setJsonContent(e.target.value)}
                                rows={10}
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
                            <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md whitespace-pre-wrap">{jsonError}</div>
                        )}
                        <Button onClick={handleJsonImport} disabled={isImporting || !jsonContent} className="w-full">
                            {isImporting ? <Loader2 className="mr-2 animate-spin"/> : <Upload className="mr-2"/>}
                            {isImporting ? 'Importing...' : 'Import Master Courses'}
                        </Button>
                    </CardContent>
                </Card>
            </TabsContent>
        </Tabs>
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

