
"use client";

import * as React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { DatabaseZap, Download, RotateCcw, UploadCloud, Server, Cloud, Clock, CheckCircle, AlertTriangle, Loader2, Save } from "lucide-react"; // Added Save
import { useToast } from "@/hooks/use-toast";
import { getBackupHistory, createBackup, restoreFromBackup, getBackupSettings, updateBackupSettings, type BackupEntry, type BackupSettings, type BackupTarget } from "@/services/admin"; // Import backup service functions
import { format } from "date-fns";
import { formatBytes } from "@/services/documents"; // Assuming formatBytes is available here
import { Skeleton } from "@/components/ui/skeleton";

export default function AdminBackupsPage() {
    const { toast } = useToast();
    const [backupHistory, setBackupHistory] = React.useState<BackupEntry[]>([]);
    const [settings, setSettings] = React.useState<BackupSettings | null>(null);
    const [isLoadingHistory, setIsLoadingHistory] = React.useState(true);
    const [isLoadingSettings, setIsLoadingSettings] = React.useState(true);
    const [isActionLoading, setIsActionLoading] = React.useState<Record<string, boolean>>({}); // Loading state per action type

    // Fetch initial data
    React.useEffect(() => {
        const fetchData = async () => {
            setIsLoadingHistory(true);
            setIsLoadingSettings(true);
            try {
                const [historyData, settingsData] = await Promise.all([
                    getBackupHistory(),
                    getBackupSettings()
                ]);
                setBackupHistory(historyData);
                setSettings(settingsData);
            } catch (error) {
                 console.error("Error fetching backup data:", error);
                 toast({ variant: "destructive", title: "Error", description: "Could not fetch backup history or settings." });
            } finally {
                setIsLoadingHistory(false);
                setIsLoadingSettings(false);
            }
        };
        fetchData();
    }, [toast]);

    const handleCreateBackup = async () => {
         setIsActionLoading(prev => ({ ...prev, create: true }));
         try {
            const result = await createBackup();
            if (result.success && result.backup) {
                toast({ title: "Success", description: result.message });
                setBackupHistory(prev => [result.backup!, ...prev]); // Add new backup to the top
            } else {
                 toast({ variant: "destructive", title: "Backup Failed", description: result.message });
            }
        } catch (error: any) {
             console.error("Error creating backup:", error);
            toast({ variant: "destructive", title: "Backup Error", description: error.message || "Could not initiate backup." });
        } finally {
             setIsActionLoading(prev => ({ ...prev, create: false }));
        }
    };

    const handleRestore = async (backupId: string) => {
        if (!confirm(`Are you sure you want to restore the system from backup ${backupId}? This will overwrite current data.`)) return;
        setIsActionLoading(prev => ({ ...prev, [`restore-${backupId}`]: true }));
        try {
            const result = await restoreFromBackup(backupId);
            if (result.success) {
                 toast({ title: "Restore Initiated", description: result.message });
                 // Optionally update backup status or disable further actions?
            } else {
                 toast({ variant: "destructive", title: "Restore Failed", description: result.message });
            }
        } catch (error: any) {
             console.error("Error restoring backup:", error);
            toast({ variant: "destructive", title: "Restore Error", description: error.message || "Could not initiate restore." });
        } finally {
            setIsActionLoading(prev => ({ ...prev, [`restore-${backupId}`]: false }));
        }
    };

    const handleSettingsChange = (key: keyof BackupSettings, value: any) => {
        if (!settings) return;
         setSettings(prev => prev ? { ...prev, [key]: value } : null);
         // Consider adding a 'dirty' flag for save button state
    };

    const handleSaveSettings = async () => {
        if (!settings) return;
        setIsActionLoading(prev => ({ ...prev, saveSettings: true }));
        try {
             const result = await updateBackupSettings(settings);
             if (result.success) {
                 toast({ title: "Success", description: "Backup settings saved." });
                 // Optionally refetch settings if backend modifies them
             } else {
                 toast({ variant: "destructive", title: "Save Failed", description: result.message });
             }
         } catch (error: any) {
             console.error("Error saving backup settings:", error);
             toast({ variant: "destructive", title: "Save Error", description: error.message || "Could not save settings." });
         } finally {
             setIsActionLoading(prev => ({ ...prev, saveSettings: false }));
         }
     };

    const getStatusIcon = (status: BackupEntry['status']) => {
        switch (status) {
            case 'Completed': return <CheckCircle className="text-green-500" />;
            case 'Failed': return <AlertTriangle className="text-red-500" />;
            case 'In Progress': return <Loader2 className="text-blue-500 animate-spin" />;
            default: return <Clock className="text-muted-foreground" />;
        }
    };

    return (
        <div className="space-y-6">
             <div className="flex items-center justify-between">
                 <h1 className="text-3xl font-bold text-primary flex items-center gap-2"><DatabaseZap /> Backup & Recovery</h1>
                 <Button onClick={handleCreateBackup} disabled={isActionLoading['create']} className="bg-accent hover:bg-accent/90 text-accent-foreground">
                    {isActionLoading['create'] ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UploadCloud className="mr-2 h-4 w-4" />}
                    Create Manual Backup
                 </Button>
             </div>

             {/* Backup Settings Card */}
             <Card>
                 <CardHeader>
                     <CardTitle>Backup Settings</CardTitle>
                     <CardDescription>Configure automatic backup schedule and target location.</CardDescription>
                 </CardHeader>
                 <CardContent className="space-y-4">
                    {isLoadingSettings || !settings ? (
                        <div className="space-y-4 animate-pulse">
                             <div className="flex items-center justify-between"> <Skeleton className="h-5 w-24 rounded" /> <Skeleton className="h-8 w-32 rounded" /> </div>
                             <div className="flex items-center justify-between"> <Skeleton className="h-5 w-20 rounded" /> <Skeleton className="h-8 w-32 rounded" /> </div>
                             <Skeleton className="h-10 w-24 rounded ml-auto" />
                        </div>
                    ) : (
                        <>
                             <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
                                 <div>
                                    <Label htmlFor="backup-frequency">Automatic Backup Frequency</Label>
                                    <Select
                                         value={settings.frequency}
                                         onValueChange={(value) => handleSettingsChange('frequency', value)}
                                    >
                                        <SelectTrigger id="backup-frequency">
                                            <SelectValue placeholder="Select frequency" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="daily">Daily</SelectItem>
                                            <SelectItem value="weekly">Weekly</SelectItem>
                                            <SelectItem value="monthly">Monthly</SelectItem>
                                            <SelectItem value="disabled">Disabled</SelectItem>
                                        </SelectContent>
                                    </Select>
                                 </div>
                                  <div>
                                    <Label htmlFor="backup-target">Backup Target</Label>
                                     <Select
                                         value={settings.target}
                                         onValueChange={(value) => handleSettingsChange('target', value as BackupTarget)}
                                     >
                                        <SelectTrigger id="backup-target">
                                            <SelectValue placeholder="Select target" />
                                        </SelectTrigger>
                                        <SelectContent>
                                             <SelectItem value="cloud"><Cloud className="inline-block mr-2 h-4 w-4"/> Cloud Storage</SelectItem>
                                             <SelectItem value="local"><Server className="inline-block mr-2 h-4 w-4"/> Local Server</SelectItem>
                                             {/* Add more options if available */}
                                        </SelectContent>
                                    </Select>
                                 </div>
                             </div>
                             {/* Add retention policy settings if applicable */}
                             <div className="flex justify-end">
                                <Button onClick={handleSaveSettings} disabled={isActionLoading['saveSettings']}>
                                     {isActionLoading['saveSettings'] ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                                     Save Settings
                                 </Button>
                             </div>
                         </>
                    )}
                 </CardContent>
             </Card>

             {/* Backup History Card */}
             <Card>
                 <CardHeader>
                     <CardTitle>Backup History</CardTitle>
                     <CardDescription>List of recent backup activities.</CardDescription>
                 </CardHeader>
                 <CardContent>
                     <Table>
                         <TableHeader>
                             <TableRow>
                                <TableHead>Timestamp</TableHead>
                                <TableHead>Type</TableHead>
                                <TableHead>Target</TableHead>
                                <TableHead className="hidden md:table-cell">Size</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                             </TableRow>
                         </TableHeader>
                         <TableBody>
                             {isLoadingHistory ? (
                                // Skeleton Rows
                                Array.from({ length: 5 }).map((_, i) => (
                                    <TableRow key={i}>
                                         <TableCell><Skeleton className="h-4 w-36 rounded" /></TableCell>
                                         <TableCell><Skeleton className="h-4 w-16 rounded" /></TableCell>
                                         <TableCell><Skeleton className="h-4 w-20 rounded" /></TableCell>
                                         <TableCell className="hidden md:table-cell"><Skeleton className="h-4 w-12 rounded" /></TableCell>
                                         <TableCell><Skeleton className="h-6 w-24 rounded-full" /></TableCell>
                                         <TableCell className="text-right flex justify-end gap-1">
                                             <Skeleton className="h-8 w-8 rounded" />
                                             <Skeleton className="h-8 w-8 rounded" />
                                          </TableCell>
                                    </TableRow>
                                ))
                             ) : backupHistory.length > 0 ? (
                                 backupHistory.map((backup) => (
                                     <TableRow key={backup.id}>
                                         <TableCell className="text-xs text-muted-foreground">{format(new Date(backup.timestamp), 'PPpp')}</TableCell>
                                         <TableCell className="capitalize">{backup.type}</TableCell>
                                         <TableCell className="capitalize flex items-center gap-1">
                                             {backup.target === 'cloud' ? <Cloud className="h-4 w-4"/> : <Server className="h-4 w-4"/>} {backup.target}
                                         </TableCell>
                                         <TableCell className="hidden md:table-cell text-sm">{backup.size ? formatBytes(backup.size) : 'N/A'}</TableCell>
                                         <TableCell className="flex items-center gap-1">
                                             {getStatusIcon(backup.status)}
                                             <span className="text-sm">{backup.status}</span>
                                         </TableCell>
                                         <TableCell className="text-right space-x-1">
                                             <Button
                                                 variant="outline"
                                                 size="sm"
                                                 onClick={() => handleRestore(backup.id)}
                                                 disabled={backup.status !== 'Completed' || isActionLoading[`restore-${backup.id}`]}
                                                 title="Restore from this backup"
                                             >
                                                {isActionLoading[`restore-${backup.id}`] ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCcw className="h-4 w-4" />}
                                                 <span className="ml-1 hidden sm:inline">Restore</span>
                                             </Button>
                                              {/* Optionally add Download button if files are downloadable */}
                                              {backup.status === 'Completed' && backup.downloadUrl && (
                                                   <Button variant="ghost" size="icon" asChild title="Download Backup">
                                                        <a href={backup.downloadUrl} target="_blank" rel="noopener noreferrer">
                                                            <Download className="h-4 w-4" />
                                                        </a>
                                                   </Button>
                                              )}
                                             {/* TODO: Add Delete Backup button? */}
                                         </TableCell>
                                     </TableRow>
                                 ))
                             ) : (
                                 <TableRow>
                                     <TableCell colSpan={6} className="text-center text-muted-foreground py-10">
                                         No backup history found.
                                     </TableCell>
                                 </TableRow>
                             )}
                         </TableBody>
                     </Table>
                      {/* TODO: Add Pagination for history */}
                 </CardContent>
             </Card>
        </div>
    );
}


