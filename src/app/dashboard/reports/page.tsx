
'use client';

import { useMemo, useState } from 'react';
import { useFirestore, useCollection, useMemoFirebase, useUser } from '@/firebase';
import { collection, query, where, Timestamp } from 'firebase/firestore';
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
  const { user } = useUser();
  const [selectedCourseId, setSelectedCourseId] = useState<string>('all');

  const coursesQuery = useMemoFirebase(() => firestore ? collection(firestore, 'courses') : null, [firestore]);
  const { data: courses, isLoading: coursesLoading } = useCollection<Course>(coursesQuery);

  const usersQuery = useMemoFirebase(() => firestore ? collection(firestore, 'users') : null, [firestore]);
  const { data: users, isLoading: usersLoading } = useCollection<UserProfile>(usersQuery);
  const usersMap = useMemo(() => new Map(users?.map(u => [u.userId, u])), [users]);

  const attemptsQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    
    let q = query(collection(firestore, 'attempts'));

    // Non-admins can only see their own attempts
    // This query will fail for non-admins if they don't have the rule for it.
    // The security rule is: allow read: if isSignedIn() && (resource.data.userId == request.auth.uid);
    // However, for list operations, you need a where clause.
    // Let's assume non-admins should only query their own data.
    // We will add a guard for this page later. For now, let's make the query conditional.
    // A better approach is to have a separate view for student vs admin reports.
    // But for now, we just filter the query.
    // Let's assume a user with role 'admin' is an admin.
    // This check is imperfect on the client, but it's a start.
    
    // The main issue is that `list` is admin-only. So a non-admin CANNOT list all attempts.
    // They MUST query with their UID.

    const baseQuery = collection(firestore, 'attempts');
    const queries = [];

    // This is a client-side check. A truly secure app relies on Firestore rules.
    // We assume non-admin users should only see their own attempts.
    if (user) { // Always filter by user for non-admins
        queries.push(where('userId', '==', user.uid));
    }
    
    if (selectedCourseId !== 'all') {
      queries.push(where('courseId', '==', selectedCourseId));
    }

    return query(baseQuery, ...queries);
  }, [firestore, user, selectedCourseId]);

  const { data: attempts, isLoading: attemptsLoading, error: attemptsError } = useCollection<Attempt>(attemptsQuery);
  
  const courseMap = useMemo(() => new Map(courses?.map(c => [c.id, c])), [courses]);

  const reportData = useMemo(() => {
    if (!attempts) return null;
    const totalAttempts = attempts.length;
    const passingAttempts = attempts.filter(a => a.pass).length;
    const passRate = totalAttempts > 0 ? (passingAttempts / totalAttempts) * 100 : 0;
    const averageScore = totalAttempts > 0 ? attempts.reduce((acc, a) => acc + a.score, 0) / totalAttempts : 0;

    const leaderboard = attempts.reduce((acc, attempt) => {
        const user = usersMap.get(attempt.userId);
        if (user) {
            if (!acc[user.userId]) {
                acc[user.userId] = { 
                    ...user, 
                    highestScore: 0, 
                    attemptsCount: 0,
                    lastAttempt: new Date(0)
                };
            }
            const userData = acc[user.userId];
            userData.attemptsCount++;
            if (attempt.score > userData.highestScore) {
                userData.highestScore = attempt.score;
            }
            const attemptDate = (attempt.timestamp as unknown as Timestamp)?.toDate();
            if (attemptDate && attemptDate > userData.lastAttempt) {
                userData.lastAttempt = attemptDate;
            }
        }
        return acc;
    }, {} as Record<string, UserProfile & { highestScore: number; attemptsCount: number, lastAttempt: Date }>);
    
    const sortedLeaderboard = Object.values(leaderboard).sort((a, b) => b.highestScore - a.highestScore).slice(0, 10);

    return { totalAttempts, passingAttempts, passRate, averageScore, sortedLeaderboard };
  }, [attempts, usersMap]);


  const isLoading = coursesLoading || attemptsLoading || usersLoading;
  
   if (attemptsError) {
        return (
            <div className="flex h-full min-h-[80vh] items-center justify-center text-destructive p-4 rounded-md bg-destructive/10">
                <pre className='whitespace-pre-wrap text-sm'>{attemptsError.message}</pre>
            </div>
        )
    }

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold font-headline">Reports & Analytics</h1>
          <p className="text-muted-foreground mt-1">Analyze exam results, pass rates, and performance.</p>
        </div>
        <div className="w-full sm:w-64">
           <Select onValueChange={setSelectedCourseId} defaultValue="all" disabled={isLoading}>
                <SelectTrigger>
                    <SelectValue placeholder="Select a course..." />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">All Courses</SelectItem>
                    {courses?.map(course => (
                        <SelectItem key={course.id} value={course.id}>{course.title}</SelectItem>
                    ))}
                </SelectContent>
            </Select>
        </div>
      </div>
      
      {isLoading ? (
        <div className="flex h-[50vh] w-full items-center justify-center">
            <Loader2 className="h-16 w-16 animate-spin text-primary" />
        </div>
      ) : !reportData || reportData.totalAttempts === 0 ? (
         <PlaceholderContent 
            icon={TrendingUp}
            title="No Data Available"
            description={selectedCourseId === 'all' ? "There are no exam attempts in the system yet." : "There are no exam attempts for the selected course."}
        />
      ) : (
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
                    <CardDescription>Top 10 users by highest score in the selected scope.</CardDescription>
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
                            {reportData.sortedLeaderboard.map((user, index) => (
                                <TableRow key={user.userId}>
                                    <TableCell className="font-bold text-lg">{index + 1}</TableCell>
                                    <TableCell className="font-medium">{user.name}</TableCell>
                                    <TableCell className="text-right font-code text-primary font-bold">{user.highestScore}%</TableCell>
                                    <TableCell className="text-right font-code">{user.attemptsCount}</TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>
        </>
      )}

    </div>
  );
}

export default function ReportsPage() {
  return (
    <AdminAuthGuard>
      <ReportsContent />
    </AdminAuthGuard>
  )
}

    