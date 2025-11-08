
'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, doc, deleteDoc, writeBatch } from 'firebase/firestore';
import type { Module } from '@/types/module';
import type { Lesson } from '@/types/lesson';
import { useToast } from "@/hooks/use-toast";
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from '@/components/ui/button';
import { Loader2, Layers, Edit, Trash2 } from 'lucide-react';
import { PlaceholderContent } from '@/components/placeholder-content';

type GroupedModules = {
  [lessonId: string]: {
    lessonDetails: Lesson;
    modules: Module[];
  };
};

export default function ModulesPage() {
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();
  const [isDeleting, setIsDeleting] = useState(false);
  const [moduleToDelete, setModuleToDelete] = useState<Module & { lessonTitle?: string } | null>(null);

  const modulesQuery = useMemoFirebase(() => firestore ? collection(firestore, 'modules') : null, [firestore]);
  const { data: modules, isLoading: modulesLoading } = useCollection<Module>(modulesQuery);

  const lessonsQuery = useMemoFirebase(() => firestore ? collection(firestore, 'lessons') : null, [firestore]);
  const { data: lessons, isLoading: lessonsLoading } = useCollection<Lesson>(lessonsQuery);
  
  const groupedModules = useMemo<GroupedModules>(() => {
    if (!modules || !lessons) return {};

    const groups: GroupedModules = {};

    lessons.forEach(lesson => {
      groups[lesson.id] = {
        lessonDetails: lesson,
        modules: []
      };
    });

    modules.forEach(module => {
      if (groups[module.lessonId]) {
        groups[module.lessonId].modules.push(module);
      }
    });

    // Filter out lessons with no modules
    return Object.keys(groups).reduce((acc, lessonId) => {
        if (groups[lessonId].modules.length > 0) {
            acc[lessonId] = groups[lessonId];
        }
        return acc;
    }, {} as GroupedModules);

  }, [modules, lessons]);

  const isLoading = modulesLoading || lessonsLoading;

  const handleDeleteClick = (module: Module, lesson: Lesson) => {
    setModuleToDelete({ ...module, lessonTitle: lesson.title });
  };
  
  const confirmDelete = async () => {
    if (!moduleToDelete || !firestore) return;
    setIsDeleting(true);
    
    const moduleRef = doc(firestore, "modules", moduleToDelete.id);

    try {
      await deleteDoc(moduleRef);
      toast({
        title: "Module Deleted",
        description: `"${moduleToDelete.title}" has been successfully deleted.`,
      });
    } catch (e) {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
            path: moduleRef.path,
            operation: 'delete',
        }));
    } finally {
      setIsDeleting(false);
      setModuleToDelete(null);
    }
  };

  const handleEditClick = (moduleId: string) => {
    router.push(`/dashboard/modules/edit/${moduleId}`);
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Modules Management</CardTitle>
          <CardDescription>
            Manage all modules, grouped by lesson.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex h-64 items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : Object.keys(groupedModules).length > 0 ? (
             <Accordion type="single" collapsible className="w-full">
                {Object.values(groupedModules).map(({ lessonDetails, modules }) => (
                  <AccordionItem value={lessonDetails.id} key={lessonDetails.id}>
                    <AccordionTrigger>
                      <div className="flex flex-col md:flex-row md:items-center justify-between w-full pr-4">
                        <span className="text-lg font-semibold">{lessonDetails.title}</span>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                       <div className="overflow-x-auto rounded-md border">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Module Title</TableHead>
                              <TableHead className="w-[150px] text-right">Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {modules.map((module) => (
                              <TableRow key={module.id}>
                                <TableCell className="font-medium">{module.title}</TableCell>
                                <TableCell className="text-right">
                                  <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    onClick={() => handleEditClick(module.id)}
                                  >
                                    <Edit className="h-4 w-4" />
                                    <span className="sr-only">Edit Module</span>
                                  </Button>
                                  <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    onClick={() => handleDeleteClick(module, lessonDetails)}
                                    className="text-destructive hover:text-destructive"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                    <span className="sr-only">Delete Module</span>
                                  </Button>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                ))}
             </Accordion>
          ) : (
             <PlaceholderContent 
                icon={Layers}
                title="No Modules Found"
                description="Create courses via the 'Add Course' page to generate lessons and modules."
            />
          )}
        </CardContent>
      </Card>
      
      <AlertDialog open={!!moduleToDelete} onOpenChange={(open) => !open && setModuleToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the module
              <span className="font-bold"> "{moduleToDelete?.title}"</span> from the lesson
              <span className="font-bold"> "{moduleToDelete?.lessonTitle}"</span>.
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
    </>
  );
}
