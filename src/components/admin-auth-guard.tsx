
'use client';

import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { useEffect, useState, type ReactNode } from 'react';
import type { UserProfile } from '@/types';
import { Loader2 } from 'lucide-react';
import { PlaceholderContent } from './placeholder-content';

export function AdminAuthGuard({ children }: { children?: ReactNode }) {
  const { user: authUser, isUserLoading: isAuthLoading } = useUser();
  const firestore = useFirestore();
  const [isAdmin, setIsAdmin] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  const userDocRef = useMemoFirebase(() => {
    if (!firestore || !authUser) return null;
    return doc(firestore, 'users', authUser.uid);
  }, [firestore, authUser]);

  const { data: userProfile, isLoading: isProfileLoading } = useDoc<UserProfile>(userDocRef);

  useEffect(() => {
    // We are only done checking when auth has loaded and, if there's a user, their profile has loaded too.
    const hasFinishedChecking = !isAuthLoading && (!authUser || (authUser && !isProfileLoading));

    if (hasFinishedChecking) {
      if (userProfile && userProfile.role === 'admin') {
        setIsAdmin(true);
      } else {
        setIsAdmin(false);
      }
      setIsChecking(false);
    }
  }, [isAuthLoading, authUser, isProfileLoading, userProfile]);

  if (isChecking) {
    return (
      <div className="flex h-full min-h-[80vh] items-center justify-center">
        <Loader2 className="h-16 w-16 animate-spin text-primary" />
      </div>
    );
  }

  if (isAdmin) {
    return <>{children}</>;
  }

  return (
    <PlaceholderContent
      title="Access Denied"
      description="You do not have permission to view this page."
    />
  );
}
