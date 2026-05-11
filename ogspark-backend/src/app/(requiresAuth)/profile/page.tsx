
"use client"; // Required for hooks

import * as React from "react"; // Import React for hooks
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Mail, Phone, User, MapPin, Edit, AlertCircle, Calendar } from "lucide-react"; // Added AlertCircle & Calendar
import { AuthUser, getCurrentUser } from "@/types/user"; // Import types and fetch function
import { Skeleton } from "@/components/ui/skeleton"; // Import Skeleton
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"; // Import Alert components
import { format } from "date-fns";

export default function ProfilePage() {
  const [user, setUser] = React.useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);

   // Fetch user data on mount
   React.useEffect(() => {
     const fetchUser = async () => {
       setIsLoading(true);
       const currentUser = await getCurrentUser();
       setUser(currentUser);
       // No need to check if !currentUser here, parent layout handles it
       setIsLoading(false);
     };
     fetchUser();
   }, []);


  const getInitials = (name: string | undefined) => {
     return name ? name.split(' ').map(n => n[0]).join('').toUpperCase() : '?';
  }

   // Loading State
   if (isLoading) {
     return (
        <div className="space-y-6">
             <h1 className="text-3xl font-bold text-primary">My Profile</h1>
             <Card className="overflow-hidden">
                 <CardHeader className="flex flex-col items-center gap-4 bg-muted/30 p-6 text-center sm:flex-row sm:text-left">
                    <Skeleton className="h-24 w-24 rounded-full" />
                    <div className="space-y-2">
                        <Skeleton className="h-6 w-40 rounded" />
                        <Skeleton className="h-4 w-32 rounded" />
                        <Skeleton className="h-4 w-24 rounded" />
                    </div>
                     <Skeleton className="h-9 w-9 rounded ml-auto absolute top-4 right-4 sm:static" />
                 </CardHeader>
                 <CardContent className="p-6 space-y-4">
                     <Skeleton className="h-5 w-36 mb-2 rounded" />
                     <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        <InfoItemSkeleton />
                        <InfoItemSkeleton />
                        <InfoItemSkeleton />
                        <InfoItemSkeleton />
                     </div>
                 </CardContent>
             </Card>
        </div>
     )
   }

   // User should always be available here due to layout check
   if (!user) {
        // This case should ideally not be reached
        return (
             <div className="space-y-6">
                <h1 className="text-3xl font-bold text-primary">My Profile</h1>
                 <Alert variant="destructive">
                     <AlertCircle className="h-4 w-4" />
                     <AlertTitle>Error</AlertTitle>
                     <AlertDescription>
                         Could not load user profile data. Please try again later.
                     </AlertDescription>
                 </Alert>
             </div>
        );
   }

   // Logged In State
  const initials = getInitials(user.name);

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-primary">My Profile</h1>

      <Card className="overflow-hidden transform transition-transform duration-300 hover:shadow-lg">
        <CardHeader className="flex flex-col items-center gap-4 bg-gradient-to-br from-primary/10 via-secondary/10 to-accent/10 p-6 text-center sm:flex-row sm:text-left">
          <Avatar className="h-24 w-24 border-4 border-background shadow-lg">
            <AvatarImage src={user.avatarUrl} alt={user.name} data-ai-hint="user profile picture large"/>
            <AvatarFallback className="text-3xl">{initials}</AvatarFallback>
          </Avatar>
          <div className="space-y-1">
            <CardTitle className="text-2xl">{user.name}</CardTitle>
            <CardDescription className="text-muted-foreground capitalize">{user.role}{user.department ? ` - ${user.department}` : ''}</CardDescription>
            {user.studentId && <p className="text-sm text-muted-foreground">Student ID: {user.studentId}</p>}
             {user.facultyId && <p className="text-sm text-muted-foreground">Faculty ID: {user.facultyId}</p>}
          </div>
           <Button variant="outline" size="icon" className="ml-auto absolute top-4 right-4 sm:static">
              <Edit className="h-4 w-4" />
              <span className="sr-only">Edit Profile</span>
           </Button>
        </CardHeader>
        <CardContent className="p-6 space-y-4">
           <h3 className="text-lg font-semibold mb-2 border-b pb-1">Personal & Contact Information</h3>
           <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <InfoItem icon={<Mail className="text-primary"/>} label="Email" value={user.email} />
                {user.phone && <InfoItem icon={<Phone className="text-secondary"/>} label="Phone" value={user.phone} />}
                {user.birthdate && <InfoItem icon={<Calendar className="text-accent"/>} label="Birthdate" value={format(new Date(user.birthdate), "MMMM d, yyyy")} />}
                {user.address && <InfoItem icon={<MapPin className="text-green-500"/>} label="Address" value={user.address} />}
           </div>

            {/* Add more sections as needed, e.g., Academic Information, Emergency Contact */}

        </CardContent>
      </Card>
    </div>
  );
}


interface InfoItemProps {
    icon: React.ReactNode;
    label: string;
    value: string;
}

function InfoItem({ icon, label, value }: InfoItemProps) {
    return (
        <div className="flex items-start gap-3">
            <div className="flex-shrink-0 text-muted-foreground mt-1">{icon}</div>
            <div>
                <p className="text-sm font-medium">{label}</p>
                <p className="text-sm text-foreground">{value}</p>
            </div>
        </div>
    )
}

// Skeleton component for InfoItem
function InfoItemSkeleton() {
    return (
        <div className="flex items-start gap-3">
             <Skeleton className="h-5 w-5 rounded mt-1" />
            <div className="space-y-1.5">
                <Skeleton className="h-4 w-16 rounded" />
                <Skeleton className="h-4 w-32 rounded" />
            </div>
        </div>
    )
}
