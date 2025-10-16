
'use client';

import { useFirestore, useUser, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import type { UserProfile } from '@/types';
import { Gem, Loader2 } from 'lucide-react';
import { Skeleton } from './ui/skeleton';

export function UserTokens() {
  const { user: authUser, isUserLoading } = useUser();
  const firestore = useFirestore();

  const userDocRef = useMemoFirebase(() => {
    if (!firestore || !authUser) return null;
    return doc(firestore, 'users', authUser.uid);
  }, [firestore, authUser]);

  const { data: userProfile, isLoading: isProfileLoading } = useDoc<UserProfile>(userDocRef);

  const isLoading = isUserLoading || isProfileLoading;
  const cabTokens = userProfile?.cabTokens ?? 0;

  if (isLoading) {
    return <Skeleton className="h-8 w-20 rounded-md" />;
  }

  return (
    <div className="flex items-center gap-2 font-semibold text-primary border border-primary/20 bg-primary/10 px-3 py-1 rounded-md">
      <Gem className="h-5 w-5" />
      <span className="font-mono text-sm">{cabTokens}</span>
    </div>
  );
}
