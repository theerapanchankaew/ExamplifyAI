
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
    // Still loading if either auth or profile is loading
    if (isAuthLoading || isProfileLoading) {
      setIsChecking(true);
      return;
    }

    // If loading is finished, check the user's role
    if (authUser && userProfile) {
        setIsAdmin(userProfile.role === 'admin');
    } else {
        // No user or no profile means not an admin
        setIsAdmin(false);
    }

    // Checking is complete
    setIsChecking(false);
  }, [authUser, userProfile, isAuthLoading, isProfileLoading]);

  if (isChecking) {
    return (
      <div className="flex h-full min-h-[80vh] items-center justify-center">
        <Loader2 className="h-16 w-16 animate-spin text-primary" />
      </div>
    );
  }

  if (isAdmin) {
    // If user is an admin, render the protected content
    return <>{children}</>;
  }

  // If not an admin, show access denied message
  return (
    <PlaceholderContent
      title="Access Denied"
      description="You do not have permission to view this page."
    />
  );
}
