
"use client";

import * as React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { BellRing, PlusCircle, Send, Loader2, Users, User, Building, Filter, Trash2, Calendar as CalendarIcon, Search } from "lucide-react"; // Added Search
import { DateRange } from "react-day-picker";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { addDays, format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { getBroadcasts, sendBroadcast, deleteBroadcast, type BroadcastMessage, type BroadcastTarget, type BroadcastFilters } from "@/services/admin"; // Import broadcast service functions
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { UserRole } from "@/types/user";

// Mock Target Options (replace with actual data fetching if dynamic)
const targetOptions = {
    roles: ['all', 'student', 'faculty', 'admin', 'print_cell', 'hod'], // Add more roles as needed
    departments: ['all', 'B. Voc', 'CSE', 'ENTC', 'IT', 'Mech. En', 'MBA', 'Administration', 'Printing Services', 'Library'], // Add more departments
    // specificUsers: [] // This would be populated via search/selection
};

export default function AdminBroadcastsPage() {
    const { toast } = useToast();
    const [broadcasts, setBroadcasts] = React.useState<BroadcastMessage[]>([]);
    const [isLoading, setIsLoading] = React.useState(true);
    const [showBroadcastDialog, setShowBroadcastDialog] = React.useState(false);
    const [isSending, setIsSending] = React.useState(false);
    const [filters, setFilters] = React.useState<BroadcastFilters>({});
    const [dateRange, setDateRange] = React.useState<DateRange | undefined>();

     // State for new broadcast form
    const [title, setTitle] = React.useState("");
    const [message, setMessage] = React.useState("");
    const [targetType, setTargetType] = React.useState<BroadcastTarget['type']>('all');
    const [targetValue, setTargetValue] = React.useState<string>('all'); // Role name, dept name, or user ID(s)
    const [channels, setChannels] = React.useState<BroadcastMessage['channels']>(['in-app']);

    // Fetch broadcasts on mount and filter change
    React.useEffect(() => {
        const fetchBroadcastsData = async () => {
            setIsLoading(true);
             const effectiveFilters: BroadcastFilters = {
                ...filters,
                startDate: dateRange?.from ? format(dateRange.from, 'yyyy-MM-dd') : undefined,
                endDate: dateRange?.to ? format(dateRange.to, 'yyyy-MM-dd') : undefined,
            };
            try {
                const fetchedBroadcasts = await getBroadcasts(effectiveFilters);
                setBroadcasts(fetchedBroadcasts);
            } catch (error) {
                 console.error("Error fetching broadcasts:", error);
                 toast({ variant: "destructive", title: "Error", description: "Could not fetch broadcast history." });
            } finally {
                setIsLoading(false);
            }
        };
         const timer = setTimeout(() => fetchBroadcastsData(), 300);
         return () => clearTimeout(timer);
    }, [filters, dateRange, toast]);

    const handleFilterChange = (key: keyof BroadcastFilters, value: string | undefined) => {
        setFilters(prev => ({ ...prev, [key]: value === 'all' || value === '' ? undefined : value }));
    };

    const handleChannelChange = (channel: 'in-app' | 'email', checked: boolean) => {
         setChannels(prev => {
            const newSet = new Set(prev);
             if (checked) {
                newSet.add(channel);
            } else {
                 newSet.delete(channel);
             }
             // Ensure at least one channel is selected?
             if (newSet.size === 0) newSet.add('in-app'); // Default to in-app
             return Array.from(newSet);
         });
     };

     const handleTargetTypeChange = (type: BroadcastTarget['type']) => {
         setTargetType(type);
         // Reset target value when type changes
         setTargetValue('all'); // Or set to the first option?
     };

     const getTargetInput = () => {
         switch (targetType) {
             case 'role':
                 return (
                     <Select value={targetValue} onValueChange={setTargetValue}>
                         <SelectTrigger><SelectValue placeholder="Select Role" /></SelectTrigger>
                         <SelectContent>
                             {targetOptions.roles.map(role => (
                                <SelectItem key={role} value={role} className="capitalize">{role}</SelectItem>
                             ))}
                         </SelectContent>
                     </Select>
                 );
             case 'department':
                return (
                     <Select value={targetValue} onValueChange={setTargetValue}>
                         <SelectTrigger><SelectValue placeholder="Select Department" /></SelectTrigger>
                         <SelectContent>
                             {targetOptions.departments.map(dept => (
                                <SelectItem key={dept} value={dept} className="capitalize">{dept}</SelectItem>
                             ))}
                         </SelectContent>
                     </Select>
                 );
            case 'user':
                return (
                    <Input
                        value={targetValue === 'all' ? '' : targetValue} // Clear if default 'all' was selected
                        onChange={(e) => setTargetValue(e.target.value)}
                        placeholder="Enter User ID(s), comma-separated"
                     />
                 );
            case 'all':
            default:
                 return <p className="text-sm text-muted-foreground">Sending to all users.</p>;
         }
     };


    const handleSendBroadcast = async () => {
        if (!title.trim() || !message.trim()) {
             toast({ variant: "destructive", title: "Error", description: "Title and message cannot be empty." });
             return;
         }
         if (channels.length === 0) {
             toast({ variant: "destructive", title: "Error", description: "Please select at least one channel." });
             return;
         }

        setIsSending(true);
         const target: BroadcastTarget = { type: targetType, value: targetValue };

        try {
            const result = await sendBroadcast({ title, message, target, channels });
            if (result.success && result.broadcast) {
                toast({ title: "Success", description: "Broadcast sent successfully." });
                setShowBroadcastDialog(false);
                // Reset form state
                 setTitle("");
                 setMessage("");
                 setTargetType('all');
                 setTargetValue('all');
                 setChannels(['in-app']);
                // Refresh broadcast list
                 const fetchedBroadcasts = await getBroadcasts(filters);
                 setBroadcasts(fetchedBroadcasts);
            } else {
                toast({ variant: "destructive", title: "Send Failed", description: result.message });
            }
        } catch (error: any) {
            console.error("Error sending broadcast:", error);
            toast({ variant: "destructive", title: "Send Error", description: error.message || "Could not send broadcast." });
        } finally {
            setIsSending(false);
        }
    };

     const handleDeleteBroadcast = async (broadcastId: string) => {
         if (!confirm(`Are you sure you want to delete this broadcast message? This cannot be undone.`)) return;
         // Consider specific loading state
         try {
             const result = await deleteBroadcast(broadcastId);
             if (result.success) {
                 toast({ title: "Success", description: "Broadcast deleted." });
                 // Refresh list
                 const fetchedBroadcasts = await getBroadcasts(filters);
                 setBroadcasts(fetchedBroadcasts);
             } else {
                 toast({ variant: "destructive", title: "Delete Failed", description: result.message });
             }
         } catch (error: any) {
             console.error("Error deleting broadcast:", error);
             toast({ variant: "destructive", title: "Delete Error", description: error.message || "Could not delete broadcast." });
         }
     };


    return (
        <div className="space-y-6">
             <div className="flex items-center justify-between">
                 <h1 className="text-3xl font-bold text-primary flex items-center gap-2"><BellRing /> Broadcasts</h1>
                  <Dialog open={showBroadcastDialog} onOpenChange={setShowBroadcastDialog}>
                     <DialogTrigger asChild>
                         <Button className="bg-accent hover:bg-accent/90 text-accent-foreground">
                            <PlusCircle className="mr-2 h-4 w-4" /> New Broadcast
                         </Button>
                     </DialogTrigger>
                     <DialogContent className="max-w-lg">
                         <DialogHeader>
                             <DialogTitle>Create New Broadcast</DialogTitle>
                             <DialogDescription>Send a message to selected users or groups.</DialogDescription>
                         </DialogHeader>
                         <div className="grid gap-4 py-4">
                             <div className="grid grid-cols-4 items-center gap-4">
                                 <Label htmlFor="title" className="text-right">Title</Label>
                                 <Input id="title" value={title} onChange={(e) => setTitle(e.target.value)} required className="col-span-3" />
                             </div>
                              <div className="grid grid-cols-4 items-start gap-4">
                                 <Label htmlFor="message" className="text-right pt-2">Message</Label>
                                 <Textarea id="message" value={message} onChange={(e) => setMessage(e.target.value)} required className="col-span-3 min-h-[100px]" />
                             </div>
                              <div className="grid grid-cols-4 items-center gap-4">
                                 <Label htmlFor="target-type" className="text-right">Target</Label>
                                 <Select value={targetType} onValueChange={(value) => handleTargetTypeChange(value as BroadcastTarget['type'])}>
                                    <SelectTrigger id="target-type" className="col-span-3">
                                        <SelectValue placeholder="Select Target Type" />
                                    </SelectTrigger>
                                    <SelectContent>
                                         <SelectItem value="all"><Users className="inline-block mr-2 h-4 w-4"/> All Users</SelectItem>
                                         <SelectItem value="role"><User className="inline-block mr-2 h-4 w-4"/> Specific Role</SelectItem>
                                         <SelectItem value="department"><Building className="inline-block mr-2 h-4 w-4"/> Specific Department</SelectItem>
                                         <SelectItem value="user"><User className="inline-block mr-2 h-4 w-4"/> Specific User(s)</SelectItem>
                                    </SelectContent>
                                </Select>
                             </div>
                              <div className="grid grid-cols-4 items-center gap-4">
                                <Label className="text-right">Target Value</Label>
                                 <div className="col-span-3">
                                      {getTargetInput()}
                                 </div>
                             </div>
                             <div className="grid grid-cols-4 items-start gap-4">
                                <Label className="text-right pt-2">Channels</Label>
                                <div className="col-span-3 space-y-2">
                                     <div className="flex items-center space-x-2">
                                         <Checkbox id="channel-in-app" checked={channels.includes('in-app')} onCheckedChange={(checked) => handleChannelChange('in-app', !!checked)} />
                                         <Label htmlFor="channel-in-app" className="font-normal">In-App Notification</Label>
                                     </div>
                                     <div className="flex items-center space-x-2">
                                         <Checkbox id="channel-email" checked={channels.includes('email')} onCheckedChange={(checked) => handleChannelChange('email', !!checked)} />
                                         <Label htmlFor="channel-email" className="font-normal">Email</Label>
                                     </div>
                                </div>
                             </div>
                             {/* TODO: Add Attachment Upload */}
                         </div>
                         <DialogFooter>
                            <Button type="button" variant="ghost" onClick={() => setShowBroadcastDialog(false)}>Cancel</Button>
                            <Button type="button" onClick={handleSendBroadcast} disabled={isSending}>
                                {isSending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                                Send Broadcast
                            </Button>
                         </DialogFooter>
                     </DialogContent>
                 </Dialog>
             </div>

            <Card>
                 <CardHeader>
                     <CardTitle>Broadcast History</CardTitle>
                     <CardDescription>View previously sent messages.</CardDescription>
                     {/* Filters */}
                     <div className="flex flex-wrap gap-2 pt-4">
                         <div className="relative flex-grow max-w-xs">
                             <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                             <Input
                                 type="search"
                                 placeholder="Search Title/Message..."
                                 className="pl-8"
                                 value={filters.searchQuery || ''}
                                 onChange={(e) => handleFilterChange('searchQuery', e.target.value)}
                             />
                         </div>
                          {/* Target Filter (Simplified) */}
                          <Select value={filters.targetType} onValueChange={(value) => handleFilterChange('targetType', value as BroadcastTarget['type'])}>
                              <SelectTrigger className="w-full sm:w-[180px]">
                                  <Filter className="h-4 w-4 mr-1 text-muted-foreground inline-block"/>
                                  <SelectValue placeholder="Filter by Target Type" />
                              </SelectTrigger>
                              <SelectContent>
                                  <SelectItem value="all">All Targets</SelectItem>
                                  <SelectItem value="role">Role</SelectItem>
                                  <SelectItem value="department">Department</SelectItem>
                                  <SelectItem value="user">User</SelectItem>
                                  {/* Add more if needed */}
                              </SelectContent>
                          </Select>
                         {/* Date Range Picker */}
                         <Popover>
                            <PopoverTrigger asChild>
                                <Button
                                    id="date-hist"
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
                                    <span>Pick date range</span>
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
                                    numberOfMonths={1} // Single month might be enough here
                                />
                             </PopoverContent>
                        </Popover>
                         <Button variant="outline" onClick={() => { setFilters({}); setDateRange(undefined); }}>Clear Filters</Button>
                     </div>
                 </CardHeader>
                 <CardContent>
                    <Table>
                         <TableHeader>
                            <TableRow>
                                 <TableHead className="w-[160px]">Sent Date</TableHead>
                                <TableHead>Title</TableHead>
                                <TableHead className="hidden md:table-cell">Target</TableHead>
                                <TableHead>Channels</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                         </TableHeader>
                         <TableBody>
                            {isLoading ? (
                                 Array.from({ length: 5 }).map((_, i) => (
                                    <TableRow key={i}>
                                        <TableCell><Skeleton className="h-4 w-32 rounded" /></TableCell>
                                        <TableCell><Skeleton className="h-4 w-40 rounded" /></TableCell>
                                        <TableCell className="hidden md:table-cell"><Skeleton className="h-4 w-24 rounded" /></TableCell>
                                        <TableCell><Skeleton className="h-4 w-20 rounded" /></TableCell>
                                        <TableCell className="text-right"><Skeleton className="h-8 w-8 rounded ml-auto" /></TableCell>
                                    </TableRow>
                                ))
                            ) : broadcasts.length > 0 ? (
                                broadcasts.map((b) => (
                                    <TableRow key={b.id}>
                                        <TableCell className="text-xs text-muted-foreground">{format(new Date(b.sentDate), 'PP p')}</TableCell>
                                        <TableCell className="font-medium">{b.title}</TableCell>
                                         <TableCell className="hidden md:table-cell text-sm capitalize text-muted-foreground">
                                            {b.target.type === 'all' ? 'All Users' : `${b.target.type}: ${b.target.value}`}
                                         </TableCell>
                                        <TableCell className="text-xs uppercase text-muted-foreground">{b.channels.join(', ')}</TableCell>
                                        <TableCell className="text-right">
                                             {/* Add View Details Button/Modal */}
                                             {/* <Button variant="ghost" size="sm" className="mr-1">View</Button> */}
                                             <Button
                                                 variant="destructive"
                                                 size="icon"
                                                 onClick={() => handleDeleteBroadcast(b.id)}
                                                 title="Delete Broadcast"
                                             >
                                                <Trash2 className="h-4 w-4" />
                                             </Button>
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center text-muted-foreground py-10">No broadcast messages found.</TableCell>
                                </TableRow>
                            )}
                         </TableBody>
                    </Table>
                     {/* TODO: Add Pagination */}
                 </CardContent>
            </Card>
        </div>
    );
}

    