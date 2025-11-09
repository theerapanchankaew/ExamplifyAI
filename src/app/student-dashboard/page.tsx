
'use client';

import { useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useFirestore, useUser, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, orderBy, limit, documentId, Timestamp } from 'firebase/firestore';
import { format } from 'date-fns';

import type { UserProfile, Attempt, CourseAchievement } from '@/types';
import type { Course } from '@/types/course';

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Progress } from '@/components/ui/progress';
import { Loader2, BookCheck, Percent, Award, History, ChevronsRight, Library } from 'lucide-react';
import { PlaceholderContent } from '@/components/placeholder-content';
import { PlaceHolderImages } from '@/lib/placeholder-images';

type EnrichedAttempt = Attempt & {
  courseTitle?: string;
};

function StudentDashboardContent() {
  const firestore = useFirestore();
  const { user, isUserLoading } = useUser();

  // --- Data Fetching ---
  const userProfileQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return doc(firestore, 'users', user.uid);
  }, [firestore, user]);
  const { data: userProfile, isLoading: profileLoading } = useDoc<UserProfile>(userProfileQuery);
  const enrolledCourseIds = useMemo(() => userProfile?.enrolledCourseIds || [], [userProfile]);

  const attemptsQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(collection(firestore, 'attempts'), where('userId', '==', user.uid), orderBy('timestamp', 'desc'));
  }, [firestore, user]);
  const { data: allAttempts, isLoading: attemptsLoading } = useCollection<Attempt>(attemptsQuery);
  
  const achievementsQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(collection(firestore, `users/${user.uid}/achievements`));
  }, [firestore, user]);
  const { data: achievements, isLoading: achievementsLoading } = useCollection<CourseAchievement>(achievementsQuery);

  const allCoursesQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return collection(firestore, 'courses');
  }, [firestore]);
  const { data: allCourses, isLoading: coursesLoading } = useCollection<Course>(allCoursesQuery);
  const coursesMap = useMemo(() => new Map(allCourses?.map(c => [c.id, c])), [allCourses]);

  // --- Data Processing ---
  const { coursesInProgress, passedCourseIds } = useMemo(() => {
    if (!allAttempts || enrolledCourseIds.length === 0) {
      return { coursesInProgress: coursesMap.size > 0 ? enrolledCourseIds.map(id => coursesMap.get(id)).filter(Boolean) as Course[] : [], passedCourseIds: new Set<string>() };
    }
    const passedIds = new Set<string>();
    allAttempts.forEach(attempt => {
      if (attempt.pass && attempt.courseId) {
        passedIds.add(attempt.courseId);
      }
    });
    const inProgressIds = enrolledCourseIds.filter(id => !passedIds.has(id));
    const inProgressCourses = inProgressIds.map(id => coursesMap.get(id)).filter((c): c is Course => !!c);
    
    return { coursesInProgress: inProgressCourses, passedCourseIds };
  }, [allAttempts, enrolledCourseIds, coursesMap]);

  const recentAttempts = useMemo<EnrichedAttempt[]>(() => {
    if (!allAttempts) return [];
    return allAttempts.slice(0, 5).map(attempt => ({
      ...attempt,
      courseTitle: coursesMap.get(attempt.courseId)?.title || 'Unknown Course'
    }));
  }, [allAttempts, coursesMap]);
  
  const stats = useMemo(() => {
    const totalAttempts = allAttempts?.length || 0;
    const passingAttempts = allAttempts?.filter(a => a.pass).length || 0;
    const passRate = totalAttempts > 0 ? (passingAttempts / totalAttempts) * 100 : 0;
    return {
      completedCourses: passedCourseIds.size,
      passRate: passRate,
      achievementsCount: achievements?.length || 0
    };
  }, [allAttempts, passedCourseIds, achievements]);

  const isLoading = isUserLoading || profileLoading || attemptsLoading || achievementsLoading || coursesLoading;
  
  if (isLoading) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <Loader2 className="h-16 w-16 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-3xl font-bold font-headline">Welcome back, {userProfile?.name || 'Student'}!</h1>
        <p className="text-muted-foreground mt-1">Here's a snapshot of your learning journey.</p>
      </div>
      
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Completed Courses</CardTitle><BookCheck className="h-4 w-4 text-muted-foreground" /></CardHeader>
          <CardContent><div className="text-2xl font-bold">{stats.completedCourses}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Overall Pass Rate</CardTitle><Percent className="h-4 w-4 text-muted-foreground" /></CardHeader>
          <CardContent><div className="text-2xl font-bold">{stats.passRate.toFixed(1)}%</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"><CardTitle className="text-sm font-medium">Qualifications Earned</CardTitle><Award className="h-4 w-4 text-muted-foreground" /></CardHeader>
          <CardContent><div className="text-2xl font-bold">{stats.achievementsCount}</div></CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div>
          <h2 className="text-2xl font-bold font-headline mb-4">Courses in Progress</h2>
          {coursesInProgress.length > 0 ? (
            <div className="space-y-4">
              {coursesInProgress.slice(0, 3).map((course, index) => (
                <Card key={course.id} className="hover:border-primary/50 transition-colors">
                  <CardContent className="p-4 flex items-center gap-4">
                    <Image src={PlaceHolderImages[index % 3 + 2].imageUrl} alt={course.title} width={80} height={50} className="rounded-md aspect-video object-cover" />
                    <div className="flex-1">
                      <h3 className="font-semibold leading-tight">{course.title}</h3>
                      <p className="text-xs text-muted-foreground">{course.competency}</p>
                    </div>
                    <Button asChild size="sm">
                      <Link href={`/student-dashboard/learn/${course.id}`}>Continue</Link>
                    </Button>
                  </CardContent>
                </Card>
              ))}
               {coursesInProgress.length > 3 && (
                <Link href="/student-dashboard/my-courses" className="text-sm font-medium text-primary hover:underline flex items-center justify-center pt-2">
                    View All In-Progress Courses <ChevronsRight className="h-4 w-4 ml-1" />
                </Link>
              )}
            </div>
          ) : (
            <PlaceholderContent icon={Library} title="All Caught Up!" description="You've passed all your enrolled courses. Visit the marketplace to find your next challenge." />
          )}
        </div>
        
        <div>
          <h2 className="text-2xl font-bold font-headline mb-4">Recent History</h2>
          <Card>
            <CardContent className="p-0">
               <div className="overflow-x-auto">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Course</TableHead>
                            <TableHead className="text-right">Score</TableHead>
                            <TableHead className="text-center">Result</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {recentAttempts.length > 0 ? recentAttempts.map(attempt => (
                            <TableRow key={attempt.id}>
                                <TableCell className="font-medium truncate max-w-[200px]">{attempt.courseTitle}</TableCell>
                                <TableCell className="text-right font-code">{attempt.score}%</TableCell>
                                <TableCell className="text-center"><Badge variant={attempt.pass ? 'secondary' : 'destructive'}>{attempt.pass ? 'Passed' : 'Failed'}</Badge></TableCell>
                            </TableRow>
                        )) : (
                            <TableRow>
                                <TableCell colSpan={3} className="h-24 text-center">
                                    <History className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
                                    No exam history yet.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
                </div>
            </CardContent>
          </Card>
          {recentAttempts.length > 0 && (
             <Link href="/student-dashboard/my-history" className="text-sm font-medium text-primary hover:underline flex items-center justify-center pt-4">
                View Full History <ChevronsRight className="h-4 w-4 ml-1" />
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

export default function StudentDashboardPage() {
    return <StudentDashboardContent />;
}
