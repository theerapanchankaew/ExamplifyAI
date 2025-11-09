
'use client';

import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { useEffect, useMemo, type ReactNode } from 'react';
import type { UserProfile } from '@/types';
import { Loader2 } from 'lucide-react';
import { PlaceholderContent } from './placeholder-content';
import { useRouter } from 'next/navigation';

export function AdminAuthGuard({ 
  children, 
  redirectUnauthenticated = true 
}: { 
  children?: ReactNode;
  redirectUnauthenticated?: boolean;
}) {
  const { user: authUser, isUserLoading: isAuthLoading } = useUser();
  const firestore = useFirestore();
  const router = useRouter();

  // Memoize doc ref to avoid unnecessary re-renders
  const userDocRef = useMemoFirebase(() => {
    if (!firestore || !authUser) return null;
    return doc(firestore, 'users', authUser.uid);
  }, [firestore, authUser]);

  const { data: userProfile, isLoading: isProfileLoading } = useDoc<UserProfile>(userDocRef);

  const isChecking = isAuthLoading || (authUser && isProfileLoading);

  // Redirect unauthenticated users after checks are complete
  useEffect(() => {
    if (!isChecking && redirectUnauthenticated && !authUser) {
      router.push('/');
    }
  }, [isChecking, authUser, redirectUnauthenticated, router]);

  // While checking, show a loading indicator and nothing else.
  if (isChecking) {
    return (
      <div className="flex h-full min-h-[80vh] items-center justify-center" role="status" aria-live="polite">
        <Loader2 className="h-16 w-16 animate-spin text-primary" />
        <span className="sr-only">Checking permissions…</span>
      </div>
    );
  }

  // After checking, if the user is an admin, render the children.
  if (userProfile?.role === 'admin') {
    return <>{children}</>;
  }
  
  // If not authenticated and redirection is disabled, show a specific message.
  if (!authUser && !redirectUnauthenticated) {
      return (
      <PlaceholderContent
          title="Authentication Required"
          description="You need to be logged in to view this page."
      />
      );
  }

  // Otherwise, for any non-admin user, show access denied.
  // This also covers the case where the user is authenticated but has no profile or is not an admin.
  return (
    <PlaceholderContent
      title="Access Denied"
      description="You do not have permission to view this page."
    />
  );
}
