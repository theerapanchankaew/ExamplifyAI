

'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useFirestore } from '@/firebase';
import { useCollection } from '@/firebase';
import { useMemoFirebase } from '@/firebase/provider';
import { collection, doc, deleteDoc, writeBatch } from 'firebase/firestore';
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
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Loader2, BookCopy, Edit, Trash2, Search } from 'lucide-react';
import { AdminAuthGuard } from '@/components/admin-auth-guard';

type GroupedLessons = {
  [courseId: string]: {
    courseDetails: Course;
    lessons: Lesson[];
  };
};

function LessonsContent() {
  const firestore = useFirestore();
  const router = useRouter();
  const { toast } = useToast();
  const [isDeleting, setIsDeleting] = useState(false);
  const [lessonToDelete, setLessonToDelete] = useState<Lesson & { courseTitle?: string } | null>(null);
  const [courseToBulkDelete, setCourseToBulkDelete] = useState<Course & { lessonCount: number } | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

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
  
  const groupedLessons = useMemo<GroupedLessons>(() => {
    if (!lessons || !courses) return {};

    const lowercasedSearchTerm = searchTerm.toLowerCase();

    const coursesMap = new Map(courses.map(c => [c.id, c]));
    const groups: GroupedLessons = {};

    courses.forEach(course => {
      groups[course.id] = {
        courseDetails: course,
        lessons: []
      };
    });

    lessons.forEach(lesson => {
      if (groups[lesson.courseId]) {
        groups[lesson.courseId].lessons.push(lesson);
      }
    });

    // Filter out courses with no lessons or that don't match the search term
    return Object.keys(groups).reduce((acc, courseId) => {
      const group = groups[courseId];
      const courseTitleMatch = group.courseDetails.title.toLowerCase().includes(lowercasedSearchTerm);
      const matchingLessons = group.lessons.filter(lesson => lesson.title.toLowerCase().includes(lowercasedSearchTerm));

      if (group.lessons.length > 0 && (courseTitleMatch || matchingLessons.length > 0)) {
        acc[courseId] = {
          ...group,
          // If the course title matches, show all its lessons, otherwise show only matching lessons
          lessons: courseTitleMatch ? group.lessons : matchingLessons,
        };
      }
      return acc;
    }, {} as GroupedLessons);

  }, [lessons, courses, searchTerm]);

  const isLoading = lessonsLoading || coursesLoading;

  const handleDeleteClick = (lesson: Lesson, course: Course) => {
    setLessonToDelete({ ...lesson, courseTitle: course.title });
  };
  
  const handleBulkDeleteClick = (course: Course, lessons: Lesson[]) => {
    setCourseToBulkDelete({ ...course, lessonCount: lessons.length });
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

  const confirmBulkDelete = async () => {
    if (!courseToBulkDelete || !firestore) return;
    
    const lessonsToDelete = groupedLessons[courseToBulkDelete.id]?.lessons;
    if (!lessonsToDelete || lessonsToDelete.length === 0) return;
    
    setIsDeleting(true);
    const batch = writeBatch(firestore);

    lessonsToDelete.forEach(lesson => {
        const lessonRef = doc(firestore, 'lessons', lesson.id);
        batch.delete(lessonRef);
    });
    
    try {
        await batch.commit();
        toast({
            title: "All Lessons Deleted",
            description: `All ${lessonsToDelete.length} lessons from "${courseToBulkDelete.title}" have been deleted.`,
        });
    } catch (e) {
         errorEmitter.emit('permission-error', new FirestorePermissionError({
            path: `lessons in course ${courseToBulkDelete.id}`,
            operation: 'delete',
        }));
    } finally {
        setIsDeleting(false);
        setCourseToBulkDelete(null);
    }
  };

  const handleEditClick = (lessonId: string) => {
    router.push(`/dashboard/lessons/edit/${lessonId}`);
  };

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
            <div>
              <CardTitle>Lessons Management</CardTitle>
              <CardDescription>
                Manage all lessons, grouped by course.
              </CardDescription>
            </div>
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                    placeholder="Search courses or lessons..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9 w-full sm:w-64"
                />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex h-64 items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : Object.keys(groupedLessons).length > 0 ? (
             <Accordion type="single" collapsible className="w-full">
                {Object.values(groupedLessons).map(({ courseDetails, lessons }) => (
                  <AccordionItem value={courseDetails.id} key={courseDetails.id}>
                    <AccordionTrigger>
                      <div className="flex flex-col md:flex-row md:items-center justify-between w-full pr-4">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="text-lg font-semibold">{courseDetails.title}</span>
                          <Badge variant="outline" className="font-mono text-xs">{courseDetails.id}</Badge>
                        </div>
                        <div className="flex items-center gap-2 mt-2 md:mt-0 text-sm">
                           {courseDetails.courseCode && <Badge variant="outline" className="font-mono">{courseDetails.courseCode}</Badge>}
                           {courseDetails.competency && <Badge variant="secondary">{courseDetails.competency}</Badge>}
                           {courseDetails.difficulty && <Badge variant="secondary">{courseDetails.difficulty}</Badge>}
                        </div>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                       <div className="overflow-x-auto rounded-md border">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="w-[40%]">Lesson Title</TableHead>
                              <TableHead className="w-[30%]">Lesson ID</TableHead>
                              <TableHead className="w-[30%] text-right">
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  onClick={() => handleBulkDeleteClick(courseDetails, lessons)}
                                  disabled={isDeleting}
                                >
                                  <Trash2 className="mr-2 h-4 w-4" />
                                  Delete All
                                </Button>
                              </TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {lessons.map((lesson) => (
                              <TableRow key={lesson.id}>
                                <TableCell className="font-medium">{lesson.title}</TableCell>
                                <TableCell className="font-mono text-xs text-muted-foreground">{lesson.id}</TableCell>
                                <TableCell className="text-right">
                                  <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    onClick={() => handleEditClick(lesson.id)}
                                  >
                                    <Edit className="h-4 w-4" />
                                    <span className="sr-only">Edit Lesson</span>
                                  </Button>
                                  <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    onClick={() => handleDeleteClick(lesson, courseDetails)}
                                    className="text-destructive hover:text-destructive"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                    <span className="sr-only">Delete Lesson</span>
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
                    <h3 className="mt-4 text-lg font-semibold">
                      {searchTerm ? 'No Matching Lessons Found' : 'No Lessons Found'}
                    </h3>
                    <p className="mt-1 max-w-sm mx-auto text-sm">
                      {searchTerm 
                        ? 'Try a different search term or create a new course.'
                        : "Create courses via the 'Add Course' page to see them here."
                      }
                    </p>
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
              This action cannot be undone. This will permanently delete the lesson
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

       <AlertDialog open={!!courseToBulkDelete} onOpenChange={(open) => !open && setCourseToBulkDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete All Lessons?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete all 
              <span className="font-bold"> {courseToBulkDelete?.lessonCount} lessons</span> from the course
              <span className="font-bold"> "{courseToBulkDelete?.title}"</span>.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmBulkDelete} disabled={isDeleting} className="bg-destructive hover:bg-destructive/90">
              {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirm & Delete All
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export default function LessonsPage() {
  return (
    <AdminAuthGuard>
      <LessonsContent />
    </AdminAuthGuard>
  )
}
