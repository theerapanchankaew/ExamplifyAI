'use client'

import { useMemo } from 'react';
import { useFirestore, useUser, useCollection, useDoc, useMemoFirebase } from '@/firebase';
import { collection, doc, documentId, query, where } from 'firebase/firestore';
import type { UserProfile } from '@/types';
import type { Roadmap } from '@/types/roadmap';
import type { Course } from '@/types/course';
import { Loader2, Zap, Lock, Unlock, CheckCircle } from 'lucide-react';
import { PlaceholderContent } from '@/components/placeholder-content';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function MyRoadmapPage() {
  const firestore = useFirestore();
  const { user } = useUser();

  // 1. Fetch user's profile to get their assigned roadmap and enrolled courses
  const userDocRef = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return doc(firestore, 'users', user.uid);
  }, [firestore, user]);
  const { data: userProfile, isLoading: profileLoading } = useDoc<UserProfile>(userDocRef);
  const roadmapId = userProfile?.mandatoryLearningPath?.[0]; // Assuming one mandatory roadmap
  const enrolledCourseIds = userProfile?.enrolledCourseIds || [];

  // 2. Fetch the assigned roadmap
  const roadmapDocRef = useMemoFirebase(() => {
    if (!firestore || !roadmapId) return null;
    return doc(firestore, 'roadmaps', roadmapId);
  }, [firestore, roadmapId]);
  const { data: roadmap, isLoading: roadmapLoading } = useDoc<Roadmap>(roadmapDocRef);

  // 3. Fetch courses in the roadmap
  const roadmapCoursesQuery = useMemoFirebase(() => {
    if (!firestore || !roadmap?.steps || roadmap.steps.length === 0) return null;
    return query(collection(firestore, 'courses'), where(documentId(), 'in', roadmap.steps));
  }, [firestore, roadmap]);
  const { data: courses, isLoading: coursesLoading } = useCollection<Course>(roadmapCoursesQuery);

  const orderedCourses = useMemo(() => {
    if (!roadmap || !courses) return [];
    const courseMap = new Map(courses.map(c => [c.id, c]));
    return roadmap.steps.map(stepId => courseMap.get(stepId)).filter((c): c is Course => !!c);
  }, [roadmap, courses]);


  const isLoading = profileLoading || roadmapLoading || coursesLoading;

  if (isLoading) {
    return (
      <div className="flex h-[60vh] w-full items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (!roadmap) {
    return (
      <PlaceholderContent
        icon={Zap}
        title="No Roadmap Assigned"
        description="You have not been assigned a learning roadmap yet. Explore the marketplace to enroll in individual courses."
      />
    );
  }
  
  let firstLocked = false;

  return (
     <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-3xl font-bold font-headline">{roadmap.title}</h1>
        <p className="text-muted-foreground mt-1">Your guided learning path. Complete each course to unlock the next.</p>
      </div>

       <div className="relative pl-6">
        {/* The vertical line */}
        <div className="absolute left-[36px] top-0 h-full w-0.5 bg-border -translate-x-1/2"></div>
        
        <div className="space-y-12">
            {orderedCourses.map((course, index) => {
                const isEnrolled = enrolledCourseIds.includes(course.id);
                const isUnlocked = index === 0 || enrolledCourseIds.includes(orderedCourses[index-1]?.id);
                
                let statusIcon;
                if(isEnrolled) {
                    statusIcon = <CheckCircle className="h-8 w-8 text-green-500 bg-background" />;
                } else if (isUnlocked) {
                    statusIcon = <Unlock className="h-8 w-8 text-primary bg-background" />;
                } else {
                    statusIcon = <Lock className="h-8 w-8 text-muted-foreground bg-background" />;
                }

                return (
                    <div key={course.id} className="relative flex items-start gap-6">
                        <div className="absolute left-0 top-1.5 flex h-8 w-8 items-center justify-center rounded-full bg-border -translate-x-1/2">
                            {statusIcon}
                        </div>
                        <Card className={`w-full ${!isUnlocked && 'bg-muted/50'}`}>
                           <CardHeader>
                                <CardTitle>{course.title}</CardTitle>
                                <CardDescription>{course.description}</CardDescription>
                           </CardHeader>
                           <CardContent>
                            <div className="flex items-center justify-between">
                                <Badge variant={isEnrolled ? "default" : "secondary"}>
                                    {isEnrolled ? "Enrolled" : isUnlocked ? "Unlocked" : "Locked"}
                                </Badge>
                                <Link href={isEnrolled ? "/student-dashboard/my-courses" : "/student-dashboard/marketplace"} passHref>
                                    <Button disabled={!isUnlocked}>
                                        {isEnrolled ? "Go to Course" : "Go to Marketplace"}
                                    </Button>
                                </Link>
                            </div>
                           </CardContent>
                        </Card>
                    </div>
                )
            })}
        </div>
       </div>
    </div>
  );
}
