
'use client'

import { useMemoFirebase } from "@/firebase/provider"
import { useCollection } from "@/firebase"
import { collection, query, where, limit, orderBy, Timestamp } from "firebase/firestore"
import { useFirestore, useUser, useDoc } from "@/firebase"
import { doc } from 'firebase/firestore';
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
import { BookOpen, CheckCircle, Percent, Activity, Loader2, Users } from "lucide-react"
import type { UserProfile } from "@/types"
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

export default function DashboardPage() {
  const firestore = useFirestore();
  const { user: authUser, isUserLoading } = useUser();

  const userDocRef = useMemoFirebase(() => {
    if (!firestore || !authUser) return null;
    return doc(firestore, 'users', authUser.uid);
  }, [firestore, authUser]);

  const { data: userProfile, isLoading: isProfileLoading } = useDoc<UserProfile>(userDocRef);
  
  const todayStart = useMemo(() => startOfDay(new Date()), []);

  const coursesQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return collection(firestore, 'courses');
  }, [firestore]);
  const { data: courses, isLoading: coursesLoading } = useCollection<Course>(coursesQuery);

  const attemptsTodayQuery = useMemoFirebase(() => {
    if (!firestore) return null; 
    return query(collection(firestore, 'attempts'), where('timestamp', '>=', Timestamp.fromDate(todayStart)));
  }, [firestore, todayStart]);
  const { data: attemptsToday, isLoading: attemptsTodayLoading } = useCollection(attemptsTodayQuery);

  const recentUsersQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    // This is an arbitrary query, replace with a real one like orderBy('createdAt', 'desc') if available
    return query(collection(firestore, 'users'), limit(5));
  }, [firestore]);
  const { data: recentUsers, isLoading: recentUsersLoading } = useCollection<UserProfile>(recentUsersQuery);

  const passRate = useMemo(() => {
    if (!attemptsToday || attemptsToday.length === 0) return 0;
    const passedCount = attemptsToday.filter(attempt => attempt.pass).length;
    return (passedCount / attemptsToday.length) * 100;
  }, [attemptsToday]);
  
  const chartData = useMemo(() => {
    if (!attemptsToday) return [];
    
    const last7Days = Array.from({ length: 7 }, (_, i) => {
        const d = subDays(new Date(), 6 - i);
        return startOfDay(d);
    });

    return last7Days.map(date => {
        const dateString = format(date, 'MMM d');
        
        const attemptsOnDate = (date.getDate() === new Date().getDate()) ? attemptsToday : [];
        const passes = attemptsOnDate.filter(a => a.pass).length;
        
        return {
            date: dateString,
            attempts: attemptsOnDate.length,
            passes: passes
        }
    });

  }, [attemptsToday]);
  
  const isLoading = isUserLoading || isProfileLoading || coursesLoading || attemptsTodayLoading || recentUsersLoading;

  const stats = [
    { title: "Total Courses", value: courses?.length ?? '...', icon: BookOpen },
    { title: "Attempts Today", value: attemptsToday?.length ?? '...', icon: CheckCircle },
    { title: "Pass Rate", value: `${passRate.toFixed(1)}%`, icon: Percent },
  ];

  const getAvatarForUser = (user: UserProfile, index: number) => {
    const imageId = user.role === 'admin' ? 'user-avatar-1' : `student-avatar-1`;
    return PlaceHolderImages.find(img => img.id === imageId) || PlaceHolderImages[1]; // fallback
  }

  const getRoleVariant = (role?: string) => {
    switch (role?.toLowerCase()) {
      case 'admin':
        return 'default';
      case 'instructor':
        return 'secondary';
      case 'student':
        return 'outline';
      default:
        return 'secondary';
    }
  }

  if (isLoading) {
    return (
      <div className="flex h-full min-h-[80vh] items-center justify-center">
        <Loader2 className="h-16 w-16 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-8">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
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
            <CardTitle className="flex items-center gap-2"><Activity className="h-5 w-5" />Daily Activity</CardTitle>
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
            <CardTitle>Recent Examinees</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>User</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentUsers && recentUsers.map((user, index) => {
                     const avatar = getAvatarForUser(user, index);
                     return (
                      <TableRow key={user.userId}>
                         <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-9 w-9">
                              <AvatarImage src={user.avatarUrl || avatar?.imageUrl} alt={user.name || 'User'} data-ai-hint={avatar?.imageHint} />
                              <AvatarFallback>{user.name?.charAt(0) || 'U'}</AvatarFallback>
                            </Avatar>
                            <span className="font-medium truncate w-32">{user.name}</span>
                          </div>
                        </TableCell>
                        <TableCell><div className="truncate w-40">{user.email}</div></TableCell>
                        <TableCell>
                           <Badge variant={getRoleVariant(user.role)}>
                              {user.role || 'N/A'}
                            </Badge>
                        </TableCell>
                      </TableRow>
                     )
                    })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
