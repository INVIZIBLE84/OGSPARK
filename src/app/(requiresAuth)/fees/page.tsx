
"use client";

import * as React from "react";
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DollarSign, CheckCircle, Clock, AlertTriangle, Download, PlusCircle, Edit, Loader2, Search, Filter, Upload, AlertCircle, QrCode } from "lucide-react";
import {
    getFeeDetails,
    getFeePayments,
    getAllFeeDetails, // For admin
    addFeePayment, // For admin
    importFeeDataFromFile, // New import function
    exportFeeDataToCSV, // New export function
    type FeeDetails,
    type FeePayment,
    type FeeBreakdownItem,
    type FeeFilters
} from "@/services/fee-management";
import { AuthUser, getCurrentUser, UserRole } from "@/types/user";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"; // For Add Payment Modal
import { Label } from "@/components/ui/label";
import { format } from 'date-fns';
import Image from "next/image";


const DEPARTMENTS = ['All', 'B. Voc', 'CSE', 'ENTC', 'IT', 'Mech. En', 'MBA'];


export default function FeesPage() {
  const { toast } = useToast();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [feeDetails, setFeeDetails] = useState<FeeDetails | null>(null);
  const [paymentHistory, setPaymentHistory] = useState<FeePayment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Admin/Account Section specific state
  const [allFeeDetails, setAllFeeDetails] = useState<FeeDetails[]>([]);
  const [isManagerView, setIsManagerView] = useState(false); // For Admin or Account Section
  const [filters, setFilters] = useState<FeeFilters>({});
  const [isAddingPayment, setIsAddingPayment] = useState(false);
  const [showAddPaymentDialog, setShowAddPaymentDialog] = React.useState(false); // Control dialog
  const [isImportingFees, setIsImportingFees] = React.useState(false);
  const [isExportingFees, setIsExportingFees] = React.useState(false);
  const [showUpiDialog, setShowUpiDialog] = React.useState(false);


  useEffect(() => {
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

      const managerRoles: UserRole[] = ['admin', 'account_section'];
      setIsManagerView(managerRoles.includes(currentUser.role));

      try {
        if (currentUser.role === 'student') {
          const details = await getFeeDetails(currentUser.id);
          const history = await getFeePayments(currentUser.id);
          setFeeDetails(details);
          setPaymentHistory(history);
        } else if (managerRoles.includes(currentUser.role)) {
          const allDetails = await getAllFeeDetails(filters);
          setAllFeeDetails(allDetails);
        }
      } catch (err) {
        console.error("Error fetching fee data:", err);
        setError("Failed to load fee information. Please try again.");
        toast({ variant: "destructive", title: "Error", description: "Could not fetch fee data." });
      } finally {
        setIsLoading(false);
      }
    };
    initialize();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once on mount

   // --- Manager: Handle Filter Changes ---
  const handleFilterChange = (key: keyof FeeFilters, value: string | undefined) => {
      setFilters(prev => ({ ...prev, [key]: value === 'All' ? undefined : value }));
  };

  // --- Manager: Fetch data based on filters ---
   useEffect(() => {
        if (isManagerView) {
            const fetchAdminData = async () => {
                setIsLoading(true);
                setError(null);
                try {
                    const allDetails = await getAllFeeDetails(filters);
                    setAllFeeDetails(allDetails);
                } catch (err) {
                    console.error("Error fetching filtered fee data:", err);
                    setError("Failed to load filtered fee information.");
                } finally {
                    setIsLoading(false);
                }
            };
            const timer = setTimeout(() => fetchAdminData(), 300);
             return () => clearTimeout(timer);
        }
    }, [filters, isManagerView]);


   // --- Manager: Handle Add Payment ---
   const handleAddPaymentSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!user || !['admin', 'account_section'].includes(user.role)) return;

        const formData = new FormData(event.currentTarget);
        const studentId = formData.get('studentId') as string;
        const amount = parseFloat(formData.get('amount') as string);
        const paymentDate = formData.get('paymentDate') as string;
        const method = formData.get('method') as string;
        const transactionId = formData.get('transactionId') as string || undefined;

        if (!studentId.trim()) {
            toast({ variant: "destructive", title: "Invalid Student ID", description: "Please enter a valid student ID." });
            return;
        }
        if (isNaN(amount) || amount <= 0) {
             toast({ variant: "destructive", title: "Invalid Amount", description: "Please enter a valid positive amount." });
             return;
        }
        if (!paymentDate) {
            toast({ variant: "destructive", title: "Invalid Date", description: "Please select a payment date." });
            return;
        }

        setIsAddingPayment(true);
        try {
            const result = await addFeePayment(studentId, { amount, paymentDate, method, transactionId }, user.id);
            if (result.success && result.payment) {
                toast({ title: "Success", description: result.message });
                 // Refresh data after adding payment
                const allDetails = await getAllFeeDetails(filters);
                setAllFeeDetails(allDetails);
                setShowAddPaymentDialog(false);
            } else {
                toast({ variant: "destructive", title: "Error", description: result.message });
            }
        } catch (err) {
             console.error("Error adding payment:", err);
             toast({ variant: "destructive", title: "Error", description: "Could not add payment." });
        } finally {
            setIsAddingPayment(false);
        }
   };

   // --- Loading / Error States ---
  if (isLoading && (!feeDetails && !isManagerView || isManagerView && !allFeeDetails.length)) {
    return <FeeSkeleton />;
  }

  if (error) {
    return (
      <div className="space-y-6">
        <h1 className="text-3xl font-bold text-primary">Fee Management</h1>
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

   // --- Get Status Style Helper ---
    const getStatusStyle = (status: FeeDetails['status']): { variant: "default" | "secondary" | "destructive" | "outline", className: string } => {
        switch (status) {
            case 'Paid': return { variant: 'default', className: 'bg-green-100 text-green-800 border-green-300' };
            case 'Unpaid': return { variant: 'destructive', className: 'bg-red-100 text-red-800 border-red-300' };
            case 'Partially Paid': return { variant: 'secondary', className: 'bg-yellow-100 text-yellow-800 border-yellow-300' };
            default: return { variant: 'outline', className: '' };
        }
    };

    const statusIcon = (status: FeeDetails['status']) => {
        switch(status) {
            case 'Paid': return <CheckCircle className="h-4 w-4 mr-1 text-green-600" />;
            case 'Unpaid': return <AlertTriangle className="h-4 w-4 mr-1 text-red-600" />;
            case 'Partially Paid': return <Clock className="h-4 w-4 mr-1 text-yellow-600" />;
            default: return null;
        }
    }

  // --- Render Student View ---
  const renderStudentView = () => {
    if (!feeDetails) {
        // This view is shown when no fee details are found, allowing for initial payment.
        return (
            <Card className="transform transition-transform duration-300 hover:shadow-lg">
                <CardHeader>
                    <CardTitle>Make a Fee Payment</CardTitle>
                    <CardDescription>No outstanding fee details found. You can make a payment here, and your record will be updated.</CardDescription>
                </CardHeader>
                <CardContent>
                    <p className="text-sm text-muted-foreground">
                        Click the button below to proceed with a UPI payment. After payment, your fee status and history will be updated accordingly.
                    </p>
                </CardContent>
                <CardFooter className="flex justify-end">
                    <Dialog open={showUpiDialog} onOpenChange={setShowUpiDialog}>
                        <DialogTrigger asChild>
                            <Button className="bg-accent hover:bg-accent/90 text-accent-foreground">
                                <QrCode className="mr-2 h-4 w-4" /> Pay with UPI
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-md">
                            <DialogHeader>
                                <DialogTitle>Scan to Pay</DialogTitle>
                                <DialogDescription>
                                    Use any UPI app to scan the QR code to make a payment. Enter the appropriate amount in your app.
                                </DialogDescription>
                            </DialogHeader>
                            <div className="flex items-center justify-center p-4 bg-white rounded-lg">
                                <Image
                                    src="https://placehold.co/250x250/png?text=Scan+Me"
                                    alt="UPI QR Code"
                                    data-ai-hint="QR code"
                                    width={250}
                                    height={250}
                                    className="rounded-md"
                                />
                            </div>
                            <DialogFooter className="sm:justify-center">
                                 <p className="text-xs text-muted-foreground">After payment, your records will be updated within 24 hours.</p>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </CardFooter>
            </Card>
        );
    }

    // This view is shown when fee details *are* found.
    const statusStyle = getStatusStyle(feeDetails.status);
    return (
        <>
            {/* Fee Status Summary */}
            <Card className="transform transition-transform duration-300 hover:shadow-lg">
                <CardHeader>
                <CardTitle className="flex items-center justify-between">
                   <span>Fee Status</span>
                   <Badge variant={statusStyle.variant} className={cn("text-sm", statusStyle.className)}>
                       {statusIcon(feeDetails.status)} {feeDetails.status}
                   </Badge>
                </CardTitle>
                <CardDescription>
                    Your current fee balance overview.
                    {feeDetails.dueDate && ` Due Date: ${format(new Date(feeDetails.dueDate), 'PPP')}`}
                </CardDescription>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
                     <SummaryBox label="Total Due" value={feeDetails.totalDue} />
                     <SummaryBox label="Total Paid" value={feeDetails.totalPaid} color="green" />
                     <SummaryBox label="Balance Due" value={feeDetails.balanceDue} color={feeDetails.balanceDue > 0 ? 'red' : 'green'} />
                </CardContent>
                <CardFooter className="flex justify-between items-center pt-4">
                    <p className="text-xs text-muted-foreground">Contact finance for payment queries.</p>
                     <Dialog open={showUpiDialog} onOpenChange={setShowUpiDialog}>
                        <DialogTrigger asChild>
                            <Button disabled={feeDetails.balanceDue <= 0} className="bg-accent hover:bg-accent/90 text-accent-foreground">
                                <QrCode className="mr-2 h-4 w-4" /> Pay with UPI
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="sm:max-w-md">
                            <DialogHeader>
                                <DialogTitle>Scan to Pay</DialogTitle>
                                <DialogDescription>
                                    Use any UPI app to scan the QR code and pay the outstanding balance of <span className="font-bold">₹{feeDetails.balanceDue.toFixed(2)}</span>.
                                </DialogDescription>
                            </DialogHeader>
                            <div className="flex items-center justify-center p-4 bg-white rounded-lg">
                                <Image
                                    src="https://placehold.co/250x250/png?text=Scan+Me"
                                    alt="UPI QR Code"
                                    data-ai-hint="QR code"
                                    width={250}
                                    height={250}
                                    className="rounded-md"
                                />
                            </div>
                            <DialogFooter className="sm:justify-center">
                                 <p className="text-xs text-muted-foreground">After payment, your records will be updated within 24 hours.</p>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </CardFooter>
            </Card>

            {/* Payment History */}
            <Card className="transform transition-transform duration-300 hover:shadow-lg">
                <CardHeader>
                <CardTitle>Payment History</CardTitle>
                <CardDescription>List of your past fee payments.</CardDescription>
                </CardHeader>
                <CardContent>
                <Table>
                    <TableHeader>
                    <TableRow>
                        <TableHead>Payment Date</TableHead>
                        <TableHead>Amount Paid</TableHead>
                        <TableHead className="hidden sm:table-cell">Method</TableHead>
                        <TableHead className="hidden md:table-cell text-right">Receipt/Transaction ID</TableHead>
                    </TableRow>
                    </TableHeader>
                    <TableBody>
                    {paymentHistory.length > 0 ? (
                        paymentHistory.map((payment) => (
                        <TableRow key={payment.id}>
                            <TableCell>{format(new Date(payment.paymentDate), 'PPP')}</TableCell>
                            <TableCell className="font-medium">₹{payment.amount.toFixed(2)}</TableCell>
                            <TableCell className="hidden sm:table-cell text-muted-foreground">{payment.method || 'N/A'}</TableCell>
                            <TableCell className="hidden md:table-cell text-muted-foreground text-right">{payment.transactionId || 'N/A'}</TableCell>
                        </TableRow>
                        ))
                    ) : (
                        <TableRow>
                        <TableCell colSpan={4} className="text-center text-muted-foreground">
                            No payment history found.
                        </TableCell>
                        </TableRow>
                    )}
                    {feeDetails.totalPaid > 0 && (
                        <TableRow className="border-t border-dashed">
                            <TableCell colSpan={3} className="font-semibold">Total Paid</TableCell>
                            <TableCell className="text-right font-bold">₹{feeDetails.totalPaid.toFixed(2)}</TableCell>
                        </TableRow>
                    )}
                    </TableBody>
                </Table>
                </CardContent>
            </Card>
        </>
    );
  };

  // --- Render Manager (Admin/Account) View ---
  const renderManagerView = () => (
     <Card className="transform transition-transform duration-300 hover:shadow-lg">
        <CardHeader>
            <div className="flex justify-between items-start">
                <div>
                    <CardTitle>Fee Management Dashboard</CardTitle>
                    <CardDescription>View and manage student fee records.</CardDescription>
                </div>
                <Dialog open={showAddPaymentDialog} onOpenChange={setShowAddPaymentDialog}>
                    <DialogTrigger asChild>
                        <Button className="bg-accent hover:bg-accent/90 text-accent-foreground">
                            <PlusCircle className="mr-2 h-4 w-4" /> Record Payment
                        </Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Record Manual Payment</DialogTitle>
                            <DialogDescription>Record a new fee payment (e.g., for cash) for a student.</DialogDescription>
                        </DialogHeader>
                        <form onSubmit={handleAddPaymentSubmit} className="space-y-4">
                            <div>
                                <Label htmlFor="studentId">Student ID *</Label>
                                <Input id="studentId" name="studentId" type="text" placeholder="e.g., S12345" required />
                            </div>
                           <div>
                                <Label htmlFor="amount">Amount *</Label>
                                <Input id="amount" name="amount" type="number" step="0.01" required />
                           </div>
                           <div>
                                <Label htmlFor="paymentDate">Payment Date *</Label>
                                <Input id="paymentDate" name="paymentDate" type="date" required defaultValue={format(new Date(), 'yyyy-MM-dd')}/>
                           </div>
                            <div>
                               <Label htmlFor="method">Payment Method *</Label>
                               <Select name="method" defaultValue="Cash" required>
                                    <SelectTrigger id="method">
                                        <SelectValue placeholder="Select method" />
                                    </SelectTrigger>
                                    <SelectContent>
                                       <SelectItem value="Cash">Cash</SelectItem>
                                       <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                                       <SelectItem value="Other">Other</SelectItem>
                                    </SelectContent>
                               </Select>
                           </div>
                            <div>
                                <Label htmlFor="transactionId">Receipt No. / Transaction ID (Optional)</Label>
                                <Input id="transactionId" name="transactionId" type="text" placeholder="e.g., CASH-12345"/>
                            </div>
                            <DialogFooter>
                                <Button type="button" variant="ghost" onClick={() => setShowAddPaymentDialog(false)}>Cancel</Button>
                                <Button type="submit" disabled={isAddingPayment}>
                                    {isAddingPayment ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                    Add Payment
                                </Button>
                            </DialogFooter>
                        </form>
                    </DialogContent>
                </Dialog>
            </div>
             <div className="flex flex-wrap items-center gap-2 pt-4">
                 <div className="relative flex-grow max-w-xs">
                     <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                         type="search"
                         placeholder="Search Student ID/Name..."
                         className="pl-8"
                         value={filters.searchQuery || ''}
                         onChange={(e) => handleFilterChange('searchQuery', e.target.value)}
                     />
                 </div>
                 <Select value={filters.status} onValueChange={(value) => handleFilterChange('status', value === 'all' ? undefined : value as FeeDetails['status'])}>
                     <SelectTrigger className="w-full sm:w-[180px]">
                         <Filter className="h-4 w-4 mr-1 text-muted-foreground inline-block"/>
                         <SelectValue placeholder="Filter by Status" />
                     </SelectTrigger>
                     <SelectContent>
                         <SelectItem value="all">All Statuses</SelectItem>
                         <SelectItem value="Paid">Paid</SelectItem>
                         <SelectItem value="Unpaid">Unpaid</SelectItem>
                         <SelectItem value="Partially Paid">Partially Paid</SelectItem>
                     </SelectContent>
                 </Select>
                 <Select value={filters.department} onValueChange={(value) => handleFilterChange('department', value)}>
                     <SelectTrigger className="w-full sm:w-[180px]">
                         <Filter className="h-4 w-4 mr-1 text-muted-foreground inline-block"/>
                         <SelectValue placeholder="Filter by Department" />
                     </SelectTrigger>
                     <SelectContent>
                         {DEPARTMENTS.map(dept => (
                            <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                         ))}
                     </SelectContent>
                 </Select>
                 <Button variant="outline" onClick={() => setFilters({})}>Clear Filters</Button>
             </div>
        </CardHeader>
        <CardContent>
           {isLoading ? <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto my-10"/> :
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Student ID</TableHead>
                         <TableHead>Name</TableHead>
                         <TableHead>Department</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Balance Due</TableHead>
                        <TableHead className="hidden md:table-cell text-right">Total Paid</TableHead>
                        <TableHead className="hidden lg:table-cell text-right">Total Due</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {allFeeDetails.length > 0 ? (
                        allFeeDetails.map((fd) => {
                           const statusStyle = getStatusStyle(fd.status);
                           return (
                             <TableRow key={fd.studentId}>
                                <TableCell className="font-medium">{fd.studentId}</TableCell>
                                <TableCell>{fd.studentName || 'N/A'}</TableCell>
                                <TableCell>{fd.department || 'N/A'}</TableCell>
                                <TableCell>
                                     <Badge variant={statusStyle.variant} className={cn("text-xs", statusStyle.className)}>
                                       {statusIcon(fd.status)} {fd.status}
                                     </Badge>
                                </TableCell>
                                <TableCell className={`text-right font-semibold ${fd.balanceDue > 0 ? 'text-red-600' : 'text-green-600'}`}>
                                    ₹{fd.balanceDue.toFixed(2)}
                                </TableCell>
                                <TableCell className="hidden md:table-cell text-right text-muted-foreground">₹{fd.totalPaid.toFixed(2)}</TableCell>
                                <TableCell className="hidden lg:table-cell text-right text-muted-foreground">₹{fd.totalDue.toFixed(2)}</TableCell>
                             </TableRow>
                           );
                       })
                    ) : (
                        <TableRow>
                            <TableCell colSpan={7} className="text-center text-muted-foreground">
                                No fee records found matching filters.
                            </TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>
           }
        </CardContent>
     </Card>
  );

  // --- Main Return ---
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-primary flex items-center gap-2">
        <DollarSign className="h-7 w-7" /> Fee Tracker
        <span className="text-sm font-normal text-muted-foreground">({user?.role})</span>
      </h1>

      {isManagerView ? renderManagerView() : renderStudentView()}

       {!isManagerView && user?.role !== 'student' && (
           <Alert>
             <AlertCircle className="h-4 w-4" />
             <AlertTitle>Information</AlertTitle>
             <AlertDescription>Fee details are available for Students and the Account Section.</AlertDescription>
           </Alert>
       )}

    </div>
  );
}


// --- Helper Components ---

interface SummaryBoxProps {
    label: string;
    value: number;
    color?: 'green' | 'red';
}

function SummaryBox({ label, value, color }: SummaryBoxProps) {
    const colorClass = color === 'green' ? 'bg-green-500/10 text-green-600'
                     : color === 'red' ? 'bg-red-500/10 text-red-600'
                     : 'bg-secondary/10 text-secondary-foreground';
     const valueColor = color === 'green' ? 'text-green-600'
                       : color === 'red' ? 'text-red-600'
                       : 'text-foreground';

    return (
        <div className={`flex flex-col items-center p-4 rounded-lg ${colorClass}`}>
            <span className={`text-2xl font-bold ${valueColor}`}>₹{value.toFixed(2)}</span>
            <span className="text-sm text-muted-foreground">{label}</span>
        </div>
    );
}

function FeeSkeleton() {
    return (
         <div className="space-y-6 animate-pulse">
            <div className="h-8 bg-muted rounded w-1/3"></div>
            <Card>
                 <CardHeader><div className="h-6 bg-muted rounded w-1/4"></div></CardHeader>
                 <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="h-20 bg-muted rounded-lg"></div>
                    <div className="h-20 bg-muted rounded-lg"></div>
                    <div className="h-20 bg-muted rounded-lg"></div>
                 </CardContent>
                 <CardFooter><div className="h-10 bg-muted rounded w-24 ml-auto"></div></CardFooter>
            </Card>
            <Card>
                 <CardHeader><div className="h-6 bg-muted rounded w-1/3"></div></CardHeader>
                 <CardContent>
                     <div className="h-4 bg-muted rounded w-full mb-2"></div>
                     <div className="h-4 bg-muted rounded w-5/6 mb-2"></div>
                 </CardContent>
            </Card>
         </div>
    );
}
