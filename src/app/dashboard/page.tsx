
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

function ReportsContent() {
  const firestore = useFirestore();
  const { user: authUser, isUserLoading: isAuthLoading } = useUser();
  const [selectedCourseId, setSelectedCourseId] = useState<string>('all');

  const userDocRef = useMemoFirebase(() => {
    if (!firestore || !authUser) return null;
    return doc(firestore, 'users', authUser.uid);
  }, [firestore, authUser]);

  const { data: userProfile, isLoading: isProfileLoading } = useDoc<UserProfile>(userDocRef);

  const isAuthResolved = !isAuthLoading && authUser && !isProfileLoading;
  
  const isAdmin = useMemo(() => {
    return isAuthResolved && userProfile?.role === 'admin';
  }, [isAuthResolved, userProfile]);

  // 📚 โหลด courses (public)
  const coursesQuery = useMemoFirebase(() => firestore ? collection(firestore, 'courses') : null, [firestore]);
  const { data: courses } = useCollection<Course>(coursesQuery);

  // 👥 โหลด users — เฉพาะ admin เท่านั้น
  const usersQuery = useMemoFirebase(() => {
    if (!firestore || !isAuthResolved || !isAdmin) return null;
    return collection(firestore, 'users');
  }, [firestore, isAuthResolved, isAdmin]);

  const { data: users } = useCollection<UserProfile>(usersQuery);

  const usersMap = useMemo(() => {
    const map = new Map<string, UserProfile>();
    if (isAdmin && users) {
      users.forEach(u => u.userId && map.set(u.userId, u));
    } else if (userProfile?.userId) {
      map.set(userProfile.userId, userProfile);
    }
    return map;
  }, [isAdmin, users, userProfile]);

  // 📝 โหลด attempts — ตามเงื่อนไข
  const attemptsQuery = useMemoFirebase(() => {
    if (!firestore || !isAuthResolved) {
      return null;
    }
    const attemptsRef = collection(firestore, 'attempts');
    if (isAdmin) {
      return query(attemptsRef);
    } else {
      // For non-admin, authUser should exist because of isAuthResolved check
      return query(attemptsRef, where('userId', '==', authUser!.uid));
    }
  }, [firestore, authUser, isAuthResolved, isAdmin]);

  const {  data: allAttempts, isLoading: attemptsLoading, error: attemptsError } = useCollection<Attempt>(attemptsQuery);

  // 📊 กรองตาม course
  const attempts = useMemo(() => {
    if (!allAttempts) return [];
    return selectedCourseId === 'all'
      ? allAttempts
      : allAttempts.filter(attempt => {
          const course = courses?.find(c => c.id === selectedCourseId);
          return course && attempt.courseId === course.id;
        });
  }, [allAttempts, selectedCourseId, courses]);

  // 📈 คำนวณรายงาน
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

  const isLoading = isAuthLoading || isProfileLoading || attemptsLoading;

  // 🚨 จัดการ error
  if (attemptsError) {
    return (
      <div className="p-6">
        <PlaceholderContent
          icon={AlertCircle}
          title="Permission Denied"
          description="You don't have permission to view reports. Please contact admin."
        />
      </div>
    );
  }

  // ⏳ กำลังโหลด
  if (isLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // 📉 ไม่มีข้อมูล
  if (!reportData) {
    return (
      <PlaceholderContent
        icon={TrendingUp}
        title="No Data"
        description={isAdmin ? "No attempts recorded yet." : "You haven't taken any exams."}
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold">Reports & Analytics</h1>
          <p className="text-sm text-muted-foreground">
            {isAdmin ? 'System-wide exam performance' : 'Your personal results'}
          </p>
        </div>
        <div className="w-full sm:w-64">
          <Select value={selectedCourseId} onValueChange={setSelectedCourseId}>
            <SelectTrigger>
              <SelectValue placeholder="Select course" />
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
      {isAdmin && reportData.sortedLeaderboard.length > 0 && (
        <Card>
          <CardHeader><CardTitle>Top Performers</CardTitle></CardHeader>
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
                      <TableCell className="font-medium">{index + 1}</TableCell>
                      <TableCell>{user.name}</TableCell>
                      <TableCell className="text-right font-bold text-primary">{user.highestScore}%</TableCell>
                      <TableCell className="text-right">{user.attemptsCount}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default function ReportsPage() {
  return <ReportsContent />;
}
