
"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
} from "@/components/ui/sidebar";
import { BarChart3, DollarSign, FileText, User as UserIcon, Settings, LayoutDashboard, LogOut, Bell, BookOpen, ShieldCheck, DatabaseZap, BellRing as BellRingIconLucide, Activity, Landmark, GraduationCap } from "lucide-react";
import { cn } from "@/lib/utils";
import { UserRole, getCurrentUser, AuthUser, logoutUser } from "@/types/user";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
  roles: UserRole[];
  isAdminSection?: boolean;
  isDashboardLink?: boolean;
}

const navItems: NavItem[] = [
  // Role-Specific Dashboards
   { href: "/dashboard/student", label: "My Dashboard", icon: <LayoutDashboard />, roles: ["student"], isDashboardLink: true },
   { href: "/dashboard/faculty", label: "Faculty Dashboard", icon: <LayoutDashboard />, roles: ["faculty"], isDashboardLink: true },
   { href: "/dashboard/hod", label: "HOD Dashboard", icon: <LayoutDashboard />, roles: ["hod"], isDashboardLink: true },
   { href: "/admin", label: "Admin Dashboard", icon: <LayoutDashboard />, roles: ["admin"], isAdminSection: true, isDashboardLink: true },
   // Account section has no dedicated dashboard, they use the fees page.

   // General Sections
  { href: "/attendance", label: "Attendance", icon: <GraduationCap />, roles: ["student", "faculty", "admin", "hod"] },
  { href: "/fees", label: "Fees", icon: <Landmark />, roles: ["student", "admin", "account_section"] },
  { href: "/clearance", label: "Clearance", icon: <ShieldCheck />, roles: ["student", "hod", "clearance_officer", "admin"] },
  { href: "/syllabus", label: "Syllabus", icon: <BookOpen />, roles: ["student", "faculty", "hod", "admin"] },
  { href: "/documents", label: "Documents", icon: <FileText />, roles: ["student", "faculty", "admin", "hod", "print_cell"] },
  { href: "/notifications", label: "Notifications", icon: <Bell />, roles: ["student", "faculty", "admin", "account_section", "hod", "print_cell", "clearance_officer"] },
  

  // Admin Sections
  { href: "/admin/users", label: "Users", icon: <UserIcon />, roles: ["admin"], isAdminSection: true },
  { href: "/admin/roles", label: "Roles", icon: <ShieldCheck />, roles: ["admin"], isAdminSection: true },
  { href: "/admin/logs", label: "Logs", icon: <Activity />, roles: ["admin"], isAdminSection: true },
  { href: "/admin/backups", label: "Backups", icon: <DatabaseZap />, roles: ["admin"], isAdminSection: true },
  { href: "/admin/broadcasts", label: "Broadcasts", icon: <BellRingIconLucide />, roles: ["admin"], isAdminSection: true },
];

export function AppSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { toast } = useToast();
  const [currentUser, setCurrentUser] = React.useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isLoggingOut, setIsLoggingOut] = React.useState(false);

   React.useEffect(() => {
     const fetchUser = async () => {
       setIsLoading(true);
       const user = await getCurrentUser();
       setCurrentUser(user);
       setIsLoading(false);
     };
     fetchUser();
   }, [pathname]);

  const filteredNavItems = navItems.filter(item => currentUser && item.roles.includes(currentUser.role));
  const dashboardLinks = filteredNavItems.filter(item => item.isDashboardLink);
  const generalNavItems = filteredNavItems.filter(item => !item.isDashboardLink && !item.isAdminSection);
  const adminNavItems = filteredNavItems.filter(item => item.isAdminSection && !item.isDashboardLink);

  const handleLogout = async () => {
      setIsLoggingOut(true);
      try {
          await logoutUser();
          setCurrentUser(null);
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
           setIsLoggingOut(false);
      }
  };

  const renderMenuItems = (items: NavItem[]) => {
     if (items === adminNavItems) {
        items.sort((a, b) => a.label.localeCompare(b.label));
     }

     return items.map((item) => {
         const isActive = pathname === item.href || (item.href !== "/" && !item.isDashboardLink && pathname.startsWith(item.href));
         const isAdminRootActive = item.href === "/admin" && pathname === "/admin";

          return (
              <SidebarMenuItem key={item.href}>
                <Link href={item.href} legacyBehavior passHref>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive || isAdminRootActive}
                    tooltip={item.label}
                    className={cn(
                      "transition-colors duration-200",
                       (isActive || isAdminRootActive)
                        ? "bg-primary/10 text-primary hover:bg-primary/20"
                        : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                    )}
                  >
                    <a>
                      {item.icon}
                      <span className="group-data-[collapsible=icon]:hidden">{item.label}</span>
                    </a>
                  </SidebarMenuButton>
                </Link>
              </SidebarMenuItem>
          );
        });
  };

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="flex flex-col items-center justify-center p-4">
         <Link href="/" className="flex flex-col items-center gap-2 overflow-hidden">
             <Image
                src="/sogo.png"
                alt="S.P.A.R.K. logo"
                data-ai-hint="spark logo"
                width={700}
                height={176}
                className="h-auto max-w-full group-data-[collapsible=icon]:w-[40px] group-data-[collapsible=icon]:h-auto"
                priority
             />
         </Link>
      </SidebarHeader>
      <SidebarContent className="p-2">
        <SidebarMenu>
           {isLoading ? (
             Array.from({ length: 8 }).map((_, index) => (
                <SidebarMenuItem key={`skel-${index}`}>
                     <SidebarMenuButton asChild disabled className="cursor-wait">
                         <a>
                             <Skeleton className="h-5 w-5 rounded" />
                            <Skeleton className="h-4 w-20 ml-2 group-data-[collapsible=icon]:hidden" />
                         </a>
                     </SidebarMenuButton>
                </SidebarMenuItem>
             ))
           ) : currentUser ? (
             <>
                 {renderMenuItems(dashboardLinks)}

                 {(generalNavItems.length > 0 || adminNavItems.length > 0) && <Separator className="my-2" />}

                 {renderMenuItems(generalNavItems)}

                {adminNavItems.length > 0 && (
                    <>
                        <Separator className="my-2 group-data-[collapsible=icon]:hidden" />
                         <SidebarMenuItem className="px-2 py-1 group-data-[collapsible=icon]:hidden">
                             <span className="text-xs font-semibold text-muted-foreground">Admin Panel</span>
                         </SidebarMenuItem>
                        {renderMenuItems(adminNavItems)}
                    </>
                )}
             </>
           ) : (
                <SidebarMenuItem>
                    <SidebarMenuButton disabled asChild>
                        <Link href="/login" className="text-xs text-muted-foreground group-data-[collapsible=icon]:hidden">
                            Login Required
                        </Link>
                    </SidebarMenuButton>
                </SidebarMenuItem>
           )}
        </SidebarMenu>
      </SidebarContent>
       <SidebarFooter className="p-2 mt-auto">
         <SidebarMenu>
            <SidebarMenuItem>
                <Link href="/profile" legacyBehavior passHref>
                  <SidebarMenuButton
                    tooltip="Profile"
                    className="text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                    isActive={pathname.startsWith('/profile')}
                  >
                    <UserIcon />
                    <span className="group-data-[collapsible=icon]:hidden">Profile</span>
                  </SidebarMenuButton>
                </Link>
            </SidebarMenuItem>
            <SidebarMenuItem>
                <Link href="/settings" legacyBehavior passHref>
                  <SidebarMenuButton
                    tooltip="Settings"
                     className="text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                     isActive={pathname.startsWith('/settings')}
                  >
                    <Settings />
                    <span className="group-data-[collapsible=icon]:hidden">Settings</span>
                  </SidebarMenuButton>
                </Link>
            </SidebarMenuItem>
            <Separator className="my-1" />
            <SidebarMenuItem>
                 <SidebarMenuButton
                   tooltip="Logout"
                   className="text-sidebar-foreground hover:bg-destructive/20 hover:text-destructive"
                    disabled={isLoading || !currentUser || isLoggingOut}
                    onClick={handleLogout}
                 >
                    <LogOut />
                    <span className="group-data-[collapsible=icon]:hidden">Logout</span>
                 </SidebarMenuButton>
            </SidebarMenuItem>
         </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}