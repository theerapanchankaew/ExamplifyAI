
'use client';

import { useUser, useFirestore, useDoc, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { useEffect, useState, type ReactNode } from 'react';
import type { UserProfile } from '@/types';
import { Loader2 } from 'lucide-react';
import { PlaceholderContent } from './placeholder-content';

/**
 * A client component that guards its children, only rendering them
 * if the currently logged-in user has an 'admin' role.
 *
 * It handles loading states and displays an "Access Denied" message
 * for non-admin users.
 *
 * @param {object} props
 * @param {ReactNode} props.children - The content to render if the user is an admin.
 */
export function AdminAuthGuard({ children }: { children: ReactNode }) {
  const { user: authUser, isUserLoading: isAuthLoading } = useUser();
  const firestore = useFirestore();

  const [isAdmin, setIsAdmin] = useState(false);
  const [isChecking, setIsChecking] = useState(true);

  // Memoize the document reference to prevent re-renders
  const userDocRef = useMemoFirebase(() => {
    if (!firestore || !authUser) return null;
    return doc(firestore, 'users', authUser.uid);
  }, [firestore, authUser]);

  // Fetch the user's profile from Firestore
  const { data: userProfile, isLoading: isProfileLoading } = useDoc<UserProfile>(userDocRef);

  useEffect(() => {
    // We can only check the role after both auth and profile data have loaded.
    if (isAuthLoading || isProfileLoading) {
      setIsChecking(true);
      return;
    }

    // If there's no auth user or no firestore profile, they can't be an admin.
    if (!authUser || !userProfile) {
      setIsAdmin(false);
      setIsChecking(false);
      return;
    }
    
    // Check if the role in Firestore is 'admin'.
    // In a production app, you'd also want to verify this against a custom claim in the ID token.
    if (userProfile.role === 'admin') {
      setIsAdmin(true);
    } else {
      setIsAdmin(false);
    }

    // We've finished our check.
    setIsChecking(false);

  }, [authUser, userProfile, isAuthLoading, isProfileLoading]);

  // Show a loading spinner while we verify the user's role.
  if (isChecking) {
    return (
      <div className="flex h-full min-h-[80vh] items-center justify-center">
        <Loader2 className="h-16 w-16 animate-spin text-primary" />
      </div>
    );
  }

  // If the user is an admin, render the protected content.
  if (isAdmin) {
    return <>{children}</>;
  }

  // If the user is not an admin, show an access denied message.
  return (
    <PlaceholderContent
      title="Access Denied"
      description="You do not have permission to view this page."
    />
  );
}
