

'use client';

import { useMemo, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useFirestore, useUser, useDoc, useCollection, useMemoFirebase } from '@/firebase';
import { collection, doc, deleteDoc } from 'firebase/firestore';
import type { UserProfile, Roadmap } from '@/types';
import { useToast } from "@/hooks/use-toast";
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';


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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Loader2, Users, Gem, Trash2, Edit, Waypoints } from 'lucide-react';
import { PlaceHolderImages } from '@/lib/placeholder-images';
import { PlaceholderContent } from '@/components/placeholder-content';
import { Button } from '@/components/ui/button';
import { AdminAuthGuard } from '@/components/admin-auth-guard';


function AdminUsersContent() {
    const firestore = useFirestore();
    const router = useRouter();
    const { toast } = useToast();
    const [isDeleting, setIsDeleting] = useState(false);
    const [userToDelete, setUserToDelete] = useState<UserProfile | null>(null);
    const { user: authUser } = useUser();

    const usersQuery = useMemoFirebase(() => {
        if (!firestore) return null;
        return collection(firestore, 'users');
    }, [firestore]);
    const { data: users, isLoading: usersIsLoading } = useCollection<UserProfile>(usersQuery);

    const roadmapsQuery = useMemoFirebase(() => firestore ? collection(firestore, 'roadmaps') : null, [firestore]);
    const { data: roadmaps, isLoading: roadmapsLoading } = useCollection<Roadmap>(roadmapsQuery);

    const roadmapsMap = useMemo(() => {
        if (!roadmaps) return new Map();
        return new Map(roadmaps.map(r => [r.id, r.title]));
    }, [roadmaps]);

    const isLoading = usersIsLoading || roadmapsLoading;

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
        case 'examinee':
            return 'destructive';
        default:
            return 'secondary';
        }
    }
    
    const handleEditClick = (userId: string) => {
        router.push(`/dashboard/users/edit/${userId}`);
    };
    
    const handleDeleteClick = (user: UserProfile) => {
        setUserToDelete(user);
    };
    
    const confirmDelete = async () => {
        if (!userToDelete || !firestore || !authUser) return;
        if (userToDelete.userId === authUser.uid) {
            toast({
                variant: "destructive",
                title: "Cannot Delete Self",
                description: "You cannot delete your own account.",
            });
            setUserToDelete(null);
            return;
        }
        
        setIsDeleting(true);
        const userRef = doc(firestore, "users", userToDelete.userId);

        try {
        await deleteDoc(userRef);
        toast({
            title: "User Deleted",
            description: `User "${userToDelete.name}" has been successfully deleted.`,
        });
        } catch (e) {
        errorEmitter.emit('permission-error', new FirestorePermissionError({
            path: userRef.path,
            operation: 'delete',
        }));
        } finally {
        setIsDeleting(false);
        setUserToDelete(null);
        }
    };

    return (
        <>
            <div className="flex flex-col gap-8">
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Users</CardTitle>
                    <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl font-bold font-headline">{isLoading ? <Loader2 className="h-6 w-6 animate-spin" /> : users?.length ?? '0'}</div>
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
                    {isLoading ? (
                        <div className="flex h-64 items-center justify-center">
                           <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        </div>
                    ) : (
                        <div className="overflow-x-auto rounded-md border">
                            <Table>
                                <TableHeader>
                                <TableRow>
                                    <TableHead>User</TableHead>
                                    <TableHead>Email</TableHead>
                                    <TableHead>Role</TableHead>
                                    <TableHead>CAB Tokens</TableHead>
                                    <TableHead>Mandatory Roadmap</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                                </TableHeader>
                                <TableBody>
                                {users && users.length > 0 ? (
                                    users.map((user, index) => {
                                    const avatar = getAvatarForUser(user, index);
                                    const roadmapId = user.mandatoryLearningPath?.[0];
                                    const roadmapTitle = roadmapId ? roadmapsMap.get(roadmapId) : null;
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
                                        <TableCell>
                                            <div className="flex items-center gap-2 font-mono">
                                                <Gem className="h-4 w-4 text-primary"/>
                                                <span>{user.cabTokens ?? 0}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            {roadmapTitle ? (
                                                <div className="flex items-center gap-2 text-xs">
                                                   <Waypoints className="h-4 w-4 text-muted-foreground" />
                                                   <span>{roadmapTitle}</span>
                                                </div>
                                            ) : (
                                                <span className="text-xs text-muted-foreground">None</span>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Button variant="ghost" size="icon" onClick={() => handleEditClick(user.userId)}>
                                                <Edit className="h-4 w-4" />
                                            </Button>
                                            <Button 
                                                variant="ghost" 
                                                size="icon" 
                                                onClick={() => handleDeleteClick(user)}
                                                className="text-destructive hover:text-destructive"
                                                disabled={isDeleting || user.userId === authUser?.uid}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </TableCell>
                                        </TableRow>
                                    );
                                    })
                                ) : (
                                    <TableRow>
                                    <TableCell colSpan={6} className="h-24 text-center">
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
            </div>

            <AlertDialog open={!!userToDelete} onOpenChange={(open) => !open && setUserToDelete(null)}>
                <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                    This action cannot be undone. This will permanently delete the user account
                    for <span className="font-bold">"{userToDelete?.name}"</span>.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={confirmDelete} disabled={isDeleting} className="bg-destructive hover:bg-destructive/90">
                    {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Delete User
                    </AlertDialogAction>
                </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );
}


export default function UsersPage() {
  return (
    <AdminAuthGuard>
      <AdminUsersContent />
    </AdminAuthGuard>
  )
}
