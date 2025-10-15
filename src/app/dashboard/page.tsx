
'use client'

import { useMemoFirebase } from "@/firebase/provider"
import { useCollection } from "@/firebase"
import { collection, query, limit, where, Timestamp, orderBy } from "firebase/firestore"
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
import { BookOpen, Activity, Percent, Users as UsersIcon, Loader2 } from "lucide-react"
import type { UserProfile, Attempt } from "@/types"
import type { Course } from '@/types/course'
import { subDays, format, startOfDay } from 'date-fns'
import { useState, useEffect, useMemo } from "react"
import { PlaceHolderImages } from "@/lib/placeholder-images"
import { PlaceholderContent } from "@/components/placeholder-content"

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
  const { user: authUser, isUserLoading: isAuthUserLoading } = useUser();
  const [isTokenRefreshed, setIsTokenRefreshed] = useState(false);

  const userDocRef = useMemoFirebase(() => {
    if (!firestore || !authUser) return null;
    return doc(firestore, 'users', authUser.uid);
  }, [firestore, authUser]);

  const { data: userProfile, isLoading: isProfileLoading } = useDoc<UserProfile>(userDocRef);
  const isAdmin = userProfile?.role === 'admin';
  
  // This effect handles the custom claim refresh logic.
  useEffect(() => {
    const checkAdminClaim = async () => {
      if (authUser && isAdmin) {
        const tokenResult = await authUser.getIdTokenResult();
        if (!tokenResult.claims.role || tokenResult.claims.role !== 'admin') {
          // Claim is not present or incorrect, force a refresh.
          await authUser.getIdToken(true);
        }
      }
      // Mark token as refreshed (or not needing refresh) to allow queries to run.
      setIsTokenRefreshed(true);
    };
    if(!isAuthUserLoading && !isProfileLoading) {
      checkAdminClaim();
    }
  }, [authUser, isAdmin, isAuthUserLoading, isProfileLoading]);


  const coursesQuery = useMemoFirebase(() => {
    // Wait for token refresh logic to complete before running queries.
    if (!firestore || !isTokenRefreshed) return null;
    return collection(firestore, 'courses');
  }, [firestore, isTokenRefreshed]);
  const { data: courses, isLoading: coursesLoading } = useCollection<Course>(coursesQuery);

  const sevenDaysAgo = startOfDay(subDays(new Date(), 6));
  const attemptsQuery = useMemoFirebase(() => {
    // Wait for token refresh logic to complete before running queries.
    if (!firestore || !isAdmin || !isTokenRefreshed) return null;
    return query(
      collection(firestore, 'attempts'),
      where('timestamp', '>=', sevenDaysAgo),
      orderBy('timestamp', 'desc')
    );
  }, [firestore, isAdmin, isTokenRefreshed]);
  const { data: recentAttempts, isLoading: attemptsLoading, error: attemptsError } = useCollection<Attempt>(attemptsQuery);
  
  const recentUsersQuery = useMemoFirebase(() => {
    // Wait for token refresh logic to complete before running queries.
    if (!firestore || !isAdmin || !isTokenRefreshed) return null;
    return query(collection(firestore, 'users'), orderBy('name', 'desc'), limit(5));
  }, [firestore, isAdmin, isTokenRefreshed]);
  const { data: recentUsers, isLoading: recentUsersLoading, error: usersError } = useCollection<UserProfile>(recentUsersQuery);
  
  // Process data for chart
  const chartData = useMemo(() => {
    const last7Days = Array.from({ length: 7 }, (_, i) => {
        const d = subDays(new Date(), 6 - i);
        return startOfDay(d);
    });

    if (!isAdmin || !recentAttempts) {
        return last7Days.map(date => ({ date: format(date, 'MMM d'), attempts: 0, passes: 0 }));
    }

    const dailyData = last7Days.map(date => {
        const dateString = format(date, 'MMM d');
        const attemptsOnDate = recentAttempts?.filter(attempt => 
            attempt.timestamp && startOfDay((attempt.timestamp as unknown as Timestamp).toDate()).getTime() === date.getTime()
        ) || [];

        return {
            date: dateString,
            attempts: attemptsOnDate.length,
            passes: attemptsOnDate.filter(a => a.pass).length,
        };
    });
    
    return dailyData;

  }, [recentAttempts, isAdmin]);

  const totalPasses = recentAttempts?.filter(a => a.pass).length ?? 0;
  const overallPassRate = recentAttempts && recentAttempts.length > 0 ? (totalPasses / recentAttempts.length) * 100 : 0;

  const isLoading = isAuthUserLoading || isProfileLoading || !isTokenRefreshed || coursesLoading || (isAdmin && (recentUsersLoading || attemptsLoading));

  const stats = [
    { title: "Total Courses", value: courses?.length ?? '...', icon: BookOpen },
    { title: "Attempts (Last 7 Days)", value: isAdmin ? (recentAttempts?.length ?? '...') : 'N/A', icon: Activity },
    { title: "Pass Rate (Last 7 Days)", value: isAdmin ? `${overallPassRate.toFixed(1)}%` : 'N/A', icon: Percent },
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
   if (!isAdmin) {
    return (
        <PlaceholderContent 
            title="Access Denied" 
            description="You do not have permission to view the admin dashboard."
          />
    );
   }

   const dataError = attemptsError || usersError;
   if (dataError) {
    return (
      <div className="flex h-full min-h-[80vh] items-center justify-center text-destructive p-4 rounded-md bg-destructive/10">
          <pre className='whitespace-pre-wrap text-sm'>{dataError.message}</pre>
      </div>
    );
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
            <CardTitle>Recent Users</CardTitle>
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

    