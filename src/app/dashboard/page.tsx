
'use client';

import { useMemo, useState } from 'react';
import { useFirestore, useCollection, useUser, useDoc, useMemoFirebase } from '@/firebase';
import { collection, query, where, doc } from 'firebase/firestore';
import type { Attempt, UserProfile } from '@/types';
import type { Course } from '@/types/course';
import { Loader2 } from 'lucide-react';
import { AdminAuthGuard } from '@/components/admin-auth-guard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { PlaceholderContent } from '@/components/placeholder-content';
import { TrendingUp } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

// This component will only be rendered if the user is an admin, thanks to AdminAuthGuard.
function DashboardDataContainer() {
  const firestore = useFirestore();
  const [selectedCourseId, setSelectedCourseId] = useState<string>('all');
  
  // Now it's safe to query for all users and attempts because this component only mounts for admins.
  const { data: users, isLoading: usersLoading } = useCollection<UserProfile>(
    useMemoFirebase(() => firestore ? query(collection(firestore, 'users')) : null, [firestore])
  );

  const { data: allAttempts, isLoading: attemptsLoading } = useCollection<Attempt>(
    useMemoFirebase(() => firestore ? query(collection(firestore, 'attempts')) : null, [firestore])
  );

  const { data: courses, isLoading: coursesLoading } = useCollection<Course>(
    useMemoFirebase(() => firestore ? collection(firestore, 'courses') : null, [firestore])
  );
  
  const usersMap = useMemo(() => {
    const map = new Map<string, UserProfile>();
    if (users) {
      users.forEach(u => u.userId && map.set(u.userId, u));
    }
    return map;
  }, [users]);
  
  const attempts = useMemo(() => {
    if (!allAttempts) return [];
    if (selectedCourseId === 'all') {
        return allAttempts;
    }
    const courseId = courses?.find(c => c.id === selectedCourseId)?.id;
    // This logic might be incorrect if the attempt doesn't have a courseId. Assuming it does.
    const attemptCourseId = allAttempts[0]?.courseId;
    if (!courseId && !attemptCourseId) return allAttempts;
    return allAttempts.filter(attempt => (attempt.courseId && attempt.courseId === courseId) || (attemptCourseId && attemptCourseId === courseId));
  }, [allAttempts, selectedCourseId, courses]);


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

  const isLoading = usersLoading || attemptsLoading || coursesLoading;

  if (isLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <div className="text-center">
          <Loader2 className="mx-auto h-12 w-12 animate-spin text-primary mb-4" />
          <p className="text-muted-foreground">Loading dashboard data...</p>
        </div>
      </div>
    );
  }
  
  return (
     <div className="flex flex-col gap-8">
       <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold font-headline">Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            System-wide analytics and exam results.
          </p>
        </div>
        <div className="w-full sm:w-64">
          <Select
            onValueChange={setSelectedCourseId}
            value={selectedCourseId}
            disabled={!courses?.length}
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
                Top 10 users by highest score.
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
                            {user.name}
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
          description="No exam attempts have been recorded yet."
        />
      )}
    </div>
  );
}

export default function DashboardPage() {
  return (
    <AdminAuthGuard>
      <DashboardDataContainer />
    </AdminAuthGuard>
  );
}
