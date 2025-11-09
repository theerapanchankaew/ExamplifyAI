'use client'

import { useMemo } from 'react';
import { useFirestore, useUser, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where, getDocs, doc } from 'firebase/firestore';
import type { UserAchievement } from '@/types/user-achievement';
import type { MasterCourse, CompetencyPair } from '@/types/master-course';
import type { UserProfile } from '@/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Loader2, Award, Star } from 'lucide-react';
import { PlaceholderContent } from '@/components/placeholder-content';
import { Badge } from '@/components/ui/badge';

export default function MyQualificationsPage() {
  const firestore = useFirestore();
  const { user } = useUser();

  // 1. Fetch the user's achievements
  const achievementsQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return collection(firestore, `users/${user.uid}/achievements`);
  }, [firestore, user]);
  const { data: achievements, isLoading: achievementsLoading } = useCollection<UserAchievement>(achievementsQuery);
  const achievedPairs = useMemo(() => new Set(achievements?.map(a => a.pair)), [achievements]);

  // 2. Fetch all master courses to check progress against
  const masterCoursesQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return collection(firestore, 'masterCourses');
  }, [firestore]);
  const { data: masterCourses, isLoading: masterCoursesLoading } = useCollection<MasterCourse>(masterCoursesQuery);

  const qualifications = useMemo(() => {
    if (!masterCourses || !achievedPairs) return [];
    return masterCourses.map(mc => {
      const requiredCount = mc.requiredCompetencies.length;
      const achievedCount = mc.requiredCompetencies.filter(rc => 
        achievedPairs.has(`${rc.taCode} / ${rc.isicCode}`)
      ).length;
      const progress = requiredCount > 0 ? (achievedCount / requiredCount) * 100 : 0;
      const isCompleted = progress === 100;
      return {
        ...mc,
        achievedCount,
        requiredCount,
        progress,
        isCompleted
      };
    })
    // Filter to only show qualifications with progress, and sort by that progress
    .filter(q => q.achievedCount > 0)
    .sort((a,b) => b.progress - a.progress); 
  }, [masterCourses, achievedPairs]);

  const isLoading = achievementsLoading || masterCoursesLoading;
  
  if (isLoading) {
    return (
      <div className="flex h-[60vh] w-full items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }
  
  if (qualifications.length === 0) {
      return (
          <PlaceholderContent
            icon={Award}
            title="No Progress Towards Qualifications Yet"
            description="Your earned qualifications and progress towards master certificates will appear here once you pass the required course exams."
          />
      )
  }

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-3xl font-bold font-headline">My Qualifications</h1>
        <p className="text-muted-foreground mt-1">Track your progress towards master certificates and view earned qualifications.</p>
      </div>

       <div className="grid gap-6 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
        {qualifications.map(q => (
            <Card key={q.id} className={q.isCompleted ? 'border-primary/50 bg-primary/5' : ''}>
                <CardHeader>
                    <div className="flex justify-between items-start">
                        <CardTitle>{q.title}</CardTitle>
                        {q.isCompleted && <div className="flex items-center gap-2 text-primary font-semibold"><Star className="h-5 w-5"/> Completed</div>}
                    </div>
                    <CardDescription>{q.description}</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex justify-between items-center mb-2">
                        <p className="text-sm font-medium">Progress</p>
                        <p className="text-sm font-semibold">{q.achievedCount} / {q.requiredCount} competencies</p>
                    </div>
                    <Progress value={q.progress} />
                    <div className="mt-4">
                        <h4 className="text-sm font-semibold mb-2">Required Competencies:</h4>
                        <div className="flex flex-wrap gap-2">
                           {q.requiredCompetencies.map(rc => {
                               const pairString = `${rc.taCode} / ${rc.isicCode}`;
                               const isAchieved = achievedPairs.has(pairString);
                               return (
                                <Badge key={pairString} variant={isAchieved ? 'default' : 'secondary'}>
                                    {pairString}
                                 </Badge>
                               )
                           })}
                        </div>
                    </div>
                </CardContent>
            </Card>
        ))}
       </div>
    </div>
  );
}
