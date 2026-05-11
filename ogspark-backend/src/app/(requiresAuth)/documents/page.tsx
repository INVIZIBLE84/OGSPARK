
 "use client";

import * as React from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Download, FileText, Upload, Search, Filter, Archive, Printer, History, FileUp, Loader2, AlertTriangle, Info, Check, X, FileType, FileSpreadsheet, LucidePresentation, ImageIcon, FileArchive, FileQuestion, CalendarClock, BookOpen, Users } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Check as CheckIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { AuthUser, getCurrentUser, UserRole } from "@/types/user";
import { cn } from "@/lib/utils";
import { format } from 'date-fns';
import { getUsers } from "@/services/admin";
import {
    Document, DocumentFilters, DocumentMetadata, DocumentStatus, DocumentType, PrintRequest, AuditLogEntry,
    uploadDocument, getDocuments, getDocumentById, updateDocument, requestPrint, getPrintRequests, actionPrintRequest, markAsPrinted, getAuditLog,
    formatBytes, getFileIconType, FileIconType, getStatusBadgeVariant
} from "@/services/documents";

const FileIconMap: Record<FileIconType, React.ReactNode> = {
    pdf: <FileType className="text-red-500" />,
    word: <FileType className="text-blue-500" />,
    excel: <FileSpreadsheet className="text-green-500" />,
    powerpoint: <LucidePresentation className="text-orange-500" />,
    image: <ImageIcon className="text-purple-500" />,
    zip: <FileArchive className="text-yellow-600" />,
    text: <FileType className="text-gray-500" />,
    schedule: <CalendarClock className="text-indigo-500" />,
    syllabus: <BookOpen className="text-cyan-500" />,
    file: <FileQuestion className="text-muted-foreground" />,
};


export default function DocumentsPage() {
    const { toast } = useToast();
    const [user, setUser] = React.useState<AuthUser | null>(null);
    const [allUsers, setAllUsers] = React.useState<AuthUser[]>([]);
    const [isLoading, setIsLoading] = React.useState(true);
    const [error, setError] = React.useState<string | null>(null);
    const [activeTab, setActiveTab] = React.useState<string>("documents"); 

    const [documents, setDocuments] = React.useState<Document[]>([]);
    const [docFilters, setDocFilters] = React.useState<DocumentFilters>({ isArchived: false });
    const [isUploading, setIsUploading] = React.useState(false);
    const [showUploadDialog, setShowUploadDialog] = React.useState(false);

    // State for sharing
    const [selectedUsers, setSelectedUsers] = React.useState<AuthUser[]>([]);


    const [printRequests, setPrintRequests] = React.useState<PrintRequest[]>([]);
    const [printFilters, setPrintFilters] = React.useState<Partial<Pick<PrintRequest, 'status'>>>({});
    const [showPrintRequestDialog, setShowPrintRequestDialog] = React.useState(false);
    const [selectedDocForPrint, setSelectedDocForPrint] = React.useState<Document | null>(null);
    const [isRequestingPrint, setIsRequestingPrint] = React.useState(false);
    const [isActioningPrint, setIsActioningPrint] = React.useState<Record<string, boolean>>({});

     const [selectedDocForAudit, setSelectedDocForAudit] = React.useState<Document | null>(null);
     const [auditLog, setAuditLog] = React.useState<AuditLogEntry[]>([]);
     const [isLoadingAudit, setIsLoadingAudit] = React.useState(false);
     const [showAuditDialog, setShowAuditDialog] = React.useState(false);

    React.useEffect(() => {
        const initialize = async () => {
            setIsLoading(true);
            setError(null);
            const currentUser = await getCurrentUser();
            setUser(currentUser);

            if (!currentUser) {
                setError("User not authenticated.");
                setIsLoading(false);
                return;
            }

            try {
                 const [usersData] = await Promise.all([
                     getUsers(), // Fetch all users for sharing dropdown
                 ]);
                 setAllUsers(usersData.filter(u => u.id !== currentUser.id)); // Exclude self from sharing list

                 await fetchDocuments(docFilters, currentUser);
                 if (['admin', 'faculty', 'print_cell'].includes(currentUser.role)) {
                    await fetchPrintRequests(printFilters, currentUser.role);
                 }
            } catch (err) {
                console.error("Error fetching initial data:", err);
                setError("Failed to load document data. Please try again.");
                toast({ variant: "destructive", title: "Error", description: "Could not fetch documents." });
            } finally {
                setIsLoading(false);
            }
        };
        initialize();
    }, []); 

    React.useEffect(() => {
         if (user) { 
             fetchDocuments(docFilters, user);
         }
     }, [docFilters, user]);

     React.useEffect(() => {
         if (user && (['admin', 'faculty', 'print_cell'].includes(user.role))) {
             fetchPrintRequests(printFilters, user.role);
         }
     }, [printFilters, user]);

    const fetchDocuments = async (filters: DocumentFilters, user: AuthUser | null) => {
         try {
             const fetchedDocs = await getDocuments(filters, user);
             setDocuments(fetchedDocs);
         } catch (err) {
             console.error("Error fetching documents:", err);
             toast({ variant: "destructive", title: "Filter Error", description: "Could not apply filters." });
         }
     };

    const fetchPrintRequests = async (filters: Partial<Pick<PrintRequest, 'status'>>, role: UserRole) => {
         try {
             const fetchedRequests = await getPrintRequests(filters, role);
             setPrintRequests(fetchedRequests);
         } catch (err) {
             console.error("Error fetching print requests:", err);
              toast({ variant: "destructive", title: "Filter Error", description: "Could not fetch print requests." });
         }
    };

     const fetchAuditLogData = async (documentId: string) => {
        if (!user) return;
        setIsLoadingAudit(true);
        try {
            const logData = await getAuditLog(documentId, user.role);
            setAuditLog(logData);
        } catch (err) {
            console.error("Error fetching audit log:", err);
            toast({ variant: "destructive", title: "Error", description: `Could not fetch audit log for document ${documentId}.` });
            setAuditLog([]);
        } finally {
            setIsLoadingAudit(false);
        }
    };

    const handleDocFilterChange = (key: keyof DocumentFilters, value: string | boolean | undefined) => {
        setDocFilters(prev => ({ ...prev, [key]: value === 'all' || value === '' ? undefined : value }));
    };

    const handlePrintFilterChange = (key: keyof PrintRequest, value: string | undefined) => {
        setPrintFilters(prev => ({ ...prev, [key]: value === 'all' || value === '' ? undefined : value } as Partial<Pick<PrintRequest, 'status'>>));
    };

    const handleFileUpload = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!user) return;
        const formData = new FormData(event.currentTarget);
        const file = formData.get('documentFile') as File;
        const type = formData.get('documentType') as DocumentType;
        const description = formData.get('description') as string || undefined;
        const department = user.department || 'Unknown';

        const metadata: DocumentMetadata = {
            department: department,
            description: description,
            tags: (formData.get('tags') as string)?.split(',').map(t => t.trim()).filter(t => t) || undefined,
        };

        if (!file || file.size === 0) {
            toast({ variant: "destructive", title: "Error", description: "Please select a file to upload." });
            return;
        }
        if (!type) {
             toast({ variant: "destructive", title: "Error", description: "Please select a document type." });
             return;
        }
         if (file.size > 20 * 1024 * 1024) {
             toast({ variant: "destructive", title: "File Too Large", description: "Maximum upload size is 20MB." });
             return;
         }

        const usersToShare = selectedUsers.map(u => ({ id: u.id, name: u.name }));

        setIsUploading(true);
        try {
            const result = await uploadDocument(file, metadata, { id: user.id, name: user.name, role: user.role }, type, usersToShare);
            if ('error' in result) {
                 toast({ variant: "destructive", title: "Upload Failed", description: result.error });
            } else {
                toast({ title: "Success", description: `Document "${result.name}" uploaded successfully.` });
                setShowUploadDialog(false);
                setSelectedUsers([]); // Reset selected users after upload
                fetchDocuments(docFilters, user);
            }
        } catch (err) {
            console.error("Error uploading document:", err);
            toast({ variant: "destructive", title: "Error", description: "An unexpected error occurred during upload." });
        } finally {
            setIsUploading(false);
        }
    };

    const handleRequestPrintSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
         event.preventDefault();
         if (!user || !selectedDocForPrint) return;
         const formData = new FormData(event.currentTarget);
         const copies = parseInt(formData.get('copies') as string, 10);
         const paperSize = formData.get('paperSize') as string;
         const deadline = formData.get('deadline') as string || undefined;

         if (isNaN(copies) || copies <= 0) {
             toast({ variant: "destructive", title: "Invalid Input", description: "Please enter a valid number of copies." });
             return;
         }

         setIsRequestingPrint(true);
         try {
             const result = await requestPrint(selectedDocForPrint.id, copies, paperSize, { id: user.id, name: user.name }, deadline);
             if ('error' in result) {
                 toast({ variant: "destructive", title: "Request Failed", description: result.error });
             } else {
                  toast({ title: "Success", description: `Print request submitted for "${selectedDocForPrint.name}".` });
                  setShowPrintRequestDialog(false);
                  setSelectedDocForPrint(null);
                  fetchPrintRequests(printFilters, user.role); 
                  setDocuments(prevDocs => prevDocs.map(doc => doc.id === selectedDocForPrint.id ? { ...doc, status: 'Pending Approval' } : doc));
             }
         } catch (err) {
             console.error("Error requesting print:", err);
             toast({ variant: "destructive", title: "Error", description: "An unexpected error occurred." });
         } finally {
             setIsRequestingPrint(false);
         }
    };

    const handleActionPrint = async (requestId: string, action: 'Approve' | 'Reject') => {
         if (!user || user.role !== 'admin') return; 
         setIsActioningPrint(prev => ({ ...prev, [requestId]: true }));
         const comments = action === 'Reject' ? prompt("Enter reason for rejection (optional but recommended):") : undefined;
          if (action === 'Reject' && comments === null) {
               setIsActioningPrint(prev => ({ ...prev, [requestId]: false }));
               return;
           }

         try {
            const result = await actionPrintRequest(requestId, action, { id: user.id, name: user.name }, comments || undefined);
             if (result.success) {
                 toast({ title: "Success", description: result.message });
                 fetchPrintRequests(printFilters, user.role);
                  const updatedReq = printRequests.find(pr => pr.id === requestId);
                  if (updatedReq) {
                      const statusUpdate: DocumentStatus = action === 'Approve' ? 'Approved for Print' : 'Rejected';
                      setDocuments(prevDocs => prevDocs.map(doc => doc.id === updatedReq.documentId ? { ...doc, status: statusUpdate } : doc));
                  }

             } else {
                 toast({ variant: "destructive", title: "Action Failed", description: result.message });
             }
         } catch (err) {
             console.error(`Error ${action.toLowerCase()}ing print request:`, err);
             toast({ variant: "destructive", title: "Error", description: `Could not ${action.toLowerCase()} print request.` });
         } finally {
            setIsActioningPrint(prev => ({ ...prev, [requestId]: false }));
         }
    };

     const handleMarkPrinted = async (requestId: string) => {
         if (!user || user.role !== 'print_cell') return;
         setIsActioningPrint(prev => ({ ...prev, [requestId]: true }));
         try {
             const result = await markAsPrinted(requestId, { id: user.id, name: user.name });
             if (result.success) {
                 toast({ title: "Success", description: result.message });
                 fetchPrintRequests(printFilters, user.role); 
                  const updatedReq = printRequests.find(pr => pr.id === requestId);
                   if (updatedReq) {
                      setDocuments(prevDocs => prevDocs.map(doc => doc.id === updatedReq.documentId ? { ...doc, status: 'Printed' } : doc));
                  }
             } else {
                 toast({ variant: "destructive", title: "Action Failed", description: result.message });
             }
         } catch (err) {
              console.error("Error marking as printed:", err);
             toast({ variant: "destructive", title: "Error", description: "Could not mark as printed." });
         } finally {
            setIsActioningPrint(prev => ({ ...prev, [requestId]: false }));
         }
     };

    const handleArchiveToggle = async (doc: Document) => {
        if (!user || user.role !== 'admin') return; 

        const actionText = doc.isArchived ? "Unarchive" : "Archive";
        if (!confirm(`Are you sure you want to ${actionText.toLowerCase()} "${doc.name}"?`)) return;

        try {
            const result = await updateDocument(doc.id, { isArchived: !doc.isArchived }, { id: user.id, name: user.name, role: user.role });
            if (result.success) {
                 toast({ title: "Success", description: `Document ${actionText.toLowerCase()}d successfully.` });
                 fetchDocuments(docFilters, user);
            } else {
                 toast({ variant: "destructive", title: "Error", description: result.message });
            }
        } catch (err) {
             console.error(`Error ${actionText.toLowerCase()}ing document:`, err);
             toast({ variant: "destructive", title: "Error", description: `Could not ${actionText.toLowerCase()} document.` });
        }
    };

     // --- Render Functions ---

    const renderFilters = () => (
        <div className="flex flex-wrap items-center gap-2 pt-4 pb-4 border-b">
            <div className="relative flex-grow max-w-xs">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                    type="search"
                    placeholder="Search name, description..."
                    className="pl-8"
                    value={docFilters.searchQuery || ''}
                    onChange={(e) => handleDocFilterChange('searchQuery', e.target.value)}
                />
            </div>
             <Select value={docFilters.type} onValueChange={(value) => handleDocFilterChange('type', value as DocumentType)}>
                <SelectTrigger className="w-full sm:w-[180px]">
                    <Filter className="h-4 w-4 mr-1 text-muted-foreground inline-block"/>
                    <SelectValue placeholder="Filter by Type" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="Exam Paper">Exam Paper</SelectItem>
                    <SelectItem value="Notice">Notice</SelectItem>
                    <SelectItem value="Application Form">Application Form</SelectItem>
                    <SelectItem value="Circular">Circular</SelectItem>
                    <SelectItem value="Letter">Letter</SelectItem>
                    <SelectItem value="Schedule">Schedule</SelectItem>
                    <SelectItem value="Timetable">Timetable</SelectItem>
                    <SelectItem value="Syllabus">Syllabus</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
            </Select>
             <Select value={docFilters.status} onValueChange={(value) => handleDocFilterChange('status', value as DocumentStatus)}>
                <SelectTrigger className="w-full sm:w-[180px]">
                     <Filter className="h-4 w-4 mr-1 text-muted-foreground inline-block"/>
                    <SelectValue placeholder="Filter by Status" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="Uploaded">Uploaded</SelectItem>
                    <SelectItem value="Pending Approval">Pending Approval</SelectItem>
                    <SelectItem value="Approved for Print">Approved for Print</SelectItem>
                    <SelectItem value="Printing">Printing</SelectItem>
                    <SelectItem value="Printed">Printed</SelectItem>
                     <SelectItem value="Rejected">Rejected</SelectItem>
                </SelectContent>
            </Select>
             { user?.role === 'admin' &&
                <Button
                    variant={docFilters.isArchived ? "secondary" : "outline"}
                    onClick={() => handleDocFilterChange('isArchived', !docFilters.isArchived)}
                    title={docFilters.isArchived ? "Showing Archived" : "Show Archived"}
                >
                    <Archive className="mr-2 h-4 w-4"/> {docFilters.isArchived ? "Archived" : "Active"}
                </Button>
             }
            <Button variant="outline" onClick={() => setDocFilters({ isArchived: false })}>Clear Filters</Button>
        </div>
    );

    const renderDocumentTable = () => (
        <TooltipProvider>
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead className="w-[50px] px-2 text-center">Type</TableHead>
                        <TableHead>Name & Info</TableHead>
                        <TableHead className="hidden md:table-cell">Uploaded By</TableHead>
                        <TableHead className="hidden lg:table-cell">Date</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {isLoading && !documents.length ? (
                        <TableRow><TableCell colSpan={6} className="text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto my-4" /></TableCell></TableRow>
                    ) : documents.length > 0 ? (
                        documents.map((doc) => {
                            const statusStyle = getStatusBadgeVariant(doc.status);
                            const iconType = getFileIconType(doc.fileMimeType, doc.type);
                            const canRequestPrint = (user?.role === 'faculty' || user?.role === 'admin') && !doc.isArchived && !['Approved for Print', 'Printing', 'Archived'].includes(doc.status);
                            const canDownload = (user?.role === 'admin' || user?.id === doc.uploadedBy.id || doc.sharedWith.some(s => s.id === user?.id) || (user?.role === 'print_cell' && ['Approved for Print', 'Printing'].includes(doc.status)) || ['Notice', 'Circular'].includes(doc.type));
                            const canArchive = user?.role === 'admin';

                            return (
                                <TableRow key={doc.id}>
                                    <TableCell className="px-2 text-center">
                                         <Tooltip>
                                             <TooltipTrigger>{FileIconMap[iconType] || <FileQuestion />}</TooltipTrigger>
                                             <TooltipContent>{doc.type}</TooltipContent>
                                         </Tooltip>
                                    </TableCell>
                                    <TableCell className="font-medium align-top">
                                        <p className="block">{doc.name}</p>
                                        {doc.metadata.description && <p className="text-xs text-muted-foreground italic mt-1">"{doc.metadata.description}"</p>}
                                        <p className="text-xs text-muted-foreground mt-1">
                                            {formatBytes(doc.fileSize)} | v{doc.version} | {doc.metadata.department}
                                        </p>
                                        {doc.sharedWith.length > 0 && 
                                           <div className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                                               <Users className="h-3 w-3"/>
                                                Shared with: {doc.sharedWith.map(u => u.name).join(', ')}
                                           </div>
                                        }
                                    </TableCell>
                                    <TableCell className="hidden md:table-cell text-muted-foreground align-top">
                                        {doc.uploadedBy.name} <span className="text-xs block">({doc.uploadedBy.role})</span>
                                    </TableCell>
                                    <TableCell className="hidden lg:table-cell text-muted-foreground align-top">{format(new Date(doc.uploadDate), 'PP pp')}</TableCell>
                                    <TableCell className="align-top">
                                        <Badge variant={statusStyle.variant} className={cn("text-xs whitespace-nowrap", statusStyle.className)}>{doc.status}</Badge>
                                    </TableCell>
                                    <TableCell className="text-right space-x-0.5 align-top">
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                 <Dialog open={showAuditDialog && selectedDocForAudit?.id === doc.id} onOpenChange={open => {if (!open) setSelectedDocForAudit(null); setShowAuditDialog(open);}}>
                                                    <DialogTrigger asChild>
                                                        <Button variant="ghost" size="icon" onClick={() => {setSelectedDocForAudit(doc); fetchAuditLogData(doc.id);}}>
                                                            <History className="h-4 w-4" />
                                                        </Button>
                                                    </DialogTrigger>
                                                    <DialogContent className="max-w-2xl">
                                                        <DialogHeader>
                                                            <DialogTitle>Audit Log: {selectedDocForAudit?.name}</DialogTitle>
                                                            <DialogDescription>History of actions performed on this document.</DialogDescription>
                                                        </DialogHeader>
                                                        {isLoadingAudit ? <div className="flex justify-center p-4"><Loader2 className="h-6 w-6 animate-spin" /></div> :
                                                            <div className="max-h-[60vh] overflow-y-auto pr-4 mt-4 border-t pt-4">
                                                                {auditLog.length > 0 ? (
                                                                    <ul className="space-y-4">
                                                                        {auditLog.map((entry, index) => (
                                                                            <li key={index} className="text-sm border-b pb-2 last:border-b-0">
                                                                                <p><span className="font-semibold">{entry.action}</span> by <span className="text-primary">{entry.userName}</span></p>
                                                                                <p className="text-xs text-muted-foreground">{format(new Date(entry.timestamp), 'PPpp')}</p>
                                                                                {entry.details && <p className="text-xs text-muted-foreground mt-1">Details: {entry.details}</p>}
                                                                            </li>
                                                                        ))}
                                                                    </ul>
                                                                ) : <p className="text-muted-foreground text-center py-4">No audit log entries found.</p>}
                                                            </div>
                                                        }
                                                    </DialogContent>
                                                </Dialog>
                                            </TooltipTrigger>
                                            <TooltipContent>View Audit Log</TooltipContent>
                                        </Tooltip>

                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <Button variant="ghost" size="icon" asChild disabled={!canDownload}>
                                                    <a href={canDownload ? doc.fileUrl : undefined} download={doc.name} target="_blank" rel="noopener noreferrer" aria-disabled={!canDownload}>
                                                        <Download className="h-4 w-4" />
                                                    </a>
                                                </Button>
                                            </TooltipTrigger>
                                            <TooltipContent>{canDownload ? "Download" : "Download restricted"}</TooltipContent>
                                        </Tooltip>

                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <Dialog open={showPrintRequestDialog && selectedDocForPrint?.id === doc.id} onOpenChange={(open) => { if(!open) setSelectedDocForPrint(null); setShowPrintRequestDialog(open); }}>
                                                    <DialogTrigger asChild>
                                                        <Button variant="ghost" size="icon" disabled={!canRequestPrint} onClick={() => setSelectedDocForPrint(doc)}>
                                                            <Printer className="h-4 w-4" />
                                                        </Button>
                                                    </DialogTrigger>
                                                    <DialogContent>
                                                        <DialogHeader>
                                                            <DialogTitle>Request Print: {selectedDocForPrint?.name}</DialogTitle>
                                                            <DialogDescription>Specify print details for "{selectedDocForPrint?.type}"</DialogDescription>
                                                        </DialogHeader>
                                                        <form onSubmit={handleRequestPrintSubmit} className="space-y-4 pt-4">
                                                            <div><Label htmlFor="copies">Number of Copies</Label><Input id="copies" name="copies" type="number" required min="1" defaultValue="1" /></div>
                                                            <div><Label htmlFor="paperSize">Paper Size</Label>
                                                                <Select name="paperSize" defaultValue="A4">
                                                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                                                    <SelectContent><SelectItem value="A4">A4</SelectItem><SelectItem value="Letter">Letter</SelectItem></SelectContent>
                                                                </Select>
                                                            </div>
                                                            <div><Label htmlFor="deadline">Deadline (Optional)</Label><Input id="deadline" name="deadline" type="date" /></div>
                                                            <DialogFooter>
                                                                <Button type="button" variant="ghost" onClick={() => {setShowPrintRequestDialog(false); setSelectedDocForPrint(null);}}>Cancel</Button>
                                                                <Button type="submit" disabled={isRequestingPrint}>
                                                                    {isRequestingPrint ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : null} Submit Request
                                                                </Button>
                                                            </DialogFooter>
                                                        </form>
                                                    </DialogContent>
                                                </Dialog>
                                            </TooltipTrigger>
                                            <TooltipContent>{canRequestPrint ? "Request Print" : `Cannot request print (Status: ${doc.status})`}</TooltipContent>
                                        </Tooltip>

                                         <Tooltip>
                                            <TooltipTrigger asChild>
                                                <Button variant="ghost" size="icon" disabled={!canArchive} onClick={() => handleArchiveToggle(doc)}>
                                                    <Archive className={cn("h-4 w-4", doc.isArchived && 'text-accent')} />
                                                </Button>
                                            </TooltipTrigger>
                                             <TooltipContent>{canArchive ? (doc.isArchived ? "Unarchive" : "Archive") : "Archive restricted"}</TooltipContent>
                                        </Tooltip>
                                    </TableCell>
                                </TableRow>
                            )
                        })
                    ) : (
                        <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-6">No documents found matching filters.</TableCell></TableRow>
                    )}
                </TableBody>
            </Table>
        </TooltipProvider>
    );

     const renderPrintRequestTable = () => (
         <TooltipProvider>
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Document Name</TableHead>
                        <TableHead>Requested By</TableHead>
                        <TableHead className="hidden md:table-cell">Date</TableHead>
                        <TableHead>Details</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {isLoading && !printRequests.length ? (
                        <TableRow><TableCell colSpan={6} className="text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto my-4" /></TableCell></TableRow>
                    ): printRequests.length > 0 ? (
                        printRequests.map((req) => {
                            const statusStyle = getStatusBadgeVariant(req.status);
                            const isLoadingAction = isActioningPrint[req.id];
                            return (
                                <TableRow key={req.id}>
                                    <TableCell className="font-medium align-top">{req.documentName}</TableCell>
                                    <TableCell className="text-muted-foreground align-top">{req.requestedBy.name}</TableCell>
                                    <TableCell className="hidden md:table-cell text-muted-foreground align-top">{format(new Date(req.requestDate), 'PP p')}</TableCell>
                                    <TableCell className="text-xs text-muted-foreground align-top">
                                        Copies: {req.copies} <br/> Size: {req.paperSize}
                                        {req.deadline && <span className="block">Deadline: {format(new Date(req.deadline), 'PP')}</span>}
                                    </TableCell>
                                    <TableCell className="align-top">
                                        <Badge variant={statusStyle.variant} className={cn("text-xs whitespace-nowrap", statusStyle.className)}>{req.status}</Badge>
                                        {req.comments &&
                                            <Tooltip>
                                                <TooltipTrigger asChild><Info className="inline-block ml-1 h-3 w-3 text-muted-foreground cursor-help" /></TooltipTrigger>
                                                <TooltipContent side="top">{req.status === 'Rejected' ? 'Rejection Reason' : 'Comment'}: {req.comments}</TooltipContent>
                                            </Tooltip>
                                        }
                                    </TableCell>
                                    <TableCell className="text-right space-x-1 align-top">
                                        { user?.role === 'admin' && req.status === 'Pending' && (
                                            <>
                                                <Button size="sm" variant="outline" className="text-green-600 border-green-600 hover:bg-green-50" onClick={() => handleActionPrint(req.id, 'Approve')} disabled={isLoadingAction}>
                                                    {isLoadingAction ? <Loader2 className="h-4 w-4 animate-spin"/> : <Check className="h-4 w-4"/>}<span className="ml-1 hidden sm:inline">Approve</span>
                                                </Button>
                                                <Button size="sm" variant="outline" className="text-red-600 border-red-600 hover:bg-red-50" onClick={() => handleActionPrint(req.id, 'Reject')} disabled={isLoadingAction}>
                                                    {isLoadingAction ? <Loader2 className="h-4 w-4 animate-spin"/> : <X className="h-4 w-4"/>}<span className="ml-1 hidden sm:inline">Reject</span>
                                                </Button>
                                            </>
                                        )}
                                        { user?.role === 'print_cell' && (req.status === 'Approved' || req.status === 'Printing') && (
                                            <Button size="sm" variant="default" onClick={() => handleMarkPrinted(req.id)} disabled={isLoadingAction}>
                                                {isLoadingAction ? <Loader2 className="h-4 w-4 animate-spin"/> : <Printer className="h-4 w-4"/>}<span className="ml-1 hidden sm:inline">Mark Printed</span>
                                            </Button>
                                        )}
                                         <Tooltip>
                                            <TooltipTrigger asChild>
                                                <Button variant="ghost" size="sm" onClick={() => alert(`Viewing document: ${req.documentName}`)}>View</Button>
                                            </TooltipTrigger>
                                            <TooltipContent>View Document</TooltipContent>
                                         </Tooltip>
                                    </TableCell>
                                </TableRow>
                            )
                        })
                    ) : (
                        <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-6">No print requests found.</TableCell></TableRow>
                    )}
                </TableBody>
            </Table>
         </TooltipProvider>
     );

    const canUpload = user?.role === 'faculty' || user?.role === 'admin' || user?.role === 'hod';
    const canViewPrintRequests = user?.role === 'admin' || user?.role === 'faculty' || user?.role === 'print_cell';

    return (
        <div className="space-y-6">
             <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold text-primary flex items-center gap-2">
                    <FileText className="h-7 w-7" /> Document Workflow <span className="text-sm font-normal text-muted-foreground">({user?.role})</span>
                </h1>
                 { canUpload &&
                     <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
                         <DialogTrigger asChild>
                             <Button className="bg-accent hover:bg-accent/90 text-accent-foreground" onClick={() => setSelectedUsers([])}>
                                 <Upload className="mr-2 h-4 w-4" /> Upload Document
                             </Button>
                         </DialogTrigger>
                         <DialogContent className="max-w-lg">
                             <DialogHeader>
                                 <DialogTitle>Upload New Document</DialogTitle>
                                 <DialogDescription>Select file and provide details. Max 20MB.</DialogDescription>
                             </DialogHeader>
                             <form onSubmit={handleFileUpload} className="space-y-4 pt-4">
                                 <div><Label htmlFor="documentFile">File *</Label><Input id="documentFile" name="documentFile" type="file" required accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.png,.jpg,.jpeg,.zip" /></div>
                                 <div><Label htmlFor="documentType">Document Type *</Label>
                                    <Select name="documentType" required>
                                        <SelectTrigger><SelectValue placeholder="Select type..." /></SelectTrigger>
                                        <SelectContent>
                                             <SelectItem value="Exam Paper">Exam Paper</SelectItem>
                                             <SelectItem value="Notice">Notice</SelectItem>
                                             <SelectItem value="Application Form">Application Form</SelectItem>
                                             <SelectItem value="Circular">Circular</SelectItem>
                                             <SelectItem value="Letter">Letter</SelectItem>
                                             <SelectItem value="Schedule">Schedule</SelectItem>
                                             <SelectItem value="Timetable">Timetable</SelectItem>
                                             <SelectItem value="Syllabus">Syllabus</SelectItem>
                                             <SelectItem value="Other">Other</SelectItem>
                                        </SelectContent>
                                    </Select>
                                 </div>
                                 <div>
                                     <Label htmlFor="description">Description</Label>
                                     <Textarea id="description" name="description" placeholder="A brief description of the document's content..." />
                                 </div>
                                 
                                 <div>
                                     <Label>Share With (Optional)</Label>
                                      <Popover>
                                        <PopoverTrigger asChild>
                                          <Button variant="outline" className="w-full justify-start font-normal">
                                            <Users className="mr-2 h-4 w-4" />
                                            {selectedUsers.length > 0 ? `${selectedUsers.length} user(s) selected` : "Select users..."}
                                          </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                                          <Command>
                                            <CommandInput placeholder="Search users..." />
                                            <CommandList>
                                              <CommandEmpty>No users found.</CommandEmpty>
                                              <CommandGroup>
                                                {allUsers.map((u) => (
                                                  <CommandItem
                                                    key={u.id}
                                                    value={u.name}
                                                    onSelect={() => {
                                                      setSelectedUsers((prev) =>
                                                        prev.some(su => su.id === u.id)
                                                          ? prev.filter((item) => item.id !== u.id)
                                                          : [...prev, u]
                                                      );
                                                    }}
                                                  >
                                                    <CheckIcon
                                                      className={cn(
                                                        "mr-2 h-4 w-4",
                                                        selectedUsers.some(su => su.id === u.id) ? "opacity-100" : "opacity-0"
                                                      )}
                                                    />
                                                    <span>{u.name}</span>
                                                    <span className="ml-2 text-xs text-muted-foreground">({u.role} - {u.department})</span>
                                                  </CommandItem>
                                                ))}
                                              </CommandGroup>
                                            </CommandList>
                                          </Command>
                                        </PopoverContent>
                                      </Popover>
                                 </div>
                                 
                                  <div><Label htmlFor="tags">Tags (comma-separated)</Label><Input id="tags" name="tags" placeholder="e.g., urgent, safety, internal"/></div>

                                 <DialogFooter>
                                     <Button type="button" variant="ghost" onClick={() => setShowUploadDialog(false)}>Cancel</Button>
                                     <Button type="submit" disabled={isUploading}>
                                         {isUploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FileUp className="mr-2 h-4 w-4" />}
                                         Upload
                                     </Button>
                                 </DialogFooter>
                             </form>
                         </DialogContent>
                     </Dialog>
                 }
            </div>

             {error && (
                 <Alert variant="destructive">
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Error</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                 </Alert>
             )}

            <Tabs value={activeTab} onValueChange={setActiveTab} defaultValue="documents">
                 <TabsList className={cn(
                      "grid w-full grid-cols-1",
                      canViewPrintRequests ? "sm:grid-cols-2 sm:w-fit" : "sm:w-auto"
                      )}>
                    <TabsTrigger value="documents">
                         <FileText className="mr-1 h-4 w-4"/> Documents ({documents.length})
                    </TabsTrigger>
                     { canViewPrintRequests &&
                         <TabsTrigger value="printRequests">
                             <Printer className="mr-1 h-4 w-4"/> Print Requests ({printRequests.length})
                         </TabsTrigger>
                     }
                 </TabsList>

                 <TabsContent value="documents">
                     <Card>
                        <CardHeader>
                            <CardTitle>Document Library</CardTitle>
                            <CardDescription>Manage and access uploaded documents based on your role and permissions.</CardDescription>
                            {renderFilters()}
                        </CardHeader>
                        <CardContent className="px-0 sm:px-6">
                            {renderDocumentTable()}
                        </CardContent>
                     </Card>
                 </TabsContent>

                 {canViewPrintRequests &&
                     <TabsContent value="printRequests">
                         <Card>
                             <CardHeader>
                                <CardTitle>Print Requests</CardTitle>
                                <CardDescription>Track the status of document print requests.</CardDescription>
                                  <div className="flex flex-wrap gap-2 pt-4 pb-4 border-b">
                                      <Select value={printFilters.status} onValueChange={(value) => handlePrintFilterChange('status', value)}>
                                          <SelectTrigger className="w-full sm:w-[180px]">
                                              <Filter className="h-4 w-4 mr-1 text-muted-foreground inline-block"/>
                                              <SelectValue placeholder="Filter by Status" />
                                          </SelectTrigger>
                                          <SelectContent>
                                              <SelectItem value="all">All Statuses</SelectItem>
                                              <SelectItem value="Pending">Pending</SelectItem>
                                              <SelectItem value="Approved">Approved</SelectItem>
                                              <SelectItem value="Rejected">Rejected</SelectItem>
                                              <SelectItem value="Printed">Printed</SelectItem>
                                          </SelectContent>
                                      </Select>
                                      <Button variant="outline" onClick={() => setPrintFilters({})}>Clear Filters</Button>
                                  </div>
                             </CardHeader>
                             <CardContent className="px-0 sm:px-6">
                                 {renderPrintRequestTable()}
                             </CardContent>
                         </Card>
                     </TabsContent>
                 }
             </Tabs>

        </div>
    );
}

