
'use client';

import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
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

  // Derive state declaratively
  const isAdmin = useMemo(() => {
    return !!authUser && !isAuthLoading && !isProfileLoading && userProfile?.role === 'admin';
  }, [authUser, isAuthLoading, isProfileLoading, userProfile]);

  const isChecking = isAuthLoading || (authUser && isProfileLoading);

  // Redirect unauthenticated users (optional)
  useEffect(() => {
    if (!isChecking && redirectUnauthenticated && !authUser) {
      router.push('/');
    }
  }, [isChecking, authUser, redirectUnauthenticated, router]);

  // Loading state
  if (isChecking) {
    return (
      <div className="flex h-full min-h-[80vh] items-center justify-center" role="status" aria-live="polite">
        <Loader2 className="h-16 w-16 animate-spin text-primary" />
        <span className="sr-only">Checking permissions…</span>
      </div>
    );
  }

  // Authenticated but not admin
  if (!isAdmin) {
    // If not authenticated and redirection is disabled, show access denied
    if (!authUser && !redirectUnauthenticated) {
       return (
        <PlaceholderContent
            title="Authentication Required"
            description="You need to be logged in to view this page."
        />
       );
    }
    
    return (
      <PlaceholderContent
        title="Access Denied"
        description="You do not have permission to view this page."
      />
    );
  }

  // Authorized
  return <>{children}</>;
}
