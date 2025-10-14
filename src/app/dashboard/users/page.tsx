
'use client';

import { useMemo } from 'react';
import { useFirestore, useUser, useDoc } from '@/firebase';
import { useCollection } from '@/firebase';
import { useMemoFirebase } from '@/firebase/provider';
import { collection, doc } from 'firebase/firestore';
import type { UserProfile } from '@/types';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Loader2, Users } from 'lucide-react';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { PlaceholderContent } from '@/components/placeholder-content';

export default function UsersPage() {
  const firestore = useFirestore();
  const { user: authUser, isUserLoading: isAuthUserLoading } = useUser();

  // First, get the current user's profile to check if they are an admin
  const userDocRef = useMemoFirebase(() => {
    if (!firestore || !authUser) return null;
    return doc(firestore, 'users', authUser.uid);
  }, [firestore, authUser]);
  const { data: currentUserProfile, isLoading: isProfileLoading } = useDoc<UserProfile>(userDocRef);

  const isAdmin = currentUserProfile?.role === 'admin';

  // Only attempt to fetch all users if the current user is confirmed to be an admin
  const usersQuery = useMemoFirebase(() => {
    if (!firestore || !isAdmin) return null;
    return collection(firestore, 'users');
  }, [firestore, isAdmin]);

  const { data: users, isLoading: usersIsLoading, error: usersError } = useCollection<UserProfile>(usersQuery);

  const isLoading = isAuthUserLoading || isProfileLoading || (isAdmin && usersIsLoading);

  const getAvatarForUser = (user: UserProfile, index: number) => {
    const imageId = user.role === 'admin' ? 'user-avatar-1' : `student-avatar-${(index % 1) + 1}`;
    const image = PlaceHolderImages.find(img => img.id === imageId);
    return image || PlaceHolderImages[1]; // fallback
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
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAdmin) {
      return (
          <PlaceholderContent 
            title="Access Denied" 
            description="You do not have permission to view this page."
          />
      )
  }

  return (
    <div className="flex flex-col gap-8">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
            <div className="text-2xl font-bold font-headline">{users?.length ?? '...'}</div>
            <p className="text-xs text-muted-foreground">all users in the system</p>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>User Management</CardTitle>
          <CardDescription>
            A list of all the users in the system.
          </CardDescription>
        </CardHeader>
        <CardContent>
            <div className="overflow-x-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[350px]">User</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users && users.length > 0 ? (
                    users.map((user, index) => {
                      const avatar = getAvatarForUser(user, index);
                      return (
                        <TableRow key={user.userId}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <Avatar>
                                <AvatarImage src={user.avatarUrl || avatar?.imageUrl} alt={user.name || 'User'} data-ai-hint={avatar?.imageHint} />
                                <AvatarFallback>{user.name?.charAt(0) || 'U'}</AvatarFallback>
                              </Avatar>
                              <span className="font-medium">{user.name || 'N/A'}</span>
                            </div>
                          </TableCell>
                          <TableCell>{user.email || 'N/A'}</TableCell>
                          <TableCell>
                            <Badge variant={getRoleVariant(user.role)}>
                              {user.role || 'N/A'}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  ) : (
                    <TableRow>
                      <TableCell colSpan={3} className="h-24 text-center">
                        No users found.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
        </CardContent>
      </Card>
    </div>
  );
}

    