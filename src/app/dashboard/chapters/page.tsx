'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, doc, deleteDoc } from 'firebase/firestore';
import type { Chapter } from '@/types/chapter';
import type { Module } from '@/types/module';
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
import { Loader2, FileText, Edit, Trash2 } from 'lucide-react';
import { PlaceholderContent } from '@/components/placeholder-content';

type GroupedChapters = {
  [moduleId: string]: {
    moduleDetails: Module;
    chapters: Chapter[];
  };
};

export default function ChaptersPage() {
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();
  const [isDeleting, setIsDeleting] = useState(false);
  const [chapterToDelete, setChapterToDelete] = useState<Chapter & { moduleTitle?: string } | null>(null);

  const chaptersQuery = useMemoFirebase(() => firestore ? collection(firestore, 'chapters') : null, [firestore]);
  const { data: chapters, isLoading: chaptersLoading } = useCollection<Chapter>(chaptersQuery);

  const modulesQuery = useMemoFirebase(() => firestore ? collection(firestore, 'modules') : null, [firestore]);
  const { data: modules, isLoading: modulesLoading } = useCollection<Module>(modulesQuery);
  
  const groupedChapters = useMemo<GroupedChapters>(() => {
    if (!chapters || !modules) return {};

    const groups: GroupedChapters = {};

    modules.forEach(module => {
      groups[module.id] = {
        moduleDetails: module,
        chapters: []
      };
    });

    chapters.forEach(chapter => {
      if (groups[chapter.moduleId]) {
        groups[chapter.moduleId].chapters.push(chapter);
      }
    });

    return Object.keys(groups).reduce((acc, moduleId) => {
        if (groups[moduleId].chapters.length > 0) {
            acc[moduleId] = groups[moduleId];
        }
        return acc;
    }, {} as GroupedChapters);

  }, [chapters, modules]);

  const isLoading = chaptersLoading || modulesLoading;

  const handleDeleteClick = (chapter: Chapter, module: Module) => {
    setChapterToDelete({ ...chapter, moduleTitle: module.title });
  };
  
  const confirmDelete = async () => {
    if (!chapterToDelete || !firestore) return;
    setIsDeleting(true);
    
    const chapterRef = doc(firestore, "chapters", chapterToDelete.id);

    try {
      await deleteDoc(chapterRef);
      toast({
        title: "Chapter Deleted",
        description: `"${chapterToDelete.title}" has been successfully deleted.`,
      });
    } catch (e) {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
            path: chapterRef.path,
            operation: 'delete',
        }));
    } finally {
      setIsDeleting(false);
      setChapterToDelete(null);
    }
  };

  const handleEditClick = (chapterId: string) => {
     toast({
        title: "Edit Not Implemented",
        description: "Editing chapters will be available in a future update.",
    });
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Chapters Management</CardTitle>
          <CardDescription>
            Manage all chapters, grouped by module.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex h-64 items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : Object.keys(groupedChapters).length > 0 ? (
             <Accordion type="single" collapsible className="w-full">
                {Object.values(groupedChapters).map(({ moduleDetails, chapters }) => (
                  <AccordionItem value={moduleDetails.id} key={moduleDetails.id}>
                    <AccordionTrigger>
                      <div className="flex flex-col md:flex-row md:items-center justify-between w-full pr-4">
                        <span className="text-lg font-semibold">{moduleDetails.title}</span>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                       <div className="overflow-x-auto rounded-md border">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Chapter Title</TableHead>
                              <TableHead className="w-[150px] text-right">Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {chapters.map((chapter) => (
                              <TableRow key={chapter.id}>
                                <TableCell className="font-medium">{chapter.title}</TableCell>
                                <TableCell className="text-right">
                                  <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    onClick={() => handleEditClick(chapter.id)}
                                    disabled
                                  >
                                    <Edit className="h-4 w-4" />
                                    <span className="sr-only">Edit Chapter</span>
                                  </Button>
                                  <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    onClick={() => handleDeleteClick(chapter, moduleDetails)}
                                    className="text-destructive hover:text-destructive"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                    <span className="sr-only">Delete Chapter</span>
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
                icon={<FileText className="mx-auto h-12 w-12" />}
                title="No Chapters Found"
                description="AI-generated courses will automatically create chapters. Check the 'Add Course' page."
            />
          )}
        </CardContent>
      </Card>
      
      <AlertDialog open={!!chapterToDelete} onOpenChange={(open) => !open && setChapterToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the chapter
              <span className="font-bold"> "{chapterToDelete?.title}"</span> from the module
              <span className="font-bold"> "{chapterToDelete?.moduleTitle}"</span>.
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
