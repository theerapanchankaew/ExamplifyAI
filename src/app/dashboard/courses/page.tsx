

'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, doc, deleteDoc, query, where, getDocs, writeBatch } from 'firebase/firestore';
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
import { Loader2, Trash2, Edit } from 'lucide-react';
import { AdminAuthGuard } from '@/components/admin-auth-guard';

function CoursesContent() {
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();
  const [isDeleting, setIsDeleting] = useState(false);
  const [courseToDelete, setCourseToDelete] = useState<Course | null>(null);

  const coursesQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return collection(firestore, 'courses');
  }, [firestore]);
  const { data: courses, isLoading: coursesLoading } = useCollection<Course>(coursesQuery);

  const handleDeleteClick = (course: Course) => {
    setCourseToDelete(course);
  };

  const handleEditClick = (courseId: string) => {
    router.push(`/dashboard/courses/edit/${courseId}`);
  };

  const confirmDelete = async () => {
    if (!courseToDelete || !firestore) return;
    setIsDeleting(true);

    const courseId = courseToDelete.id;
    const batch = writeBatch(firestore);

    try {
        // 1. Delete the course itself
        const courseRef = doc(firestore, "courses", courseId);
        batch.delete(courseRef);

        // 2. Find and delete associated lessons, modules, chapters, and exams
        const lessonsQuery = query(collection(firestore, 'lessons'), where('courseId', '==', courseId));
        const lessonsSnapshot = await getDocs(lessonsQuery);
        const lessonIds = lessonsSnapshot.docs.map(d => d.id);

        if (lessonIds.length > 0) {
            const modulesQuery = query(collection(firestore, 'modules'), where('lessonId', 'in', lessonIds));
            const modulesSnapshot = await getDocs(modulesQuery);
            const moduleIds = modulesSnapshot.docs.map(d => d.id);

            if (moduleIds.length > 0) {
                const chaptersQuery = query(collection(firestore, 'chapters'), where('moduleId', 'in', moduleIds));
                const chaptersSnapshot = await getDocs(chaptersQuery);
                chaptersSnapshot.docs.forEach(d => batch.delete(d.ref));
            }
            modulesSnapshot.docs.forEach(d => batch.delete(d.ref));
        }
        lessonsSnapshot.docs.forEach(d => batch.delete(d.ref));
        
        // 3. Find and delete associated exams
        const examsQuery = query(collection(firestore, 'exams'), where('courseId', '==', courseId));
        const examsSnapshot = await getDocs(examsQuery);
        examsSnapshot.docs.forEach(d => batch.delete(d.ref));

        // Commit the batch delete
        await batch.commit();

        toast({
            title: "Course Deleted",
            description: `"${courseToDelete.title}" and all its related content have been successfully deleted.`,
        });

    } catch (e: any) {
        toast({
            variant: "destructive",
            title: "Deletion Failed",
            description: e.message || "An error occurred during deletion."
        });
        errorEmitter.emit('permission-error', new FirestorePermissionError({
            path: `courses/${courseId} and related items`,
            operation: 'delete',
        }));
    } finally {
        setIsDeleting(false);
        setCourseToDelete(null);
    }
  };


  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Course Management</CardTitle>
          <CardDescription>
            Manage all courses in the system. Deleting a course will also delete all of its associated lessons, modules, chapters, and exams.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {coursesLoading ? (
            <div className="flex h-64 items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="overflow-x-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Course Title</TableHead>
                    <TableHead>Course Code</TableHead>
                    <TableHead>Competency</TableHead>
                    <TableHead>Difficulty</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {courses && courses.length > 0 ? (
                    courses.map((course) => (
                      <TableRow key={course.id}>
                        <TableCell className="font-medium">{course.title}</TableCell>
                        <TableCell className="font-mono text-xs">
                          {course.courseCode || 'N/A'}
                        </TableCell>
                        <TableCell>
                          {course.competency && <Badge variant="outline">{course.competency}</Badge>}
                        </TableCell>
                        <TableCell>
                            {course.difficulty && <Badge variant="secondary">{course.difficulty}</Badge>}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => handleEditClick(course.id)}
                           >
                            <Edit className="h-4 w-4" />
                            <span className="sr-only">Edit Course</span>
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => handleDeleteClick(course)}
                            className="text-destructive hover:text-destructive"
                           >
                            <Trash2 className="h-4 w-4" />
                            <span className="sr-only">Delete Course</span>
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={5} className="h-24 text-center">
                        No courses found.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
      
      <AlertDialog open={!!courseToDelete} onOpenChange={(open) => !open && setCourseToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the course
              <span className="font-bold"> "{courseToDelete?.title}"</span> and all of its associated content, including lessons, modules, chapters, and exams.
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

export default function CoursesPage() {
  return (
    <AdminAuthGuard>
      <CoursesContent />
    </AdminAuthGuard>
  )
}
