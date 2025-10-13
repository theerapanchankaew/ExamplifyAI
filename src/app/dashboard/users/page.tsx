
'use client';

import { useMemo } from 'react';
import { useFirestore, useUser } from '@/firebase';
import { useCollection } from '@/firebase';
import { useMemoFirebase } from '@/firebase/provider';
import { collection } from 'firebase/firestore';
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
import { Loader2 } from 'lucide-react';
import { PlaceHolderImages } from '@/lib/placeholder-images';

export default function UsersPage() {
  const firestore = useFirestore();
  const { user: authUser, isUserLoading } = useUser();
  
  const usersQuery = useMemoFirebase(() => {
    // We can only fetch all users if the current user is an admin.
    // The security rules will enforce this, but it's good practice to check here too.
    // The `useUser` hook will give us the currently logged in user, and we can check their role.
    // We will assume for now the `useDoc` in the `UserNav` has populated the user's profile.
    // A more robust solution might involve a dedicated `useRole` hook.
    // For now, let's proceed assuming the rules will catch unauthorized access.
    if (!firestore || isUserLoading) return null;
    return collection(firestore, 'users');
  }, [firestore, isUserLoading]);

  const { data: users, isLoading: usersIsLoading } = useCollection<UserProfile>(usersQuery);

  const isLoading = isUserLoading || usersIsLoading;

  const getAvatarForUser = (user: UserProfile, index: number) => {
    // This is a simple logic to rotate between a few placeholder avatars
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

  return (
    <Card>
      <CardHeader>
        <CardTitle>User Management</CardTitle>
        <CardDescription>
          A list of all the users in the system.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex h-64 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
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
                              <AvatarImage src={avatar?.imageUrl} alt={user.name || 'User'} data-ai-hint={avatar?.imageHint} />
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
        )}
      </CardContent>
    </Card>
  );
}
