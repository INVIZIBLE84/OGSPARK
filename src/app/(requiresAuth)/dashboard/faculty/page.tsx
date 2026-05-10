
"use client";

import * as React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { BarChart3, CheckCircle, FileUp, Users, MessageSquare, AlertTriangle, Loader2 } from "lucide-react";
import Link from "next/link";
import { AuthUser, getCurrentUser, UserRole } from "@/types/user";
import { Skeleton } from "@/components/ui/skeleton";
import { getAttendanceForFaculty } from "@/services/attendance"; // Assuming basic fetch exists
import { getDocuments } from "@/services/documents"; // For document count
import { cn } from "@/lib/utils";
import { format } from "date-fns";


// --- Helper to get status style ---
// Re-use or import from a shared utility if available
const getStatusStyle = (status: 'Pending' | 'Approved' | 'Rejected' /* Add other statuses if needed */): { variant: "default" | "secondary" | "destructive" | "outline", className: string } => {
    switch (status) {
        case 'Approved': return { variant: 'default', className: 'bg-green-100 text-green-800 border-green-300' };
        case 'Rejected': return { variant: 'destructive', className: 'bg-red-100 text-red-800 border-red-300' };
        case 'Pending': return { variant: 'secondary', className: 'bg-yellow-100 text-yellow-800 border-yellow-300' };
        default: return { variant: 'outline', className: '' };
    }
};

export default function FacultyDashboardPage() {
    const [user, setUser] = React.useState<AuthUser | null>(null);
    const [isLoading, setIsLoading] = React.useState(true);
    const [error, setError] = React.useState<string | null>(null);

    // Data states (counts/summaries)
    const [attendanceSummary, setAttendanceSummary] = React.useState<{ presentToday?: number, totalStudents?: number } | null>(null);
    const [uploadedDocsCount, setUploadedDocsCount] = React.useState<number>(0);


    React.useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true);
            setError(null);
            const currentUser = await getCurrentUser();
            setUser(currentUser);

            if (!currentUser || currentUser.role !== 'faculty') {
                // Handled by layout, but keep check for robustness
                setError("Access denied. Faculty role required.");
                setIsLoading(false);
                return;
            }
            if (!currentUser.department || !currentUser.facultyId) {
                 setError("Faculty profile incomplete (missing department or ID).");
                 setIsLoading(false);
                 return;
            }

            try {
                 
                 // TODO: Fetch real data from backend
                 const [attendance, myDocs] = await Promise.all([
                    getAttendanceForFaculty(currentUser.facultyId, currentUser.department),
                    getDocuments({ uploaderId: currentUser.id }, currentUser)
                 ]);
                 
                 setAttendanceSummary(attendance); 
                 setUploadedDocsCount(myDocs.length);

            } catch (err) {
                console.error("Error fetching faculty dashboard data:", err);
                setError("Failed to load dashboard data. Please try again later.");
            } finally {
                setIsLoading(false);
            }
        };

        fetchData();
    }, []);

     if (isLoading) {
        return <FacultyDashboardSkeleton />;
    }

    if (error) {
        return (
            <div className="space-y-6">
                <h1 className="text-3xl font-bold text-primary">Faculty Dashboard</h1>
                <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Error</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            </div>
        );
    }

    if (!user) {
        // Should be handled by layout, but include fallback
        return (
             <div className="space-y-6">
                <h1 className="text-3xl font-bold text-primary">Faculty Dashboard</h1>
                <Alert variant="destructive">
                     <AlertTriangle className="h-4 w-4" />
                     <AlertTitle>Not Logged In</AlertTitle>
                     <AlertDescription>Please log in to view your dashboard.</AlertDescription>
                 </Alert>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold text-primary">Welcome, {user.name}!</h1>
             <p className="text-muted-foreground">Your central hub for managing classes, approvals, and documents ({user.department}).</p>

            {/* Core Module Summaries */}
            <section className="grid grid-cols-1 gap-6 md:grid-cols-2">
                 {/* Attendance Panel */}
                 <Link href="/attendance">
                     <Card className="group transform transition-transform duration-300 hover:-translate-y-1 hover:shadow-xl">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2"><BarChart3 className="text-primary" /> Class Attendance</CardTitle>
                             <CardDescription>Quick overview of today's attendance.</CardDescription>
                        </CardHeader>
                         <CardContent>
                             {attendanceSummary ? (
                                <>
                                     <p className="text-2xl font-bold">{attendanceSummary.presentToday ?? '0'} / {attendanceSummary.totalStudents ?? '0'}</p>
                                     <p className="text-sm text-muted-foreground">Students Present Today</p>
                                     {/* TODO: Add link to specific class */}
                                </>
                             ) : <p className="text-sm text-muted-foreground">No attendance data available.</p>}
                         </CardContent>
                    </Card>
                 </Link>

                 {/* Document Upload Panel */}
                  <Link href="/documents">
                     <Card className="group transform transition-transform duration-300 hover:-translate-y-1 hover:shadow-xl">
                        <CardHeader>
                             <CardTitle className="flex items-center gap-2"><FileUp className="text-blue-500" /> Documents & Papers</CardTitle>
                             <CardDescription>Manage exam papers and notices.</CardDescription>
                        </CardHeader>
                         <CardContent>
                             <p className="text-2xl font-bold">{uploadedDocsCount}</p>
                             <p className="text-sm text-muted-foreground">Your Uploaded Documents</p>
                             {/* <Button size="sm" variant="outline" className="mt-2"><FileUp className="mr-1 h-4 w-4"/> Upload New</Button> */}
                         </CardContent>
                    </Card>
                 </Link>
            </section>
        </div>
    );
}

// Skeleton Loader for Faculty Dashboard
function FacultyDashboardSkeleton() {
    return (
        <div className="space-y-6 animate-pulse">
             <Skeleton className="h-8 w-1/2 rounded" /> {/* Title */}
             <Skeleton className="h-4 w-3/4 rounded" /> {/* Description */}

             {/* Core Module Summaries Skeleton */}
             <section className="grid grid-cols-1 gap-6 md:grid-cols-2">
                 {Array.from({ length: 2 }).map((_, i) => (
                    <Card key={`core-${i}`}>
                         <CardHeader>
                             <Skeleton className="h-6 w-1/2 rounded mb-1" />
                             <Skeleton className="h-4 w-3/4 rounded" />
                         </CardHeader>
                         <CardContent>
                             <Skeleton className="h-8 w-1/4 rounded mb-1" />
                             <Skeleton className="h-4 w-1/2 rounded" />
                         </CardContent>
                    </Card>
                 ))}
            </section>

             {/* Secondary Sections Skeleton */}
              <section className="grid grid-cols-1 gap-6 md:grid-cols-2">
                  {/* Card 1 */}
                 <Card>
                     <CardHeader><Skeleton className="h-6 w-1/2 rounded" /></CardHeader>
                     <CardContent className="space-y-3">
                         <Skeleton className="h-4 w-full rounded" />
                         <Skeleton className="h-4 w-5/6 rounded" />
                         <Skeleton className="h-4 w-full rounded" />
                     </CardContent>
                 </Card>
                   {/* Card 2 */}
                 <Card>
                     <CardHeader><Skeleton className="h-6 w-1/2 rounded" /></CardHeader>
                     <CardContent className="space-y-3">
                         <Skeleton className="h-4 w-full rounded" />
                         <Skeleton className="h-4 w-5/6 rounded" />
                     </CardContent>
                 </Card>
            </section>
        </div>
    );
}
