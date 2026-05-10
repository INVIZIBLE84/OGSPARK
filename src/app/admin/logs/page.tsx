
"use client";

import * as React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { FileText, Search, Filter, Calendar as CalendarIcon, Download, Loader2 } from "lucide-react";
import { DateRange } from "react-day-picker";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { addDays, format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { getAuditLogs, exportAuditLogsToCSV, type AuditLogEntryAdmin, type AuditLogFilters } from "@/services/admin"; // Import log service functions
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge"; // Added Badge import


// Helper to get distinct action types from logs (or define statically)
const getActionTypes = (logs: AuditLogEntryAdmin[]): string[] => {
    return Array.from(new Set(logs.map(log => log.action)));
};

export default function AdminLogsPage() {
    const { toast } = useToast();
    const [logs, setLogs] = React.useState<AuditLogEntryAdmin[]>([]);
    const [isLoading, setIsLoading] = React.useState(true);
    const [filters, setFilters] = React.useState<AuditLogFilters>({});
    const [dateRange, setDateRange] = React.useState<DateRange | undefined>({
        from: addDays(new Date(), -7), // Default to last 7 days
        to: new Date(),
    });
     const [actionTypes, setActionTypes] = React.useState<string[]>([]); // For filter dropdown

    // Fetch logs on mount and filter/date change
    React.useEffect(() => {
        const fetchLogsData = async () => {
            setIsLoading(true);
            const effectiveFilters: AuditLogFilters = {
                ...filters,
                startDate: dateRange?.from ? format(dateRange.from, 'yyyy-MM-dd') : undefined,
                endDate: dateRange?.to ? format(dateRange.to, 'yyyy-MM-dd') : undefined,
            };
            try {
                const fetchedLogs = await getAuditLogs(effectiveFilters);
                setLogs(fetchedLogs);
                 // Update action types for filter dropdown based on fetched logs
                 if(fetchedLogs.length > 0 && actionTypes.length === 0) { // Only set once initially or if empty
                     setActionTypes(getActionTypes(fetchedLogs));
                 }
            } catch (error) {
                console.error("Error fetching audit logs:", error);
                toast({ variant: "destructive", title: "Error", description: "Could not fetch audit logs." });
            } finally {
                setIsLoading(false);
            }
        };
        // Debounce or trigger explicitly? Fetch on filter/date change for now.
        const timer = setTimeout(() => fetchLogsData(), 300);
        return () => clearTimeout(timer);
    }, [filters, dateRange, toast]); // Removed actionTypes dependency to avoid loop


    const handleFilterChange = (key: keyof AuditLogFilters, value: string | undefined) => {
        setFilters(prev => ({ ...prev, [key]: value === 'all' || value === '' ? undefined : value }));
    };

    const handleExportCSV = async () => {
         // Consider adding a loading state for export
         toast({ title: "Exporting...", description: "Generating CSV file." });
         try {
              const effectiveFilters: AuditLogFilters = {
                 ...filters,
                 startDate: dateRange?.from ? format(dateRange.from, 'yyyy-MM-dd') : undefined,
                 endDate: dateRange?.to ? format(dateRange.to, 'yyyy-MM-dd') : undefined,
             };
             const csvData = await exportAuditLogsToCSV(effectiveFilters);
             const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
             const link = document.createElement("a");
             const url = URL.createObjectURL(blob);
             link.setAttribute("href", url);
             link.setAttribute("download", `audit_log_${format(new Date(), 'yyyyMMdd_HHmmss')}.csv`);
             link.style.visibility = 'hidden';
             document.body.appendChild(link);
             link.click();
             document.body.removeChild(link);
             toast({ title: "Success", description: "Audit log CSV exported." });
         } catch (error: any) {
             console.error("Error exporting audit logs:", error);
             toast({ variant: "destructive", title: "Export Failed", description: error.message || "Could not export logs." });
         }
     };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                 <h1 className="text-3xl font-bold text-primary flex items-center gap-2"><FileText /> Audit Logs</h1>
                 <Button variant="outline" onClick={handleExportCSV} disabled={isLoading}>
                    <Download className="mr-2 h-4 w-4" /> Export CSV
                 </Button>
            </div>

            <Card>
                 <CardHeader>
                     <CardTitle>System Activity</CardTitle>
                     <CardDescription>Monitor user actions and system events across all modules.</CardDescription>
                     {/* Filters */}
                     <div className="flex flex-wrap gap-2 pt-4">
                        {/* Search Filter */}
                         <div className="relative flex-grow max-w-xs">
                             <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                             <Input
                                 type="search"
                                 placeholder="Search User/Action/Details..."
                                 className="pl-8"
                                 value={filters.searchQuery || ''}
                                 onChange={(e) => handleFilterChange('searchQuery', e.target.value)}
                             />
                         </div>
                         {/* Action Type Filter */}
                          <Select value={filters.action} onValueChange={(value) => handleFilterChange('action', value)}>
                             <SelectTrigger className="w-full sm:w-[180px]">
                                 <Filter className="h-4 w-4 mr-1 text-muted-foreground inline-block"/>
                                 <SelectValue placeholder="Filter by Action" />
                             </SelectTrigger>
                             <SelectContent>
                                 <SelectItem value="all">All Actions</SelectItem>
                                 {actionTypes.sort().map(action => (
                                     <SelectItem key={action} value={action}>{action}</SelectItem>
                                 ))}
                                  {/* Fallback if no actions loaded */}
                                  {actionTypes.length === 0 && <SelectItem value="loading" disabled>Loading actions...</SelectItem>}
                             </SelectContent>
                         </Select>
                          {/* User ID Filter (Optional) */}
                          {/* <Input placeholder="Filter by User ID" value={filters.userId || ''} onChange={(e) => handleFilterChange('userId', e.target.value)} className="w-full sm:w-[180px]" /> */}

                         {/* Date Range Picker */}
                         <Popover>
                            <PopoverTrigger asChild>
                                <Button
                                    id="date"
                                    variant={"outline"}
                                    className={cn(
                                    "w-full justify-start text-left font-normal sm:w-[300px]",
                                    !dateRange && "text-muted-foreground"
                                    )}
                                >
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {dateRange?.from ? (
                                    dateRange.to ? (
                                        <>
                                        {format(dateRange.from, "LLL dd, y")} -{" "}
                                        {format(dateRange.to, "LLL dd, y")}
                                        </>
                                    ) : (
                                        format(dateRange.from, "LLL dd, y")
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
                                    defaultMonth={dateRange?.from}
                                    selected={dateRange}
                                    onSelect={setDateRange}
                                    numberOfMonths={2}
                                />
                             </PopoverContent>
                        </Popover>

                        <Button variant="outline" onClick={() => { setFilters({}); setDateRange({ from: addDays(new Date(), -7), to: new Date() }); }}>Clear Filters</Button>
                    </div>
                 </CardHeader>
                 <CardContent>
                     <Table>
                         <TableHeader>
                             <TableRow>
                                 <TableHead className="w-[180px]">Timestamp</TableHead>
                                 <TableHead>User</TableHead>
                                 <TableHead>Action</TableHead>
                                 <TableHead>Details</TableHead>
                                 <TableHead className="hidden md:table-cell">IP Address</TableHead>
                             </TableRow>
                         </TableHeader>
                         <TableBody>
                             {isLoading ? (
                                // Skeleton Loader Rows
                                Array.from({ length: 8 }).map((_, i) => (
                                    <TableRow key={i}>
                                        <TableCell><Skeleton className="h-4 w-36 rounded" /></TableCell>
                                        <TableCell><Skeleton className="h-4 w-24 rounded" /></TableCell>
                                        <TableCell><Skeleton className="h-4 w-20 rounded" /></TableCell>
                                        <TableCell><Skeleton className="h-4 w-48 rounded" /></TableCell>
                                        <TableCell className="hidden md:table-cell"><Skeleton className="h-4 w-28 rounded" /></TableCell>
                                    </TableRow>
                                ))
                             ) : logs.length > 0 ? (
                                 logs.map((log) => (
                                     <TableRow key={log.id}>
                                         <TableCell className="text-xs text-muted-foreground">{format(new Date(log.timestamp), 'PPpp')}</TableCell>
                                         <TableCell>
                                            <span className="font-medium">{log.userName}</span>
                                             <span className="block text-xs text-muted-foreground">{log.userId}</span>
                                         </TableCell>
                                         <TableCell><Badge variant="secondary">{log.action}</Badge></TableCell>
                                         <TableCell className="text-sm text-muted-foreground">{log.details || '-'}</TableCell>
                                         <TableCell className="hidden md:table-cell text-xs text-muted-foreground">{log.ipAddress || 'N/A'}</TableCell>
                                     </TableRow>
                                 ))
                             ) : (
                                 <TableRow>
                                     <TableCell colSpan={5} className="text-center text-muted-foreground py-10">
                                         No audit logs found matching the criteria.
                                     </TableCell>
                                 </TableRow>
                             )}
                         </TableBody>
                     </Table>
                     {/* TODO: Add Pagination if logs are numerous */}
                 </CardContent>
            </Card>
        </div>
    );
}

