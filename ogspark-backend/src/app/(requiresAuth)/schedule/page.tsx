
// src/app/(requiresAuth)/schedule/page.tsx -> Will function as Syllabus Page
"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { getCurrentUser, UserRole } from "@/types/user";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { BookOpen, AlertTriangle, Download } from "lucide-react"; // Import icons
import React from "react";


// TODO: Replace with actual data fetching from a service
interface SyllabusItem {
  courseCode: string;
  courseName: string;
  department: string;
  topics: string[]; // List of topics covered
  faculty: string;
}

export default function SyllabusPage() {
  const [user, setUser] = React.useState<Awaited<ReturnType<typeof getCurrentUser>> | null>(null);
  const [syllabuses, setSyllabuses] = React.useState<SyllabusItem[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    const fetchData = async () => {
        setIsLoading(true);
        const currentUser = await getCurrentUser();
        setUser(currentUser);

        if (currentUser) {
            // TODO: Replace this with actual data fetching from your backend
            // Example: const fetchedSyllabuses = await getSyllabusForDepartment(currentUser.department);
            setSyllabuses([]);
        }
        setIsLoading(false);
    }
    fetchData();
  }, []);

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-primary flex items-center gap-2">
         <BookOpen className="h-7 w-7"/> Course Syllabus
      </h1>

       {user && !['student', 'faculty', 'hod', 'admin'].includes(user.role) && (
           <Alert>
               <AlertTriangle className="h-4 w-4" />
               <AlertTitle>Information</AlertTitle>
               <AlertDescription>The syllabus section is available for students and faculty.</AlertDescription>
           </Alert>
       )}

       {user && ['student', 'faculty', 'hod', 'admin'].includes(user.role) && (
            syllabuses.length > 0 ? (
                <Card>
                    <CardHeader>
                        <CardTitle>Syllabus Overview</CardTitle>
                        <CardDescription>
                            List of subjects and their core topics for your department.
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="w-[30%]">Subject</TableHead>
                                    <TableHead>Topics</TableHead>
                                    <TableHead className="hidden sm:table-cell">Faculty</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {syllabuses.map((syllabus) => (
                                    <TableRow key={syllabus.courseCode}>
                                        <TableCell className="font-medium align-top">
                                            {syllabus.courseName}
                                            <span className="block text-xs text-muted-foreground">{syllabus.courseCode}</span>
                                        </TableCell>
                                        <TableCell>
                                            <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                                                {syllabus.topics.map(topic => <li key={topic}>{topic}</li>)}
                                            </ul>
                                        </TableCell>
                                        <TableCell className="hidden sm:table-cell align-top text-muted-foreground">{syllabus.faculty}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            ) : (
                <Card>
                    <CardContent className="pt-6">
                        <p className="text-center text-muted-foreground py-4">
                            {isLoading ? "Loading syllabus..." : "No syllabus information available for your department."}
                        </p>
                    </CardContent>
                </Card>
            )
       )}
    </div>
  );
}
