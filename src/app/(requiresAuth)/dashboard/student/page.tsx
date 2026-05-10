
"use client";

import * as React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { BarChart3, CheckCircle, DollarSign, FileText, Bell, AlertTriangle, BrainCircuit, FileSignature, Send, Loader2 } from "lucide-react";
import Link from "next/link";
import { AuthUser, getCurrentUser, UserRole } from "@/types/user";
import { Skeleton } from "@/components/ui/skeleton";
import { getStudentAttendance, calculateAttendanceSummary, getTodayAttendanceStatus } from "@/services/attendance";
import { getFeeDetails, FeeDetails } from "@/services/fee-management"; // Import FeeDetails type
import { cn } from "@/lib/utils";
import { format } from "date-fns";

// Mock Data Types (replace with actual types if available)

interface MockApplication { id: string; type: string; status: string; submittedDate: string; }

// --- Helper to get status style ---
const getStatusStyle = (status: 'Paid' | 'Unpaid' | 'Partially Paid' | 'Pending' | 'Approved' | 'Rejected' | 'In Progress' | 'Present' | 'Absent' | 'Not Marked'): { variant: "default" | "secondary" | "destructive" | "outline", className: string } => {
    switch (status) {
        case 'Paid':
        case 'Approved':
        case 'Present':
            return { variant: 'default', className: 'bg-green-100 text-green-800 border-green-300' };
        case 'Unpaid':
        case 'Rejected':
        case 'Absent':
            return { variant: 'destructive', className: 'bg-red-100 text-red-800 border-red-300' };
        case 'Partially Paid':
        case 'Pending':
        case 'In Progress':
        case 'Not Marked':
            return { variant: 'secondary', className: 'bg-yellow-100 text-yellow-800 border-yellow-300' };
        default:
            return { variant: 'outline', className: '' };
    }
};

export default function StudentDashboardPage() {
    const [user, setUser] = React.useState<AuthUser | null>(null);
    const [isLoading, setIsLoading] = React.useState(true);
    const [error, setError] = React.useState<string | null>(null);

    // Data states with types
    const [attendanceSummary, setAttendanceSummary] = React.useState<any>(null); // Replace 'any' with AttendanceSummary type if available
    const [todayAttendance, setTodayAttendance] = React.useState<{ status: 'Present' | 'Absent' | 'Not Marked'; time?: string } | null>(null);
    const [feeDetails, setFeeDetails] = React.useState<FeeDetails | null>(null);

    // Mock data states
    const [applications, setApplications] = React.useState<MockApplication[]>([]);

    React.useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true);
            setError(null);
            const currentUser = await getCurrentUser();
            setUser(currentUser);

            if (!currentUser || currentUser.role !== 'student') {
                // Handled by layout, but set state for robustness
                setError("Access denied. Student role required.");
                setIsLoading(false);
                return;
            }

            try {
                const [attendanceData, todayStatus, fees] = await Promise.all([
                    getStudentAttendance({ studentId: currentUser.id }),
                    getTodayAttendanceStatus(currentUser.id),
                    getFeeDetails(currentUser.id),
                ]);

                setAttendanceSummary(calculateAttendanceSummary(attendanceData));
                setTodayAttendance(todayStatus);
                setFeeDetails(fees);

            } catch (err) {
                console.error("Error fetching student dashboard data:", err);
                setError("Failed to load dashboard data. Please try again later.");
            } finally {
                setIsLoading(false);
            }
        };

        fetchData();
    }, []);

    if (isLoading) {
        return <DashboardSkeleton />;
    }

    if (error) {
        return (
            <div className="space-y-6">
                <h1 className="text-3xl font-bold text-primary">Student Dashboard</h1>
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
                <h1 className="text-3xl font-bold text-primary">Student Dashboard</h1>
                <Alert variant="destructive">
                     <AlertTriangle className="h-4 w-4" />
                     <AlertTitle>Not Logged In</AlertTitle>
                     <AlertDescription>Please log in to view your dashboard.</AlertDescription>
                 </Alert>
            </div>
        );
    }


    const attendanceStatus = todayAttendance?.status || 'Not Marked';
    const attendanceStyle = getStatusStyle(attendanceStatus);
    const feeStatus = feeDetails?.status || 'Unpaid'; // Default to Unpaid if no details
    const feeStyle = getStatusStyle(feeStatus);


    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold text-primary">Welcome, {user.name}!</h1>

            {/* Core Module Summaries */}
            <section className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-2">
                {/* Attendance Panel */}
                <Link href="/attendance">
                     <Card className="group transform transition-transform duration-300 hover:-translate-y-1 hover:shadow-xl">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2"><BarChart3 className="text-primary" /> Attendance</CardTitle>
                            <CardDescription>Today: <Badge variant={attendanceStyle.variant} className={cn("ml-1", attendanceStyle.className)}>{attendanceStatus}</Badge></CardDescription>
                        </CardHeader>
                        <CardContent>
                             {attendanceSummary ? (
                                <>
                                    <p className="text-sm font-medium">Overall Percentage: <span className="text-primary">{attendanceSummary.attendancePercentage}%</span></p>
                                    <p className="text-xs text-muted-foreground">Present: {attendanceSummary.presentDays} days, Absent: {attendanceSummary.absentDays} days</p>
                                    {/* TODO: Add Mini Calendar/Heatmap */}
                                </>
                             ) : <p className="text-sm text-muted-foreground">No summary available.</p>}
                        </CardContent>
                    </Card>
                 </Link>

                {/* Fee Panel */}
                <Link href="/fees">
                    <Card className="group transform transition-transform duration-300 hover:-translate-y-1 hover:shadow-xl">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2"><DollarSign className="text-secondary" /> Fee Status</CardTitle>
                             <CardDescription>Current Status: <Badge variant={feeStyle.variant} className={cn("ml-1", feeStyle.className)}>{feeStatus}</Badge></CardDescription>
                        </CardHeader>
                        <CardContent>
                            {feeDetails ? (
                                <>
                                    <p className="text-sm font-medium">Balance Due: <span className={feeDetails.balanceDue > 0 ? "text-red-600" : "text-green-600"}>₹{feeDetails.balanceDue.toFixed(2)}</span></p>
                                     <p className="text-xs text-muted-foreground">Total Due: ₹{feeDetails.totalDue.toFixed(2)}{feeDetails.dueDate ? ` | Due: ${format(new Date(feeDetails.dueDate), 'PP')}` : ''}</p>
                                </>
                            ): <p className="text-sm text-muted-foreground">No fee details available.</p>}
                        </CardContent>
                    </Card>
                </Link>

            </section>

            {/* Other Sections */}
            <section className="grid grid-cols-1 gap-6 md:grid-cols-2">
                 {/* Submit Applications */}
                 <Card className="md:col-span-2">
                     <CardHeader>
                         <CardTitle className="flex items-center gap-2"><FileSignature className="text-orange-500" /> Applications & Forms</CardTitle>
                     </CardHeader>
                     <CardContent>
                         <div className="flex flex-col sm:flex-row gap-4">
                             <div className="flex-1">
                                <h3 className="font-semibold mb-2">Submit New</h3>
                                 <Button variant="outline" size="sm" className="mb-2 w-full sm:w-auto" disabled><Send className="mr-2 h-4 w-4"/>Submit Leave Application</Button>
                                 <Button variant="outline" size="sm" className="w-full sm:w-auto" disabled><Send className="mr-2 h-4 w-4"/>Request ID Card</Button>
                                 {/* TODO: Add more application buttons and backend functionality */}
                             </div>
                              <div className="flex-1 border-t sm:border-t-0 sm:border-l pt-4 sm:pt-0 sm:pl-4">
                                 <h3 className="font-semibold mb-2">Recent Submissions</h3>
                                  {applications.length > 0 ? (
                                      <ul className="space-y-2">
                                        {applications.map(app => {
                                             const appStyle = getStatusStyle(app.status as any); // Cast status for demo
                                             return (
                                                  <li key={app.id} className="text-sm text-muted-foreground">
                                                      <span>{app.type}</span> - <Badge variant={appStyle.variant} className={cn("text-xs", appStyle.className)}>{app.status}</Badge>
                                                      <span className="text-xs block">{format(new Date(app.submittedDate), 'PP')}</span>
                                                  </li>
                                             )
                                        })}
                                     </ul>
                                  ) : <p className="text-sm text-muted-foreground">No recent applications.</p>}
                             </div>
                         </div>
                     </CardContent>
                 </Card>
            </section>
        </div>
    );
}


// Skeleton Loader for Student Dashboard
function DashboardSkeleton() {
    return (
        <div className="space-y-6 animate-pulse">
             <Skeleton className="h-8 w-1/2 rounded" /> {/* Title */}

            {/* Core Module Summaries Skeleton */}
             <section className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-2">
                 {Array.from({ length: 2 }).map((_, i) => (
                    <Card key={i}>
                         <CardHeader>
                             <Skeleton className="h-6 w-1/3 rounded mb-1" />
                             <Skeleton className="h-4 w-1/2 rounded" />
                         </CardHeader>
                         <CardContent>
                             <Skeleton className="h-5 w-3/4 rounded mb-1" />
                             <Skeleton className="h-4 w-full rounded" />
                         </CardContent>
                    </Card>
                 ))}
            </section>

             {/* Other Sections Skeleton */}
             <section className="grid grid-cols-1 gap-6 md:grid-cols-2">
                  {/* Applications Card */}
                  <Card className="md:col-span-2">
                      <CardHeader><Skeleton className="h-6 w-1/2 rounded" /></CardHeader>
                     <CardContent className="flex flex-col sm:flex-row gap-4">
                          <div className="flex-1 space-y-2">
                              <Skeleton className="h-5 w-20 rounded mb-2"/>
                              <Skeleton className="h-8 w-32 rounded" />
                              <Skeleton className="h-8 w-28 rounded" />
                          </div>
                           <div className="flex-1 border-t sm:border-t-0 sm:border-l pt-4 sm:pt-0 sm:pl-4 space-y-3">
                               <Skeleton className="h-5 w-24 rounded mb-2"/>
                               <Skeleton className="h-4 w-full rounded" />
                               <Skeleton className="h-4 w-5/6 rounded" />
                           </div>
                     </CardContent>
                 </Card>
            </section>
        </div>
    );
}
