
'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
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
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion"
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
import { Loader2, BookCopy, Edit, Trash2, Book } from 'lucide-react';

type EnrichedLesson = Lesson & {
  courseTitle?: string;
  courseDifficulty?: string;
  courseCompetency?: string;
  courseCode?: string;
};

type GroupedCourses = {
    [courseId: string]: {
        course: Course;
        lessons: EnrichedLesson[];
    }
}

export default function LessonsPage() {
  const firestore = useFirestore();
  const router = useRouter();
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

  const groupedCourses = useMemo<GroupedCourses>(() => {
    if (!lessons || !courses) return {};

    const coursesMap = new Map(courses.map(c => [c.id, c]));
    const result: GroupedCourses = {};

    lessons.forEach(lesson => {
        const course = coursesMap.get(lesson.courseId);
        if (course) {
            if (!result[lesson.courseId]) {
                result[lesson.courseId] = {
                    course: course,
                    lessons: []
                };
            }
            result[lesson.courseId].lessons.push({
                ...lesson,
                courseTitle: course.title,
                courseDifficulty: course.difficulty,
                courseCompetency: course.competency,
                courseCode: course.courseCode,
            });
        }
    });
    return result;
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

  const handleEditClick = (lessonId: string) => {
    router.push(`/dashboard/lessons/edit/${lessonId}`);
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Lessons Management</CardTitle>
          <CardDescription>
            Manage all lessons, grouped by course. Each lesson acts as a micro-learning module.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex h-64 items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : Object.keys(groupedCourses).length > 0 ? (
            <Accordion type="multiple" className="w-full space-y-4">
                {Object.values(groupedCourses).map(({ course, lessons }) => (
                    <AccordionItem value={course.id} key={course.id} className="border-b-0 rounded-lg border bg-card text-card-foreground shadow-sm">
                        <AccordionTrigger className="p-6 hover:no-underline">
                           <div className='flex flex-col text-left'>
                                <div className='flex items-center gap-4'>
                                    <h3 className="text-lg font-semibold">{course.title}</h3>
                                    <Badge variant="outline">{course.courseCode}</Badge>
                                </div>
                                <p className='text-sm text-muted-foreground mt-1'>{lessons.length} {lessons.length === 1 ? 'module' : 'modules'}</p>
                           </div>
                        </AccordionTrigger>
                        <AccordionContent>
                           <div className="overflow-x-auto border-t">
                             <Table>
                                <TableHeader>
                                  <TableRow>
                                    <TableHead>Module Title</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {lessons.map((lesson) => (
                                        <TableRow key={lesson.id}>
                                            <TableCell className="font-medium flex items-center gap-2">
                                                <Book className="h-4 w-4 text-muted-foreground"/>
                                                {lesson.title}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Button variant="ghost" size="icon" onClick={() => handleEditClick(lesson.id)}>
                                                    <Edit className="h-4 w-4" />
                                                    <span className="sr-only">Edit</span>
                                                </Button>
                                                 <Button variant="ghost" size="icon" onClick={() => handleDeleteClick(lesson)} className="text-destructive hover:text-destructive">
                                                    <Trash2 className="h-4 w-4" />
                                                    <span className="sr-only">Delete</span>
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
            <div className="flex h-64 items-center justify-center rounded-lg border-2 border-dashed">
                <div className="text-center text-muted-foreground">
                    <BookCopy className="mx-auto h-12 w-12" />
                    <h3 className="mt-4 text-lg font-semibold">No Lessons Found</h3>
                    <p className="mt-1 max-w-sm mx-auto text-sm">Create courses and lessons via the 'Add Course' page to see them here.</p>
                </div>
            </div>
          )}
        </CardContent>
      </Card>
      
      <AlertDialog open={!!lessonToDelete} onOpenChange={(open) => !open && setLessonToDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the module
              <span className="font-bold"> "{lessonToDelete?.title}"</span> from the course
              <span className="font-bold"> "{lessonToDelete?.courseTitle}"</span>.
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
