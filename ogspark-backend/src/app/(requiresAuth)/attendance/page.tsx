
"use client";

import * as React from "react";
import { useState, useEffect, useCallback, useMemo } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { Check, X, Clock, Loader2, CalendarDays, BarChart2, AlertTriangle, ListChecks, Search, Calendar as CalendarIcon } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { DateRange } from "react-day-picker";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";


import {
    getStudentAttendance,
    calculateAttendanceSummary,
    markManualAttendance,
    getTodayAttendanceStatus,
    type AttendanceRecord,
    type AttendanceSummary,
} from "@/services/attendance";
import { getCurrentUser, AuthUser, UserRole } from "@/types/user";
import { getUsers } from "@/services/admin";
import { cn } from "@/lib/utils";
import { format, addDays } from "date-fns";

const DEPARTMENTS = ['All', 'B. Voc', 'CSE', 'ENTC', 'IT', 'Mech. En', 'MBA'];

export default function AttendancePage() {
  const { toast } = useToast();
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [userRole, setUserRole] = useState<UserRole | null>(null);

  // Student specific state
  const [studentAttendanceData, setStudentAttendanceData] = useState<AttendanceRecord[]>([]);
  const [studentSummary, setStudentSummary] = useState<AttendanceSummary | null>(null);
  const [studentTodayStatus, setStudentTodayStatus] = useState<{ status: 'Present' | 'Absent' | 'Not Marked'; time?: string; method?: string } | null>(null);
  
  // Faculty/Admin specific state
  const [manualStudentList, setManualStudentList] = useState<AuthUser[]>([]);
  const [selectedStudentsForManual, setSelectedStudentsForManual] = useState<Record<string, boolean>>({});
  const [isSubmittingManual, setIsSubmittingManual] = useState(false);
  const [allAttendanceRecords, setAllAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [adminSearchQuery, setAdminSearchQuery] = useState("");
  const [adminSelectedDept, setAdminSelectedDept] = useState('All');
  const [adminDateRange, setAdminDateRange] = useState<DateRange | undefined>({
    from: addDays(new Date(), -7), // Default to last 7 days
    to: new Date(),
  });


  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentDateString, setCurrentDateString] = useState<string>('');


  const fetchStudentData = useCallback(async (studentId: string) => {
    try {
      const [data, status] = await Promise.all([
        getStudentAttendance({ studentId }),
        getTodayAttendanceStatus(studentId)
      ]);
      setStudentAttendanceData(data);
      setStudentSummary(calculateAttendanceSummary(data));
      setStudentTodayStatus(status);
    } catch (err) {
      console.error("Error fetching student attendance:", err);
      setError("Failed to load your attendance data.");
      toast({ variant: "destructive", title: "Error", description: "Could not fetch your attendance records." });
    }
  }, [toast]);

  const fetchAdminFacultyData = useCallback(async (user: AuthUser) => {
    try {
      // Both faculty and admin need the full student list for their respective views
      // Faculty view will be filtered by their department
      const studentRoleFilter = user.role === 'admin' ? 'student' : user.department;
      const students = await getUsers({ role: 'student', department: user.department });
      setManualStudentList(students);
      const allRecords = await getStudentAttendance({user: user}); // Fetches all for admin, filtered for faculty
      setAllAttendanceRecords(allRecords);
    } catch (err) {
      console.error("Error fetching admin/faculty data:", err);
      setError("Failed to load data for attendance management.");
      toast({ variant: "destructive", title: "Error", description: "Could not fetch necessary data." });
    }
  }, [toast]);

  useEffect(() => {
    const initialize = async () => {
      setIsLoading(true);
      setError(null);
      setCurrentDateString(new Date().toLocaleDateString());
      const user = await getCurrentUser();
      setCurrentUser(user);

      if (!user) {
        setError("User not authenticated.");
        setIsLoading(false);
        return;
      }
      setUserRole(user.role);

      if (user.role === 'student') {
        await fetchStudentData(user.id);
      } else if (user.role === 'faculty' || user.role === 'admin' || user.role === 'hod') {
        await fetchAdminFacultyData(user);
      }
      setIsLoading(false);
    };
    initialize();
  }, [fetchStudentData, fetchAdminFacultyData]);
  
  // --- Faculty/Admin: Manual Attendance ---
  const handleManualStudentSelect = (studentId: string, checked: boolean | "indeterminate") => {
    if (typeof checked === 'boolean') {
        setSelectedStudentsForManual(prev => ({ ...prev, [studentId]: checked }));
    }
  };

  const handleManualSubmit = async () => {
    if (!currentUser || !['faculty', 'admin', 'hod'].includes(currentUser.role)) return;
    setIsSubmittingManual(true);
    setError(null);
    let successCount = 0;
    let failCount = 0;
    const todayDate = new Date().toISOString().split('T')[0];

    for (const studentId in selectedStudentsForManual) {
      if (selectedStudentsForManual[studentId]) {
        try {
          const result = await markManualAttendance(studentId, {
            classId: 'MANUAL-CLASS-' + todayDate, 
            markedBy: currentUser.id,
            isPresent: true, 
            dateOverride: todayDate
          });
          if (result.success) {
            successCount++;
          } else {
            failCount++;
            toast({ variant: "destructive", title: `Failed for ${studentId}`, description: result.message, duration: 2000 });
          }
        } catch (err) {
          failCount++;
          toast({ variant: "destructive", title: `Error for ${studentId}`, description: "Could not mark attendance.", duration: 2000 });
        }
      }
    }
    toast({
      title: "Manual Attendance Submitted",
      description: `${successCount} marked successfully. ${failCount} failed.`,
    });
    setSelectedStudentsForManual({});
    setIsSubmittingManual(false);
    if (currentUser?.role !== 'student') await fetchAdminFacultyData(currentUser); // Refresh list
  };
  
    const filteredAdminRecords = useMemo(() => {
        let records = allAttendanceRecords;

        // Filter by department first
        if (adminSelectedDept !== 'All') {
            records = records.filter(record => record.department === adminSelectedDept);
        }
        
        // Filter by date range
        if (adminDateRange?.from) {
            records = records.filter(record => new Date(record.date) >= adminDateRange.from!);
        }
        if (adminDateRange?.to) {
             records = records.filter(record => new Date(record.date) <= adminDateRange.to!);
        }

        // Then filter by search query
        if (!adminSearchQuery) return records;
        const query = adminSearchQuery.toLowerCase();
        return records.filter(record =>
            (record.studentName && record.studentName.toLowerCase().includes(query)) ||
            record.studentId.toLowerCase().includes(query)
        );
    }, [allAttendanceRecords, adminSearchQuery, adminSelectedDept, adminDateRange]);


  if (isLoading) return <div className="space-y-6"><h1 className="text-3xl font-bold text-primary flex items-center gap-2"><CalendarDays /> Attendance</h1><Card><CardHeader><CardTitle>Loading Attendance...</CardTitle></CardHeader><CardContent className="flex justify-center items-center p-10"><Loader2 className="h-12 w-12 animate-spin text-primary" /></CardContent></Card></div>;
  if (error) return <div className="space-y-6"><h1 className="text-3xl font-bold text-primary flex items-center gap-2"><CalendarDays /> Attendance</h1><Alert variant="destructive"><AlertTriangle className="h-4 w-4" /><AlertTitle>Error</AlertTitle><AlertDescription>{error}</AlertDescription></Alert></div>;
  if (!currentUser) return <div className="space-y-6"><h1 className="text-3xl font-bold text-primary flex items-center gap-2"><CalendarDays /> Attendance</h1><Alert variant="destructive"><AlertTriangle className="h-4 w-4" /><AlertTitle>Authentication Error</AlertTitle><AlertDescription>Could not determine user.</AlertDescription></Alert></div>;

  // --- Student View ---
  const renderStudentView = () => (
    <>
      <Card className="transform transition-transform duration-300 hover:shadow-lg">
        <CardHeader>
          <CardTitle>Today's Attendance</CardTitle>
          <CardDescription>{currentDateString ? `Status for ${currentDateString}.` : `Loading date...`}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            {studentTodayStatus?.status === 'Present' && <Check className="h-6 w-6 text-green-500" />}
            {studentTodayStatus?.status === 'Absent' && <X className="h-6 w-6 text-red-500" />}
            {studentTodayStatus?.status === 'Not Marked' && <Clock className="h-6 w-6 text-yellow-500" />}
            <span className={cn(
                "text-lg font-semibold",
                studentTodayStatus?.status === 'Present' && "text-green-600",
                studentTodayStatus?.status === 'Absent' && "text-red-600",
                studentTodayStatus?.status === 'Not Marked' && "text-yellow-600"
            )}>
                {studentTodayStatus?.status ?? 'Loading...'}
                {studentTodayStatus?.time && ` at ${studentTodayStatus.time}`}
                {studentTodayStatus?.method && ` (via ${studentTodayStatus.method.replace('_', ' ')})`}
            </span>
          </div>
        </CardContent>
      </Card>

      {studentSummary && (
         <Card className="transform transition-transform duration-300 hover:shadow-lg">
           <CardHeader><CardTitle>Attendance Summary</CardTitle><CardDescription>Your overview.</CardDescription></CardHeader>
           <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <SummaryBox label="Total Days" value={studentSummary.totalDays} color="secondary" />
              <SummaryBox label="Present" value={studentSummary.presentDays} color="green" />
              <SummaryBox label="Absent" value={studentSummary.absentDays} color="red" />
              <SummaryBox label="Percentage" value={`${studentSummary.attendancePercentage}%`} color="primary" />
           </CardContent>
         </Card>
      )}
      {renderDetailedTable(studentAttendanceData, false)}
    </>
  );

  // --- Faculty/Admin View ---
  const renderFacultyAdminView = () => {
    // Admin only gets to view records (with search & tabs)
    if (userRole === 'admin') {
      return (
        <Card className="transform transition-transform duration-300 hover:shadow-lg">
             <CardHeader>
                 <CardTitle>View Records</CardTitle>
                 <CardDescription>Search and view all attendance records by department and date.</CardDescription>
                  <div className="flex flex-col sm:flex-row gap-2 pt-2">
                     <div className="relative flex-grow">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search student..."
                            value={adminSearchQuery}
                            onChange={(e) => setAdminSearchQuery(e.target.value)}
                            className="pl-8 w-full"
                        />
                     </div>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            id="date"
                            variant={"outline"}
                            className={cn(
                              "w-full sm:w-[300px] justify-start text-left font-normal",
                              !adminDateRange && "text-muted-foreground"
                            )}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {adminDateRange?.from ? (
                              adminDateRange.to ? (
                                <>
                                  {format(adminDateRange.from, "LLL dd, y")} -{" "}
                                  {format(adminDateRange.to, "LLL dd, y")}
                                </>
                              ) : (
                                format(adminDateRange.from, "LLL dd, y")
                              )
                            ) : (
                              <span>Pick a date range</span>
                            )}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            initialFocus
                            mode="range"
                            defaultMonth={adminDateRange?.from}
                            selected={adminDateRange}
                            onSelect={setAdminDateRange}
                            numberOfMonths={2}
                          />
                        </PopoverContent>
                      </Popover>
                 </div>
             </CardHeader>
             <CardContent>
                 <Tabs value={adminSelectedDept} onValueChange={setAdminSelectedDept} className="w-full">
                    <TabsList className="grid w-full grid-cols-3 md:grid-cols-7">
                        {DEPARTMENTS.map(dept => (
                            <TabsTrigger key={dept} value={dept}>{dept}</TabsTrigger>
                        ))}
                    </TabsList>
                    {DEPARTMENTS.map(dept => (
                        <TabsContent key={dept} value={dept} className="mt-4">
                           {renderDetailedTable(filteredAdminRecords, true)}
                        </TabsContent>
                    ))}
                 </Tabs>
             </CardContent>
         </Card>
      );
    }
    
    // Faculty/HOD gets tabs for manual entry and viewing their department's records
    if (userRole === 'faculty' || userRole === 'hod') {
        return (
            <Tabs defaultValue="manual_entry" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="manual_entry"><ListChecks className="mr-1 h-4 w-4" />Manual Entry</TabsTrigger>
                    <TabsTrigger value="view_records"><BarChart2 className="mr-1 h-4 w-4" />View Records</TabsTrigger>
                </TabsList>

                <TabsContent value="manual_entry">
                    <Card className="transform transition-transform duration-300 hover:shadow-lg">
                        <CardHeader>
                            <CardTitle>Manual Attendance Entry</CardTitle>
                            <CardDescription>Mark attendance for students in your department ({currentUser?.department}) for {currentDateString}.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            {manualStudentList.length > 0 ? (
                                <div className="space-y-2 max-h-[400px] overflow-y-auto border rounded-md p-4">
                                    {manualStudentList.map(student => (
                                        <div key={student.id} className="flex items-center space-x-2 p-2 hover:bg-muted/50 rounded">
                                            <Checkbox
                                                id={`manual-${student.id}`}
                                                checked={selectedStudentsForManual[student.id] || false}
                                                onCheckedChange={(checked) => handleManualStudentSelect(student.id, checked)}
                                            />
                                            <Label htmlFor={`manual-${student.id}`} className="flex-1 cursor-pointer">
                                                {student.name} ({student.studentId || student.id})
                                            </Label>
                                        </div>
                                    ))}
                                </div>
                            ) : <p className="text-muted-foreground">No students found in your department.</p>}
                            <Button onClick={handleManualSubmit} disabled={isSubmittingManual || Object.values(selectedStudentsForManual).every(v => !v)}>
                                {isSubmittingManual ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}
                                Submit Manual Attendance
                            </Button>
                        </CardContent>
                        <CardFooter><p className="text-xs text-muted-foreground">Submitted attendance will be marked as 'Present'.</p></CardFooter>
                    </Card>
                </TabsContent>

                <TabsContent value="view_records">
                    {renderDetailedTable(allAttendanceRecords, true)}
                </TabsContent>
            </Tabs>
        );
    }
  };

  const renderDetailedTable = (data: AttendanceRecord[], showStudentName = false) => (
    <Card className={cn(showStudentName ? "border-none shadow-none" : "transform transition-transform duration-300 hover:shadow-lg")}>
       {!showStudentName && (
           <CardHeader>
               <CardTitle>Detailed Records</CardTitle>
               <CardDescription>List of {userRole === 'student' ? 'your' : 'all'} recorded attendance.</CardDescription>
           </CardHeader>
       )}
       <CardContent className={cn(showStudentName && "p-0")}>
        <div className="max-h-[500px] overflow-y-auto">
        <Table>
          <TableHeader className="sticky top-0 bg-background z-10">
            <TableRow>
              {showStudentName && <TableHead>Student</TableHead>}
              {showStudentName && userRole === 'admin' && <TableHead>Department</TableHead>}
              <TableHead>Date</TableHead>
              <TableHead className="text-center">Status</TableHead>
              <TableHead className="hidden sm:table-cell">Time Marked</TableHead>
              <TableHead className="hidden md:table-cell">Method</TableHead>
              <TableHead className="hidden md:table-cell">Remarks</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.length > 0 ? (
              data.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime() || (b.timestamp || '').localeCompare(a.timestamp || '')).map((record) => (
                <TableRow key={record.id}>
                  {showStudentName && <TableCell>{record.studentName || record.studentId}</TableCell>}
                  {showStudentName && userRole === 'admin' && <TableCell>{record.department || 'N/A'}</TableCell>}
                  <TableCell>{new Date(record.date).toLocaleDateString()}</TableCell>
                  <TableCell className="text-center">
                    {record.isPresent ? <Check className="h-5 w-5 text-green-500 inline-block" /> : <X className="h-5 w-5 text-red-500 inline-block" />}
                  </TableCell>
                  <TableCell className="hidden sm:table-cell text-muted-foreground">
                    {record.timestamp ? format(new Date(record.timestamp), 'p') : 'N/A'}
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-muted-foreground capitalize">{record.method?.replace('_', ' ') || '-'}</TableCell>
                  <TableCell className="hidden md:table-cell text-muted-foreground">{record.remarks || '-'}</TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow><TableCell colSpan={showStudentName ? 7 : 5} className="text-center text-muted-foreground py-6">No records found for the selected filters.</TableCell></TableRow>
            )}
          </TableBody>
        </Table>
        </div>
      </CardContent>
       {showStudentName && userRole === 'admin' && <CardFooter className="text-sm text-muted-foreground pt-4">Showing {filteredAdminRecords.length} of {allAttendanceRecords.length} records.</CardFooter>}
    </Card>
 );

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-primary flex items-center gap-2">
         <CalendarDays className="h-7 w-7" /> Attendance <span className="text-sm font-normal text-muted-foreground">({userRole})</span>
      </h1>
       {userRole === 'student' && renderStudentView()}
       {(userRole === 'faculty' || userRole === 'admin' || userRole === 'hod') && renderFacultyAdminView()}
    </div>
  );
}

interface SummaryBoxProps { label: string; value: string | number; color: 'primary' | 'secondary' | 'green' | 'red';}
function SummaryBox({ label, value, color }: SummaryBoxProps) {
    const colorClasses = {
        primary: 'bg-primary/10 text-primary',
        secondary: 'bg-secondary/10 text-secondary-foreground',
        green: 'bg-green-500/10 text-green-600',
        red: 'bg-red-500/10 text-red-600',
    };
    return (<div className={`flex flex-col items-center p-4 rounded-lg ${colorClasses[color]}`}><span className="text-2xl font-bold">{value}</span><span className="text-sm text-muted-foreground">{label}</span></div>);
}

