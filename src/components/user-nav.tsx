'use client';

import { useRouter, usePathname } from 'next/navigation';
import { useAuth, useUser, useFirestore } from '@/firebase';
import { signOut } from 'firebase/auth';
import { doc } from 'firebase/firestore';
import { useDoc } from '@/firebase';
import type { UserProfile } from '@/types';

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { PlaceHolderImages } from "@/lib/placeholder-images"
import Link from 'next/link';
import { Skeleton } from './ui/skeleton';
import { useMemoFirebase } from '@/firebase/provider';

export function UserNav() {
  const router = useRouter();
  const pathname = usePathname();
  const auth = useAuth();
  const firestore = useFirestore();
  const { user: authUser, isUserLoading } = useUser();

  const userDocRef = useMemoFirebase(() => {
    if (!firestore || !authUser) return null;
    return doc(firestore, 'users', authUser.uid);
  }, [firestore, authUser]);

  const { data: userProfile, isLoading: isProfileLoading } = useDoc<UserProfile>(userDocRef);

  const handleLogout = async () => {
    if (auth) {
      await signOut(auth);
      router.push('/');
    }
  };
  
  const isLoading = isUserLoading || isProfileLoading;

  if (isLoading) {
    return <Skeleton className="h-9 w-9 rounded-full" />;
  }
  
  const isAdmin = userProfile?.role === 'admin';
  const currentViewIsAdmin = pathname.startsWith('/dashboard');

  const userAvatar = PlaceHolderImages.find(img => img.id === (isAdmin ? 'user-avatar-1' : 'student-avatar-1'));
  const userName = userProfile?.name || "User";
  const userEmail = authUser?.email || "No email";
  
  const menuItems = isAdmin 
    ? [
        { label: "Profile", href: "#" },
        { label: "Billing", href: "#" },
        { label: "Settings", href: "#" },
      ]
    : [
        { label: "My Profile", href: "#" },
        { label: "Settings", href: "#" },
        { label: "Help Center", href: "#" },
      ];

  const handleSwitchView = () => {
    if (currentViewIsAdmin) {
      router.push('/student-dashboard');
    } else {
      router.push('/dashboard');
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-8 w-8 rounded-full">
          <Avatar className="h-9 w-9">
            <AvatarImage src={userProfile?.avatarUrl || userAvatar?.imageUrl} alt={userName} data-ai-hint={userAvatar?.imageHint} />
            <AvatarFallback>{userName.charAt(0)}</AvatarFallback>
          </Avatar>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-56" align="end" forceMount>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">{userName}</p>
            <p className="text-xs leading-none text-muted-foreground">
              {userEmail}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          {menuItems.map(item => (
             <Link href={item.href} key={item.label} passHref>
                <DropdownMenuItem>
                    {item.label}
                </DropdownMenuItem>
             </Link>
          ))}
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        {isAdmin && (
          <DropdownMenuItem onClick={handleSwitchView}>
            Switch to {currentViewIsAdmin ? "Student" : "Admin"} View
          </DropdownMenuItem>
        )}
        <DropdownMenuItem onClick={handleLogout}>
          Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
