
'use client';

import { usePathname } from 'next/navigation';
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

export function UserNav() {
  const pathname = usePathname();
  const isAdmin = pathname.startsWith('/dashboard');

  const userAvatar = PlaceHolderImages.find(img => img.id === (isAdmin ? 'user-avatar-1' : 'student-avatar-1'));
  const userName = isAdmin ? "Admin" : "Student";
  const userEmail = isAdmin ? "admin@examplify.ai" : "student@examplify.ai";

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

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-8 w-8 rounded-full">
          <Avatar className="h-9 w-9">
            <AvatarImage src={userAvatar?.imageUrl} alt={userName} data-ai-hint={userAvatar?.imageHint} />
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
         <Link href={isAdmin ? "/student-dashboard" : "/dashboard"} passHref>
            <DropdownMenuItem>
              Switch to {isAdmin ? "Student" : "Admin"} View
            </DropdownMenuItem>
          </Link>
        <DropdownMenuItem>
          Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
