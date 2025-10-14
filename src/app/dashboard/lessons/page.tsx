
'use client';

import { useMemo, useState } from 'react';
import { useFirestore } from '@/firebase';
import { useCollection } from '@/firebase';
import { useMemoFirebase } from '@/firebase/provider';
import { collection, doc, deleteDoc } from 'firebase/firestore';
import type { Lesson } from '@/types/lesson';
import type { Course } from '@/types/course';
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
import { Badge } from '@/components/ui/badge';
import { Loader2, MoreHorizontal } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

type EnrichedLesson = Lesson & {
  courseTitle?: string;
  courseDifficulty?: string;
  courseCompetency?: string;
  courseCode?: string;
};

export default function LessonsPage() {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isDeleting, setIsDeleting] = useState(false);
  const [lessonToDelete, setLessonToDelete] = useState<EnrichedLesson | null>(null);

  const lessonsQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return collection(firestore, 'lessons');
  }, [firestore]);
  const { data: lessons, isLoading: lessonsLoading } = useCollection<Lesson>(lessonsQuery);

  const coursesQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return collection(firestore, 'courses');
  }, [firestore]);
  const { data: courses, isLoading: coursesLoading } = useCollection<Course>(coursesQuery);

  const enrichedLessons = useMemo<EnrichedLesson[]>(() => {
    if (!lessons || !courses) return [];
    const coursesMap = new Map(courses.map(c => [c.id, c]));
    return lessons.map(lesson => ({
      ...lesson,
      courseTitle: coursesMap.get(lesson.courseId)?.title || 'Unknown Course',
      courseDifficulty: coursesMap.get(lesson.courseId)?.difficulty,
      courseCompetency: coursesMap.get(lesson.courseId)?.competency,
      courseCode: coursesMap.get(lesson.courseId)?.courseCode,
    }));
  }, [lessons, courses]);

  const isLoading = lessonsLoading || coursesLoading;

  const handleDeleteClick = (lesson: EnrichedLesson) => {
    setLessonToDelete(lesson);
  };

  const confirmDelete = async () => {
    if (!lessonToDelete || !firestore) return;
    setIsDeleting(true);
    
    const lessonRef = doc(firestore, "lessons", lessonToDelete.id);

    try {
      await deleteDoc(lessonRef);
      toast({
        title: "Lesson Deleted",
        description: `"${lessonToDelete.title}" has been successfully deleted.`,
      });
    } catch (e) {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
            path: lessonRef.path,
            operation: 'delete',
        }));
    } finally {
      setIsDeleting(false);
      setLessonToDelete(null);
    }
  };

  const handleEditClick = () => {
    toast({
      title: "Coming Soon!",
      description: "The edit functionality is currently under development.",
    })
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Lessons Management</CardTitle>
          <CardDescription>
            Manage all individual lessons across all courses in the system.
          </CardDescription>
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
                    <TableHead>Lesson Title</TableHead>
                    <TableHead>Course</TableHead>
                    <TableHead>Competency</TableHead>
                    <TableHead>Course Code</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {enrichedLessons && enrichedLessons.length > 0 ? (
                    enrichedLessons.map((lesson) => (
                      <TableRow key={lesson.id}>
                        <TableCell className="font-medium">{lesson.title}</TableCell>
                        <TableCell>{lesson.courseTitle}</TableCell>
                        <TableCell>
                          {lesson.courseCompetency && <Badge variant="outline">{lesson.courseCompetency}</Badge>}
                        </TableCell>
                        <TableCell className="font-mono text-xs">
                          {lesson.courseCode || 'N/A'}
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button aria-haspopup="true" size="icon" variant="ghost">
                                <MoreHorizontal className="h-4 w-4" />
                                <span className="sr-only">Toggle menu</span>
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>Actions</DropdownMenuLabel>
                              <DropdownMenuItem onClick={handleEditClick}>Edit</DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleDeleteClick(lesson)} className="text-destructive focus:text-destructive">Delete</DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={5} className="h-24 text-center">
                        No lessons found.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
      
      <AlertDialog open={!!lessonToDelete} onOpenChange={(open) => !open && setLessonToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the lesson
              <span className="font-bold"> "{lessonToDelete?.title}"</span>.
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
