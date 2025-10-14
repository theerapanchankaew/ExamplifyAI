
'use client';

import { useMemo } from 'react';
import { useFirestore, useUser, useCollection } from '@/firebase';
import { useMemoFirebase } from '@/firebase/provider';
import { collection, query, where, orderBy, Timestamp } from 'firebase/firestore';
import { format } from 'date-fns';

import type { Attempt } from '@/types';
import type { Course } from '@/types/course';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Loader2, History, AlertCircle } from 'lucide-react';

// Extend Attempt to include course details
type EnrichedAttempt = Attempt & {
  courseTitle?: string;
  courseCode?: string;
};

export default function MyHistoryPage() {
  const firestore = useFirestore();
  const { user, isUserLoading } = useUser();

  // 1. Fetch all attempts for the current user, ordered by date
  const attemptsQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(
      collection(firestore, 'attempts'),
      where('userId', '==', user.uid),
      orderBy('timestamp', 'desc')
    );
  }, [firestore, user]);
  const { data: attempts, isLoading: attemptsLoading } = useCollection<Attempt>(attemptsQuery);

  // 2. Fetch all courses to map attempt data to course titles
  const coursesQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return collection(firestore, 'courses');
  }, [firestore]);
  const { data: courses, isLoading: coursesLoading } = useCollection<Course>(coursesQuery);

  // 3. Combine attempts with course data
  const enrichedAttempts = useMemo<EnrichedAttempt[]>(() => {
    if (!attempts || !courses) return [];
    const coursesMap = new Map(courses.map(c => [c.id, c]));
    return attempts.map(attempt => ({
      ...attempt,
      courseTitle: coursesMap.get(attempt.courseId || '')?.title || 'Unknown Course',
      courseCode: coursesMap.get(attempt.courseId || '')?.courseCode,
    }));
  }, [attempts, courses]);
  
  const isLoading = isUserLoading || attemptsLoading || coursesLoading;

  if (isLoading) {
    return (
      <div className="flex h-[60vh] w-full items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-3xl font-bold font-headline">My Exam History</h1>
        <p className="text-muted-foreground mt-1">A record of all your past exam attempts and scores.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Attempt History</CardTitle>
          <CardDescription>Review your performance over time.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Course</TableHead>
                  <TableHead>Course Code</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className="text-right">Score</TableHead>
                  <TableHead className="text-center">Result</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {enrichedAttempts && enrichedAttempts.length > 0 ? (
                  enrichedAttempts.map((attempt) => (
                    <TableRow key={attempt.id}>
                      <TableCell className="font-medium">{attempt.courseTitle}</TableCell>
                       <TableCell className="font-mono text-xs">{attempt.courseCode || 'N/A'}</TableCell>
                      <TableCell>
                        {attempt.timestamp ? format((attempt.timestamp as unknown as Timestamp).toDate(), 'PPp') : 'N/A'}
                      </TableCell>
                      <TableCell className="text-right font-code">{attempt.score}%</TableCell>
                      <TableCell className="text-center">
                        <Badge variant={attempt.pass ? 'secondary' : 'destructive'}>
                          {attempt.pass ? 'Passed' : 'Failed'}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center">
                      <History className="mx-auto h-8 w-8 text-muted-foreground mb-2" />
                      No exam history found.
                      <p className="text-xs text-muted-foreground">Complete an exam to see your results here.</p>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
