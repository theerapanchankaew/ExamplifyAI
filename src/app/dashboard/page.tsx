
'use client';

import { useMemo, useState } from 'react';
import { useFirestore, useCollection, useUser, useDoc, useMemoFirebase } from '@/firebase';
import { collection, query, where, doc } from 'firebase/firestore';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, TrendingUp, AlertCircle } from 'lucide-react';
import type { Attempt, UserProfile } from '@/types';
import type { Course } from '@/types/course';
import { PlaceholderContent } from '@/components/placeholder-content';
import { AdminAuthGuard } from '@/components/admin-auth-guard';

function ReportsContent() {
  const firestore = useFirestore();
  const { user: authUser, isUserLoading: isAuthLoading } = useUser();
  const [selectedCourseId, setSelectedCourseId] = useState<string>('all');

  const userDocRef = useMemoFirebase(() => {
    if (!firestore || !authUser?.uid) return null;
    return doc(firestore, 'users', authUser.uid);
  }, [firestore, authUser?.uid]);

  const { data: userProfile, isLoading: isProfileLoading } = useDoc<UserProfile>(userDocRef);

  const isAuthResolved = !isAuthLoading && authUser && !isProfileLoading;

  const isAdmin = useMemo(() => {
    return isAuthResolved && userProfile?.role === 'admin';
  }, [isAuthResolved, userProfile]);

  const coursesQuery = useMemoFirebase(() => {
    return firestore ? collection(firestore, 'courses') : null;
  }, [firestore]);

  const { data: courses, isLoading: coursesLoading } = useCollection<Course>(coursesQuery);

  const usersQuery = useMemoFirebase(() => {
    if (!firestore || !isAuthResolved) return null; // Wait for auth check
    if (isAdmin) {
      return collection(firestore, 'users');
    }
    return null; // Non-admins cannot list all users
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
    if (!firestore || !isAuthResolved) {
      return null; // Wait for auth check
    }
    const attemptsRef = collection(firestore, 'attempts');
    if (isAdmin) {
      return query(attemptsRef); // Admin gets all
    }
    // For non-admin, authUser should exist because of isAuthResolved check
    return query(attemptsRef, where('userId', '==', authUser!.uid));
  }, [firestore, authUser, isAuthResolved, isAdmin]);

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
    const averageScore = totalAttempts > 0
      ? attempts.reduce((acc, a) => acc + a.score, 0) / totalAttempts
      : 0;

    const leaderboardMap = new Map<string, any>();
    attempts.forEach(attempt => {
      const user = usersMap.get(attempt.userId);
      if (!user) return;

      if (!leaderboardMap.has(attempt.userId)) {
        leaderboardMap.set(attempt.userId, {
          ...user,
          highestScore: 0,
          attemptsCount: 0,
        });
      }

      const record = leaderboardMap.get(attempt.userId);
      record.attemptsCount++;
      if (attempt.score > record.highestScore) {
        record.highestScore = attempt.score;
      }
    });

    const sortedLeaderboard = Array.from(leaderboardMap.values())
      .sort((a, b) => b.highestScore - a.highestScore)
      .slice(0, 10);

    return { totalAttempts, passingAttempts, passRate, averageScore, sortedLeaderboard };
  }, [attempts, usersMap]);

  const isLoading = isAuthLoading || isProfileLoading || coursesLoading || attemptsLoading || (isAdmin && usersLoading);

  if (attemptsError) {
    return (
      <div className="flex h-[60vh] items-center justify-center p-4">
        <div className="text-center max-w-2xl">
          <AlertCircle className="mx-auto h-12 w-12 text-destructive mb-4" />
          <h3 className="text-xl font-bold mb-2">Failed to Load Reports</h3>
          <p className="text-muted-foreground mb-1">Permission denied. Please ensure:</p>
          <ul className="text-left text-sm text-muted-foreground mb-4 space-y-1">
            <li>• Your account has a user profile in Firestore</li>
            <li>• Admin accounts must have <code>role: "admin"</code></li>
            <li>• You are logged in</li>
          </ul>
          <p className="text-xs text-muted-foreground">
            Error: {attemptsError.message}
          </p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <div className="text-center">
          <Loader2 className="mx-auto h-10 w-10 animate-spin text-primary mb-3" />
          <p className="text-muted-foreground">Loading reports...</p>
        </div>
      </div>
    );
  }

  if (!reportData || reportData.totalAttempts === 0) {
    return (
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
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold">Reports & Analytics</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {isAdmin ? 'System-wide exam performance' : 'Your personal exam results'}
          </p>
        </div>
        <div className="w-full sm:w-64">
          <Select
            value={selectedCourseId}
            onValueChange={setSelectedCourseId}
            disabled={!courses?.length}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select course" />
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

      {/* Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader><CardTitle>Total</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold">{reportData.totalAttempts}</p></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Passed</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold text-green-600">{reportData.passingAttempts}</p></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Pass Rate</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold text-primary">{reportData.passRate.toFixed(1)}%</p></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Avg. Score</CardTitle></CardHeader>
          <CardContent><p className="text-2xl font-bold">{reportData.averageScore.toFixed(1)}%</p></CardContent>
        </Card>
      </div>

      {/* Leaderboard */}
      <Card>
        <CardHeader>
          <CardTitle>Leaderboard</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Rank</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead className="text-right">Highest Score</TableHead>
                  <TableHead className="text-right">Attempts</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reportData.sortedLeaderboard.map((user, index) => (
                  <TableRow key={user.userId || index}>
                    <TableCell className="font-medium w-12">{index + 1}</TableCell>
                    <TableCell>
                      {isAdmin ? user.name : 'You'}
                    </TableCell>
                    <TableCell className="text-right font-bold text-primary">
                      {user.highestScore}%
                    </TableCell>
                    <TableCell className="text-right">{user.attemptsCount}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
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
