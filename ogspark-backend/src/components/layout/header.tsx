
"use client";

import * as React from "react";
import { useRouter, usePathname } from 'next/navigation';
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { LogOut, Settings, User, Bell } from "lucide-react";
import Link from "next/link";
import { AuthUser, getCurrentUser, logoutUser } from "@/types/user";
import { getUnreadNotificationCount } from "@/services/notifications";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { ThemeToggle } from "@/components/layout/theme-toggle";

export function Header() {
  const [user, setUser] = React.useState<AuthUser | null>(null);
  const [unreadCount, setUnreadCount] = React.useState(0);
  const [isLoadingUser, setIsLoadingUser] = React.useState(true);
  const [isLoggingOut, setIsLoggingOut] = React.useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const { toast } = useToast();

  React.useEffect(() => {
    const fetchData = async () => {
      setIsLoadingUser(true);
      const currentUser = await getCurrentUser();
      setUser(currentUser);
      if (currentUser) {
        try {
          const count = await getUnreadNotificationCount(currentUser.id);
          setUnreadCount(count);
        } catch (error) {
          console.error("Error fetching notification count:", error);
        }
      }
      setIsLoadingUser(false);
    };
    fetchData();
  }, [pathname]);

  const getInitials = (name: string | undefined): string => {
    return name ? name.split(' ').map(n => n[0]).join('').toUpperCase() : 'U';
  }

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await logoutUser();
      setUser(null);
      setUnreadCount(0);
      toast({
        title: "Logged Out",
        description: "You have been successfully logged out.",
      });
      router.push('/login');
    } catch (error) {
      console.error("Logout error:", error);
      toast({
        variant: "destructive",
        title: "Logout Failed",
        description: "Could not log you out. Please try again.",
      });
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background px-4 sm:static sm:h-auto sm:border-0 sm:bg-transparent sm:px-6">
      <SidebarTrigger className="md:hidden" />

      <div className="flex w-full items-center justify-end gap-2">
        <ThemeToggle />
        {!isLoadingUser && user && (
          <Button variant="ghost" size="icon" asChild>
            <Link href="/notifications" className="relative">
              <Bell className="h-5 w-5" />
              {unreadCount > 0 && (
                <Badge variant="destructive" className="absolute -top-1 -right-1 h-4 w-4 p-0 flex items-center justify-center text-xs">
                  {unreadCount}
                </Badge>
              )}
              <span className="sr-only">View notifications</span>
            </Link>
          </Button>
        )}

        {isLoadingUser ? (
          <Skeleton className="h-9 w-9 rounded-full" />
        ) : user ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Avatar className="h-9 w-9 cursor-pointer border-2 border-transparent hover:border-primary transition-colors">
                <AvatarImage src={user.avatarUrl || `https://picsum.photos/seed/${user.id}/100/100`} alt={user.name || 'User'} data-ai-hint="user profile picture"/>
                <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
              </Avatar>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>
                <div className="font-medium">{user.name}</div>
                <div className="text-xs text-muted-foreground">{user.email}</div>
                <div className="text-xs text-muted-foreground capitalize">Role: {user.role}</div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/profile" className="cursor-pointer">
                  <User className="mr-2 h-4 w-4" />
                  <span>Profile</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/settings" className="cursor-pointer">
                  <Settings className="mr-2 h-4 w-4" />
                  <span>Settings</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={handleLogout}
                disabled={isLoggingOut}
                className="cursor-pointer text-destructive focus:text-destructive-foreground focus:bg-destructive"
              >
                <LogOut className="mr-2 h-4 w-4" />
                <span>Logout</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : null }
      </div>
    </header>
  );
}
