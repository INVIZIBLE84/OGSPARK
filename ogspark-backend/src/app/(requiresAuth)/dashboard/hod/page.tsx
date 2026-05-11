
"use client";

import * as React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { BarChart3, CheckCircle, FileUp, Users, AlertTriangle, Loader2 } from "lucide-react";
import Link from "next/link";
import { AuthUser, getCurrentUser } from "@/types/user";
import { Skeleton } from "@/components/ui/skeleton";
import { getDocuments } from "@/services/documents";
import { format } from "date-fns";
import { getAttendanceForFaculty } from "@/services/attendance";

export default function HODDashboardPage() {
    const [user, setUser] = React.useState<AuthUser | null>(null);
    const [isLoading, setIsLoading] = React.useState(true);
    const [error, setError] = React.useState<string | null>(null);

    // Data states for dashboard metrics
    const [attendanceSummary, setAttendanceSummary] = React.useState<{ presentToday?: number, totalStudents?: number } | null>(null);
    const [uploadedDocsCount, setUploadedDocsCount] = React.useState<number>(0);
    

    React.useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true);
            setError(null);
            const currentUser = await getCurrentUser();
            setUser(currentUser);

            if (!currentUser || currentUser.role !== 'hod') {
                setError("Access denied. Head of Department role required.");
                setIsLoading(false);
                return;
            }
            if (!currentUser.department || !currentUser.facultyId) {
                 setError("HOD profile incomplete (missing department or ID).");
                 setIsLoading(false);
                 return;
            }

            try {
                 // TODO: Fetch real data from backend
                 const [deptDocs, attendance] = await Promise.all([
                    getDocuments({ department: currentUser.department }, currentUser),
                    getAttendanceForFaculty(currentUser.facultyId, currentUser.department) // Reuse faculty logic for department-wide view
                 ]);

                 setUploadedDocsCount(deptDocs.length);
                 setAttendanceSummary(attendance);

            } catch (err) {
                console.error("Error fetching HOD dashboard data:", err);
                setError("Failed to load dashboard data. Please try again later.");
            } finally {
                setIsLoading(false);
            }
        };

        fetchData();
    }, []);

    if (isLoading) {
        return <HODDashboardSkeleton />;
    }

    if (error) {
        return (
            <div className="space-y-6">
                <h1 className="text-3xl font-bold text-primary">HOD Dashboard</h1>
                <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Error</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            </div>
        );
    }

    if (!user) {
        return (
             <div className="space-y-6">
                <h1 className="text-3xl font-bold text-primary">HOD Dashboard</h1>
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
            <h1 className="text-3xl font-bold text-primary">Welcome, {user.name}</h1>
            <p className="text-muted-foreground">Head of Department Dashboard for {user.department}.</p>

            {/* Core Module Summaries */}
            <section className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-2">
                 <Link href="/attendance">
                     <Card className="group transform transition-transform duration-300 hover:-translate-y-1 hover:shadow-xl">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2"><BarChart3 className="text-primary" /> Department Attendance</CardTitle>
                             <CardDescription>Today's attendance overview for your department.</CardDescription>
                        </CardHeader>
                         <CardContent>
                             {attendanceSummary ? (
                                <>
                                     <p className="text-3xl font-bold">{attendanceSummary.presentToday ?? '0'} / {attendanceSummary.totalStudents ?? '0'}</p>
                                     <p className="text-sm text-muted-foreground">Students Present Today</p>
                                </>
                             ) : <p className="text-sm text-muted-foreground">No attendance data available.</p>}
                         </CardContent>
                    </Card>
                 </Link>

                 <Link href="/documents">
                     <Card className="group transform transition-transform duration-300 hover:-translate-y-1 hover:shadow-xl">
                        <CardHeader>
                             <CardTitle className="flex items-center gap-2"><FileUp className="text-blue-500" /> Department Documents</CardTitle>
                             <CardDescription>Manage and view documents for your department.</CardDescription>
                        </CardHeader>
                         <CardContent>
                             <p className="text-3xl font-bold">{uploadedDocsCount}</p>
                             <p className="text-sm text-muted-foreground">Total Documents</p>
                         </CardContent>
                    </Card>
                 </Link>
            </section>
        </div>
    );
}

// Skeleton Loader for HOD Dashboard
function HODDashboardSkeleton() {
    return (
        <div className="space-y-6 animate-pulse">
             <Skeleton className="h-8 w-1/2 rounded" /> {/* Title */}
             <Skeleton className="h-4 w-3/4 rounded" /> {/* Description */}

             <section className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                 {Array.from({ length: 3 }).map((_, i) => (
                    <Card key={i}>
                         <CardHeader>
                             <Skeleton className="h-6 w-1/2 rounded mb-1" />
                             <Skeleton className="h-4 w-3/4 rounded" />
                         </CardHeader>
                         <CardContent>
                             <Skeleton className="h-10 w-1/3 rounded mb-1" />
                             <Skeleton className="h-4 w-1/2 rounded" />
                         </CardContent>
                    </Card>
                 ))}
            </section>
        </div>
    );
}
