'use client';

import { useMemo, useState } from 'react';
import { useFirestore, useCollection, useMemoFirebase, useUser, useDoc } from '@/firebase';
import { collection, query, where, Timestamp, doc } from 'firebase/firestore';
import { format } from 'date-fns';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Loader2, AlertCircle, TrendingUp } from 'lucide-react';
import type { Attempt, UserProfile } from '@/types';
import type { Course } from '@/types/course';
import { PlaceholderContent } from '@/components/placeholder-content';
import { AdminAuthGuard } from '@/components/admin-auth-guard';

function ReportsContent() {
  const firestore = useFirestore();
  const { user: authUser, isUserLoading: isAuthLoading } = useUser();
  const [selectedCourseId, setSelectedCourseId] = useState<string>('all');

  const userDocRef = useMemoFirebase(() => {
    if (!firestore || !authUser) return null;
    return doc(firestore, 'users', authUser.uid);
  }, [firestore, authUser]);

  const { data: userProfile, isLoading: isProfileLoading } = useDoc<UserProfile>(userDocRef);

  const isAdmin = useMemo(() => {
    return !!authUser && !isAuthLoading && !isProfileLoading && userProfile?.role === 'admin';
  }, [authUser, isAuthLoading, isProfileLoading, userProfile]);

  const isAuthResolved = !isAuthLoading && !isProfileLoading;

  const coursesQuery = useMemoFirebase(() => {
    if (!firestore || !isAuthResolved) return null;
    return collection(firestore, 'courses');
  }, [firestore, isAuthResolved]);

  const { data: courses, isLoading: coursesLoading } = useCollection<Course>(coursesQuery);

  const usersQuery = useMemoFirebase(() => {
    if (!firestore || !isAuthResolved || !isAdmin) return null;
    return collection(firestore, 'users');
  }, [firestore, isAuthResolved, isAdmin]);

  const { data: users, isLoading: usersLoading } = useCollection<UserProfile>(usersQuery);

  const usersMap = useMemo(() => {
    const map = new Map<string, UserProfile>();
    if (isAdmin && users) {
      users.forEach(u => u.userId && map.set(u.userId, u));
    } else if (userProfile?.userId) {
      map.set(userProfile.userId, userProfile);
    }
    return map;
  }, [isAdmin, users, userProfile]);

  const attemptsQuery = useMemoFirebase(() => {
    if (!firestore || !isAuthResolved || !authUser) {
      return null;
    }
    const attemptsRef = collection(firestore, 'attempts');
    if (isAdmin) {
      return attemptsRef;
    }
    return query(attemptsRef, where('userId', '==', authUser.uid));
  }, [firestore, isAuthResolved, authUser, isAdmin]);

  const { data: allAttempts, isLoading: attemptsLoading, error: attemptsError } = useCollection<Attempt>(attemptsQuery);

  const attempts = useMemo(() => {
    if (!allAttempts) return [];
    return selectedCourseId === 'all'
      ? allAttempts
      : allAttempts.filter(attempt => attempt.courseId === selectedCourseId);
  }, [allAttempts, selectedCourseId]);

  const reportData = useMemo(() => {
    if (!attempts || attempts.length === 0) return null;

    const totalAttempts = attempts.length;
    const passingAttempts = attempts.filter(a => a.pass).length;
    const passRate = totalAttempts > 0 ? (passingAttempts / totalAttempts) * 100 : 0;
    const averageScore = totalAttempts > 0 ? attempts.reduce((acc, a) => acc + a.score, 0) / totalAttempts : 0;

    const leaderboardMap = new Map<string, any>();
    attempts.forEach(attempt => {
      const user = usersMap.get(attempt.userId);
      if (!user) return;

      if (!leaderboardMap.has(attempt.userId)) {
        leaderboardMap.set(attempt.userId, {
          ...user,
          highestScore: 0,
          attemptsCount: 0,
          lastAttempt: new Date(0),
        });
      }

      const record = leaderboardMap.get(attempt.userId);
      record.attemptsCount++;
      if (attempt.score > record.highestScore) {
        record.highestScore = attempt.score;
      }
      const attemptDate = attempt.timestamp?.toDate?.() || new Date(attempt.timestamp as any);
      if (attemptDate > record.lastAttempt) {
        record.lastAttempt = attemptDate;
      }
    });

    const sortedLeaderboard = Array.from(leaderboardMap.values())
      .sort((a, b) => b.highestScore - a.highestScore)
      .slice(0, 10);

    return { totalAttempts, passingAttempts, passRate, averageScore, sortedLeaderboard };
  }, [attempts, usersMap]);

  const isLoading = isAuthLoading || isProfileLoading || coursesLoading || attemptsLoading || (isAdmin && usersLoading);
  const hasError = attemptsError;

  if (hasError) {
    return (
      <div className="flex h-full min-h-[80vh] items-center justify-center p-6">
        <div className="max-w-2xl w-full text-center bg-destructive/10 p-6 rounded-lg">
          <AlertCircle className="mx-auto h-12 w-12 text-destructive mb-4" />
          <h3 className="text-xl font-bold mb-2">Failed to Load Reports</h3>
          <p className="text-muted-foreground mb-4">
            {hasError?.message || 'An unknown error occurred.'}
          </p>
          <p className="text-sm text-muted-foreground">
            This is likely due to a permissions issue. Please contact support.
          </p>
        </div>
      </div>
    );
  }

  if (isLoading && !reportData) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <div className="text-center">
          <Loader2 className="mx-auto h-12 w-12 animate-spin text-primary mb-4" />
          <p className="text-muted-foreground">Loading reports...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold font-headline">Reports & Analytics</h1>
          <p className="text-muted-foreground mt-1">
            {isAdmin ? 'View system-wide exam analytics' : 'View your personal exam results'}
          </p>
        </div>
        <div className="w-full sm:w-64">
          <Select
            onValueChange={setSelectedCourseId}
            value={selectedCourseId}
            disabled={isLoading || !courses?.length}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select a course..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Courses</SelectItem>
              {courses?.map(course => (
                <SelectItem key={course.id} value={course.id}>
                  {course.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {reportData ? (
        <>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader><CardTitle>Total Attempts</CardTitle></CardHeader>
              <CardContent><p className="text-4xl font-bold font-headline">{reportData.totalAttempts}</p></CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>Passing Attempts</CardTitle></CardHeader>
              <CardContent><p className="text-4xl font-bold font-headline">{reportData.passingAttempts}</p></CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>Overall Pass Rate</CardTitle></CardHeader>
              <CardContent><p className="text-4xl font-bold font-headline text-primary">{reportData.passRate.toFixed(1)}%</p></CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle>Average Score</CardTitle></CardHeader>
              <CardContent><p className="text-4xl font-bold font-headline">{reportData.averageScore.toFixed(1)}%</p></CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Leaderboard</CardTitle>
              <CardDescription>
                {isAdmin 
                  ? 'Top 10 users by highest score' 
                  : 'Your attempt history'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[50px]">Rank</TableHead>
                      <TableHead>User</TableHead>
                      <TableHead className="text-right">Highest Score</TableHead>
                      <TableHead className="text-right">Attempts</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reportData.sortedLeaderboard.length > 0 ? (
                      reportData.sortedLeaderboard.map((user, index) => (
                        <TableRow key={user.userId}>
                          <TableCell className="font-bold text-lg">{index + 1}</TableCell>
                          <TableCell className="font-medium">
                            {isAdmin ? user.name : 'You'}
                          </TableCell>
                          <TableCell className="text-right font-code text-primary font-bold">
                            {user.highestScore}%
                          </TableCell>
                          <TableCell className="text-right font-code">
                            {user.attemptsCount}
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-4">
                          No attempts found
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </>
      ) : (
        <PlaceholderContent
          icon={TrendingUp}
          title="No Exam Data"
          description={
            selectedCourseId === 'all'
              ? (isAdmin 
                  ? "No exam attempts have been recorded yet." 
                  : "You haven't taken any exams yet.")
              : (isAdmin 
                  ? "No attempts for this course." 
                  : "You haven't taken this exam yet.")
          }
        />
      )}
    </div>
  );
}

export default function ReportsPage() {
  return (
    <AdminAuthGuard>
      <ReportsContent />
    </AdminAuthGuard>
  );
}
