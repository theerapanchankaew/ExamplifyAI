'use client'

import { useMemoFirebase } from "@/firebase/provider"
import { useCollection } from "@/firebase"
import { collection, query, where, limit, orderBy } from "firebase/firestore"
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
import type { ExamAttempt, UserProfile } from "@/types"
import { subDays, format } from 'date-fns'
import { useMemo, useState, useEffect } from "react"

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


export default function DashboardPage() {
  const firestore = useFirestore();
  const { user, isUserLoading } = useUser();
  const [today, setToday] = useState<Date | null>(null);

  useEffect(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    setToday(d);
  }, []);

  const usersQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null; // Wait for user
    return collection(firestore, 'users');
  }, [firestore, user]);
  const { data: users, isLoading: usersLoading } = useCollection<UserProfile>(usersQuery);

  const coursesQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null; // Wait for user
    return collection(firestore, 'courses');
  }, [firestore, user]);
  const { data: courses, isLoading: coursesLoading } = useCollection(coursesQuery);

  const attemptsTodayQuery = useMemoFirebase(() => {
    if (!firestore || !today || !user) return null; // Wait for user and today
    return query(collection(firestore, 'attempts'), where('timestamp', '>=', today));
  }, [firestore, today, user]);
  const { data: attemptsToday, isLoading: attemptsTodayLoading } = useCollection<ExamAttempt>(attemptsTodayQuery);

  const recentAttemptsQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null; // Wait for user
    return query(collection(firestore, 'attempts'), orderBy('timestamp', 'desc'), limit(5));
  }, [firestore, user]);
  const { data: recentAttempts, isLoading: recentAttemptsLoading } = useCollection<ExamAttempt>(recentAttemptsQuery);

  const allAttemptsQuery = useMemoFirebase(() => {
      if(!firestore || !user) return null; // Wait for user
      return collection(firestore, 'attempts');
  }, [firestore, user]);
  const { data: allAttempts, isLoading: allAttemptsLoading } = useCollection<ExamAttempt>(allAttemptsQuery);


  const passRate = useMemo(() => {
    if (!allAttempts || allAttempts.length === 0) return 0;
    const passedCount = allAttempts.filter(attempt => attempt.status === 'Passed').length;
    return (passedCount / allAttempts.length) * 100;
  }, [allAttempts]);
  
  const chartData = useMemo(() => {
    if (!allAttempts) return [];
    
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const d = subDays(new Date(), 6 - i);
      d.setHours(0, 0, 0, 0);
      return d;
    });

    return last7Days.map(date => {
      const dateString = format(date, 'MMM d');
      const attemptsOnDate = allAttempts.filter(attempt => {
          const attemptDate = (attempt.timestamp as any).toDate();
          return attemptDate >= date && attemptDate < new Date(date.getTime() + 24 * 60 * 60 * 1000);
      });
      
      const passes = attemptsOnDate.filter(a => a.status === 'Passed').length;
      
      return {
        date: dateString,
        attempts: attemptsOnDate.length,
        passes: passes
      }
    });

  }, [allAttempts]);
  
  const isLoading = isUserLoading || usersLoading || coursesLoading || attemptsTodayLoading || recentAttemptsLoading || allAttemptsLoading || !today;

  const stats = [
    { title: "Total Users", value: users?.length ?? '...', icon: Users },
    { title: "Total Courses", value: courses?.length ?? '...', icon: BookOpen },
    { title: "Attempts Today", value: attemptsToday?.length ?? '...', icon: CheckCircle },
    { title: "Pass Rate", value: `${passRate.toFixed(1)}%`, icon: Percent },
  ];

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
              {/*<p className="text-xs text-muted-foreground">{stat.change} from last period</p>*/}
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
                  <YAxis tickLine={false} axisLine={false} tickMargin={8} fontSize={12} />
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
                  {recentAttempts && recentAttempts.map((attempt) => (
                    <TableRow key={attempt.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-9 w-9">
                            <AvatarImage src={attempt.user.avatarUrl} alt={attempt.user.name} />
                            <AvatarFallback>{attempt.user.name.charAt(0)}</AvatarFallback>
                          </Avatar>
                          <span className="font-medium">{attempt.user.name}</span>
                        </div>
                      </TableCell>
                      <TableCell><div className="truncate w-40">{attempt.course.title}</div></TableCell>
                      <TableCell className="text-right font-code">{attempt.score}%</TableCell>
                      <TableCell className="text-center">
                        <Badge variant={attempt.status === 'Passed' ? 'secondary' : 'destructive'}>
                          {attempt.status}
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
