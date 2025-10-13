
'use client'

import { useMemoFirebase } from "@/firebase/provider"
import { useCollection } from "@/firebase"
import { collection, query, where, limit, orderBy, Timestamp } from "firebase/firestore"
import { useFirestore, useUser } from "@/firebase"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartConfig
} from "@/components/ui/chart"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from "recharts"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Users, BookOpen, CheckCircle, Percent, Activity, Loader2 } from "lucide-react"
import type { Attempt, UserProfile } from "@/types"
import type { Course } from '@/types/course'
import { subDays, format, startOfDay } from 'date-fns'
import { useMemo } from "react"
import { PlaceHolderImages } from "@/lib/placeholder-images"

const chartConfig = {
  attempts: {
    label: "Attempts",
    color: "hsl(var(--chart-1))",
  },
  passes: {
    label: "Passes",
    color: "hsl(var(--chart-2))",
  },
} satisfies ChartConfig;

type EnrichedAttempt = Attempt & {
  userName?: string;
  courseTitle?: string;
  userAvatarUrl?: string;
};

export default function DashboardPage() {
  const firestore = useFirestore();
  const { user, isUserLoading } = useUser();

  const todayStart = useMemo(() => startOfDay(new Date()), []);

  const usersQuery = useMemoFirebase(() => {
    if (!firestore || isUserLoading) return null;
    return collection(firestore, 'users');
  }, [firestore, isUserLoading]);
  const { data: users, isLoading: usersLoading } = useCollection<UserProfile>(usersQuery);

  const coursesQuery = useMemoFirebase(() => {
    if (!firestore || isUserLoading) return null;
    return collection(firestore, 'courses');
  }, [firestore, isUserLoading]);
  const { data: courses, isLoading: coursesLoading } = useCollection<Course>(coursesQuery);

  const examsQuery = useMemoFirebase(() => {
    if (!firestore || isUserLoading) return null;
    return collection(firestore, 'exams');
  }, [firestore, isUserLoading]);
  const { data: exams, isLoading: examsLoading } = useCollection<{courseId: string, id: string}>(examsQuery);

  const attemptsTodayQuery = useMemoFirebase(() => {
    if (!firestore || isUserLoading) return null; 
    return query(collection(firestore, 'attempts'), where('timestamp', '>=', Timestamp.fromDate(todayStart)));
  }, [firestore, isUserLoading, todayStart]);
  const { data: attemptsToday, isLoading: attemptsTodayLoading } = useCollection<Attempt>(attemptsTodayQuery);

  const recentAttemptsQuery = useMemoFirebase(() => {
    if (!firestore || isUserLoading) return null; 
    return query(collection(firestore, 'attempts'), orderBy('timestamp', 'desc'), limit(5));
  }, [firestore, isUserLoading]);
  const { data: recentAttempts, isLoading: recentAttemptsLoading } = useCollection<Attempt>(recentAttemptsQuery);

  const allAttemptsQuery = useMemoFirebase(() => {
      if(!firestore || isUserLoading) return null;
      return collection(firestore, 'attempts');
  }, [firestore, isUserLoading]);
  const { data: allAttempts, isLoading: allAttemptsLoading } = useCollection<Attempt>(allAttemptsQuery);

  const passRate = useMemo(() => {
    if (!allAttempts || allAttempts.length === 0) return 0;
    const passedCount = allAttempts.filter(attempt => attempt.pass).length;
    return (passedCount / allAttempts.length) * 100;
  }, [allAttempts]);
  
  const chartData = useMemo(() => {
    if (!allAttempts) return [];
    
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const d = subDays(new Date(), 6 - i);
      return startOfDay(d);
    });

    return last7Days.map(date => {
      const dateString = format(date, 'MMM d');
      const nextDay = new Date(date.getTime() + 24 * 60 * 60 * 1000);
      
      const attemptsOnDate = allAttempts.filter(attempt => {
          if (!attempt.timestamp) return false;
          const attemptDate = (attempt.timestamp as unknown as Timestamp)?.toDate();
          if (!attemptDate) return false;
          return attemptDate >= date && attemptDate < nextDay;
      });
      
      const passes = attemptsOnDate.filter(a => a.pass).length;
      
      return {
        date: dateString,
        attempts: attemptsOnDate.length,
        passes: passes
      }
    });

  }, [allAttempts]);
  
  const enrichedRecentAttempts = useMemo<EnrichedAttempt[]>(() => {
    if (!recentAttempts || !users || !courses || !exams) return [];

    const usersMap = new Map(users.map(u => [u.userId, u]));
    const coursesMap = new Map(courses.map(c => [c.id, c]));
    const examsMap = new Map(exams.map(e => [e.id, e]));

    return recentAttempts.map(attempt => {
      const user = usersMap.get(attempt.userId);
      // The examId in the attempt collection might not exist in the exams collection
      const exam = examsMap.get(attempt.examId);
      const course = exam ? coursesMap.get(exam.courseId) : undefined;
      
      return {
        ...attempt,
        userName: user?.name || attempt.userId,
        courseTitle: course?.title || 'Unknown Course',
        userAvatarUrl: user?.avatarUrl,
      };
    });
  }, [recentAttempts, users, courses, exams]);

  const isLoading = isUserLoading || usersLoading || coursesLoading || attemptsTodayLoading || recentAttemptsLoading || allAttemptsLoading || examsLoading;

  const stats = [
    { title: "Total Users", value: users?.length ?? '...', icon: Users },
    { title: "Total Courses", value: courses?.length ?? '...', icon: BookOpen },
    { title: "Attempts Today", value: attemptsToday?.length ?? '...', icon: CheckCircle },
    { title: "Pass Rate", value: `${passRate.toFixed(1)}%`, icon: Percent },
  ];

  const studentAvatarFallback = PlaceHolderImages.find(img => img.id === 'student-avatar-1');

  if (isLoading) {
    return (
      <div className="flex h-full min-h-[80vh] items-center justify-center">
        <Loader2 className="h-16 w-16 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
              <stat.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold font-headline">{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Activity className="h-5 w-5" />Activity (Last 7 Days)</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={chartConfig} className="h-[250px] w-full">
              <ResponsiveContainer>
                <LineChart data={chartData}>
                  <CartesianGrid vertical={false} strokeDasharray="3 3" />
                  <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} fontSize={12} />
                  <YAxis tickLine={false} axisLine={false} tickMargin={8} fontSize={12} allowDecimals={false} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Line dataKey="attempts" type="monotone" stroke="var(--color-attempts)" strokeWidth={2} dot={{ r: 4, fill: "var(--color-attempts)", strokeWidth: 2 }} activeDot={{ r: 6 }} />
                  <Line dataKey="passes" type="monotone" stroke="var(--color-passes)" strokeWidth={2} dot={{ r: 4, fill: "var(--color-passes)", strokeWidth: 2 }} activeDot={{ r: 6 }}/>
                </LineChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Recent Exam Attempts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Examinee</TableHead>
                    <TableHead>Course</TableHead>
                    <TableHead className="text-right">Score</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {enrichedRecentAttempts && enrichedRecentAttempts.map((attempt) => (
                    <TableRow key={attempt.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                           <Avatar className="h-9 w-9">
                            <AvatarImage src={attempt.userAvatarUrl || studentAvatarFallback?.imageUrl} />
                            <AvatarFallback>{attempt.userName?.substring(0, 2) || '??'}</AvatarFallback>
                          </Avatar>
                          <span className="font-medium truncate w-32">{attempt.userName}</span>
                        </div>
                      </TableCell>
                      <TableCell><div className="truncate w-40">{attempt.courseTitle}</div></TableCell>
                      <TableCell className="text-right font-code">{attempt.score}%</TableCell>
                      <TableCell className="text-center">
                        <Badge variant={attempt.pass ? 'secondary' : 'destructive'}>
                          {attempt.pass ? 'Passed' : 'Failed'}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
