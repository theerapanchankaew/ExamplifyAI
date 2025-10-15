
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

// #region Child Components for Data Fetching

function TotalCoursesStat() {
  const firestore = useFirestore();
  const coursesQuery = useMemoFirebase(() => firestore ? collection(firestore, 'courses') : null, [firestore]);
  const { data: courses, isLoading } = useCollection<Course>(coursesQuery);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Total Courses</CardTitle>
        <BookOpen className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold font-headline">{isLoading ? '...' : courses?.length ?? 0}</div>
      </CardContent>
    </Card>
  );
}

function AttemptsAndPassRateStats() {
    const firestore = useFirestore();
    const sevenDaysAgo = startOfDay(subDays(new Date(), 6));

    const attemptsQuery = useMemoFirebase(() => {
        if (!firestore) return null;
        return query(
        collection(firestore, 'attempts'),
        where('timestamp', '>=', sevenDaysAgo),
        orderBy('timestamp', 'desc')
        );
    }, [firestore, sevenDaysAgo]);

    const { data: recentAttempts, isLoading } = useCollection<Attempt>(attemptsQuery);
    
    const totalPasses = recentAttempts?.filter(a => a.pass).length ?? 0;
    const overallPassRate = recentAttempts && recentAttempts.length > 0 ? (totalPasses / recentAttempts.length) * 100 : 0;

    return (
        <>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Attempts (Last 7 Days)</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                <div className="text-2xl font-bold font-headline">{isLoading ? '...' : recentAttempts?.length ?? 0}</div>
                </CardContent>
            </Card>
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Pass Rate (Last 7 Days)</CardTitle>
                <Percent className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                <div className="text-2xl font-bold font-headline">{isLoading ? '...' : `${overallPassRate.toFixed(1)}%`}</div>
                </CardContent>
            </Card>
        </>
    )
}

function DailyActivityChart() {
    const firestore = useFirestore();
    const sevenDaysAgo = startOfDay(subDays(new Date(), 6));

    const attemptsQuery = useMemoFirebase(() => {
        if (!firestore) return null;
        return query(
            collection(firestore, 'attempts'),
            where('timestamp', '>=', sevenDaysAgo),
            orderBy('timestamp', 'desc')
        );
    }, [firestore, sevenDaysAgo]);

    const { data: recentAttempts, isLoading, error } = useCollection<Attempt>(attemptsQuery);

    const chartData = useMemo(() => {
        const last7Days = Array.from({ length: 7 }, (_, i) => startOfDay(subDays(new Date(), 6 - i)));
        
        if (!recentAttempts) {
            return last7Days.map(date => ({ date: format(date, 'MMM d'), attempts: 0, passes: 0 }));
        }

        return last7Days.map(date => {
            const dateString = format(date, 'MMM d');
            const attemptsOnDate = recentAttempts.filter(attempt =>
                attempt.timestamp && startOfDay((attempt.timestamp as unknown as Timestamp).toDate()).getTime() === date.getTime()
            );
            return {
                date: dateString,
                attempts: attemptsOnDate.length,
                passes: attemptsOnDate.filter(a => a.pass).length,
            };
        });
    }, [recentAttempts]);

    return (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Activity className="h-5 w-5" />Daily Activity</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
                <div className="flex h-[250px] w-full items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
            ) : error ? (
                <div className="flex h-[250px] w-full items-center justify-center text-destructive p-4 rounded-md bg-destructive/10">
                    <pre className='whitespace-pre-wrap text-sm'>{error.message}</pre>
                </div>
            ) : (
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
            )}
          </CardContent>
        </Card>
    );
}

function RecentUsersCard() {
    const firestore = useFirestore();
    const recentUsersQuery = useMemoFirebase(() => {
        if (!firestore) return null;
        return query(collection(firestore, 'users'), orderBy('name', 'desc'), limit(5));
    }, [firestore]);
    const { data: recentUsers, isLoading, error } = useCollection<UserProfile>(recentUsersQuery);

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

    return (
        <Card>
          <CardHeader>
            <CardTitle>Recent Users</CardTitle>
          </CardHeader>
          <CardContent>
             {isLoading ? (
                <div className="flex h-[295px] w-full items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
            ) : error ? (
                 <div className="flex h-[295px] w-full items-center justify-center text-destructive p-4 rounded-md bg-destructive/10">
                    <pre className='whitespace-pre-wrap text-sm'>{error.message}</pre>
                </div>
            ) : (
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
             )}
          </CardContent>
        </Card>
    );
}

// #endregion

export default function DashboardPage() {
  const firestore = useFirestore();
  const { user: authUser, isUserLoading: isAuthUserLoading } = useUser();
  
  const userDocRef = useMemoFirebase(() => {
    if (!firestore || !authUser) return null;
    return doc(firestore, 'users', authUser.uid);
  }, [firestore, authUser]);

  const { data: userProfile, isLoading: isProfileLoading } = useDoc<UserProfile>(userDocRef);
  
  // This state will gate the rendering of admin-only components
  const [isAdminReady, setIsAdminReady] = useState(false);

  useEffect(() => {
    // This effect runs once after the user and their profile are loaded.
    // It checks for admin role and ensures the auth token has the correct custom claims.
    const verifyAdminStatus = async () => {
      if (isAuthUserLoading || isProfileLoading) {
        return; // Wait until user and profile are loaded
      }

      if (!authUser || !userProfile) {
        setIsAdminReady(false); // Not logged in or no profile, not an admin
        return;
      }

      if (userProfile.role === 'admin') {
        const tokenResult = await authUser.getIdTokenResult();
        if (tokenResult.claims.role !== 'admin') {
          // The claim is missing, force a token refresh.
          await authUser.getIdToken(true);
        }
        // After potential refresh, we can consider the admin ready.
        setIsAdminReady(true);
      } else {
        // User does not have admin role in their profile.
        setIsAdminReady(false);
      }
    };
    
    verifyAdminStatus();

  }, [authUser, userProfile, isAuthUserLoading, isProfileLoading]);

  const isLoading = isAuthUserLoading || isProfileLoading;
  
  if (isLoading) {
    return (
      <div className="flex h-full min-h-[80vh] items-center justify-center">
        <Loader2 className="h-16 w-16 animate-spin text-primary" />
      </div>
    )
  }

  if (!isAdminReady) {
    return (
        <PlaceholderContent 
            title="Access Denied" 
            description="You do not have permission to view the admin dashboard."
        />
    );
  }

  // Render the admin dashboard only when isAdminReady is true
  return (
    <div className="flex flex-col gap-8">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <TotalCoursesStat />
        <AttemptsAndPassRateStats />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <DailyActivityChart />
        <RecentUsersCard />
      </div>
    </div>
  )
}

    