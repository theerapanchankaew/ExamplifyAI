'use client'

import { useMemoFirebase } from "@/firebase/provider";
import { useCollection } from "@/firebase";
import { useFirestore } from "@/firebase/provider";
import { collection } from "firebase/firestore";
import type { Course } from "@/types/course";

import Image from "next/image";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, BookOpen } from "lucide-react";
import { PlaceHolderImages } from "@/lib/placeholder-images";

export default function MyCoursesPage() {
  const firestore = useFirestore();
  const coursesQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return collection(firestore, 'courses');
  }, [firestore]);

  const { data: courses, isLoading } = useCollection<Course>(coursesQuery);

  const getCourseImage = (index: number) => {
    const imageId = `course-placeholder-${(index % 3) + 1}`;
    const image = PlaceHolderImages.find(img => img.id === imageId);
    return image || PlaceHolderImages[2]; // fallback to a default image
  };

  if (isLoading) {
    return (
      <div className="flex h-[60vh] w-full items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
          <p className="text-muted-foreground">Loading your courses...</p>
        </div>
      </div>
    );
  }

  if (!courses || courses.length === 0) {
    return (
        <div className="flex h-[60vh] w-full items-center justify-center rounded-lg border-2 border-dashed">
            <div className="text-center">
                <BookOpen className="mx-auto h-12 w-12 text-muted-foreground" />
                <h2 className="mt-4 text-2xl font-bold font-headline tracking-tight">No Courses Found</h2>
                <p className="mt-2 text-muted-foreground">You are not enrolled in any courses yet. Browse the marketplace to get started.</p>
                <Button className="mt-6">Browse Marketplace</Button>
            </div>
        </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
       <div>
        <h1 className="text-3xl font-bold font-headline">My Courses</h1>
        <p className="text-muted-foreground mt-1">Here are all the courses you are enrolled in. Select a course to start the exam.</p>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {courses.map((course, index) => {
          const courseImage = getCourseImage(index);
          return (
            <Card key={course.id} className="flex flex-col overflow-hidden">
              <div className="relative">
                <Image 
                  src={courseImage.imageUrl} 
                  alt={course.title} 
                  width={600} 
                  height={400} 
                  className="w-full aspect-video object-cover"
                  data-ai-hint={courseImage.imageHint}
                />
                <Badge variant="secondary" className="absolute top-2 right-2">{course.difficulty}</Badge>
              </div>
              <CardHeader>
                <CardTitle className="text-lg font-semibold line-clamp-2">{course.title}</CardTitle>
                {course.description && <CardDescription className="line-clamp-3 text-sm mt-1">{course.description}</CardDescription>}
              </CardHeader>
              <CardContent className="flex-grow flex flex-col justify-end">
                <Button className="w-full mt-4">Start Exam</Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
