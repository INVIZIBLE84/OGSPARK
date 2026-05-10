
"use client";

import * as React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { PlusCircle, ShieldCheck, Edit, Trash2, Loader2, Save, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { getRoles, addRole, updateRolePermissions, deleteRole, type Role, type Permission } from "@/services/admin"; // Import role service functions
import { Skeleton } from "@/components/ui/skeleton";

// Define available permissions (this should ideally come from a config or backend)
const ALL_PERMISSIONS: Permission[] = [
    // Attendance Module
    { id: 'attendance:mark', description: 'Mark Own Attendance' },
    { id: 'attendance:view:own', description: 'View Own Attendance' },
    { id: 'attendance:view:class', description: 'View Class Attendance (Faculty)' },
    { id: 'attendance:manage:all', description: 'Manage All Attendance (Admin)' },
    { id: 'attendance:override', description: 'Manually Override Attendance (Admin)' },
    { id: 'attendance:export', description: 'Export Attendance Reports' },

    // Fees Module
    { id: 'fees:view:own', description: 'View Own Fee Status' },
    { id: 'fees:manage:all', description: 'Manage All Fee Records (Admin)' },
    { id: 'fees:add:payment', description: 'Add Fee Payments (Admin)' },

    // Documents Module
    { id: 'documents:upload', description: 'Upload Documents (Faculty/Admin)' },
    { id: 'documents:view:general', description: 'View General Documents (Notices, etc.)' },
    { id: 'documents:view:all', description: 'View All Documents (Admin)' },
    { id: 'documents:manage', description: 'Manage Documents (Archive, Edit - Admin)' },
    { id: 'documents:request:print', description: 'Request Document Print (Faculty/Admin)' },
    { id: 'documents:approve:print', description: 'Approve Print Requests (Admin)' },
    { id: 'documents:mark:printed', description: 'Mark Request as Printed (Print Cell)' },
    { id: 'documents:view:audit', description: 'View Document Audit Log (Admin/Faculty)' },

     // Admin Module (Specific Features)
    { id: 'admin:manage:users', description: 'Manage Users (Admin)' },
    { id: 'admin:manage:roles', description: 'Manage Roles & Permissions (Admin)' },
    { id: 'admin:manage:modules', description: 'Configure Modules (Admin)' },
    { id: 'admin:view:logs', description: 'View System Audit Logs (Admin)' },
    { id: 'admin:manage:backups', description: 'Manage Backups (Admin)' },
    { id: 'admin:manage:broadcasts', description: 'Send Broadcasts (Admin)' },
];


export default function AdminRolesPage() {
    const { toast } = useToast();
    const [roles, setRoles] = React.useState<Role[]>([]);
    const [isLoading, setIsLoading] = React.useState(true);
    const [showRoleDialog, setShowRoleDialog] = React.useState(false);
    const [editingRole, setEditingRole] = React.useState<Role | null>(null);
    const [newRoleName, setNewRoleName] = React.useState("");
    const [selectedPermissions, setSelectedPermissions] = React.useState<Set<string>>(new Set());
    const [isSubmitting, setIsSubmitting] = React.useState(false);

    // Fetch roles on mount
    React.useEffect(() => {
        const fetchRolesData = async () => {
            setIsLoading(true);
            try {
                const fetchedRoles = await getRoles();
                setRoles(fetchedRoles);
            } catch (error) {
                console.error("Error fetching roles:", error);
                toast({ variant: "destructive", title: "Error", description: "Could not fetch roles." });
            } finally {
                setIsLoading(false);
            }
        };
        fetchRolesData();
    }, [toast]);

    const handleEditRole = (role: Role) => {
        setEditingRole(role);
        setNewRoleName(role.name); // Pre-fill name for editing (though name edit might be disallowed)
        setSelectedPermissions(new Set(role.permissions));
        setShowRoleDialog(true);
    };

    const handleAddNewRole = () => {
        setEditingRole(null);
        setNewRoleName("");
        setSelectedPermissions(new Set());
        setShowRoleDialog(true);
    };

     const handlePermissionChange = (permissionId: string, checked: boolean) => {
        setSelectedPermissions(prev => {
            const newSet = new Set(prev);
            if (checked) {
                newSet.add(permissionId);
            } else {
                newSet.delete(permissionId);
            }
            return newSet;
        });
    };

     const handleSaveRole = async () => {
        setIsSubmitting(true);
        const permissionsArray = Array.from(selectedPermissions);

        try {
            let result;
            if (editingRole) {
                // Editing existing role permissions (Assume name is not editable for simplicity)
                 if (['admin', 'student', 'faculty'].includes(editingRole.id)) {
                    // Optional: Prevent editing core role permissions through UI? Or allow?
                     console.warn(`Attempting to modify permissions for core role: ${editingRole.id}`);
                 }
                result = await updateRolePermissions(editingRole.id, permissionsArray);
            } else {
                // Adding new role
                if (!newRoleName.trim()) {
                    toast({ variant: "destructive", title: "Error", description: "Role name cannot be empty." });
                    setIsSubmitting(false);
                    return;
                }
                // Generate an ID (e.g., lowercase name, replace spaces) - backend should handle this robustly
                const newRoleId = newRoleName.trim().toLowerCase().replace(/\s+/g, '_');
                 if (roles.some(r => r.id === newRoleId)) {
                     toast({ variant: "destructive", title: "Error", description: "A role with this ID already exists." });
                     setIsSubmitting(false);
                     return;
                 }
                result = await addRole({ id: newRoleId, name: newRoleName.trim(), permissions: permissionsArray });
            }

            if (result.success) {
                toast({ title: "Success", description: result.message });
                setShowRoleDialog(false);
                // Refresh roles list
                const fetchedRoles = await getRoles();
                setRoles(fetchedRoles);
            } else {
                toast({ variant: "destructive", title: "Error", description: result.message });
            }
        } catch (error: any) {
             console.error("Error saving role:", error);
             toast({ variant: "destructive", title: "Operation Failed", description: error.message || "Could not save role." });
        } finally {
            setIsSubmitting(false);
        }
    };

     const handleDeleteRole = async (roleId: string, roleName: string) => {
        if (['admin', 'student', 'faculty'].includes(roleId)) {
             toast({ variant: "destructive", title: "Action Denied", description: `Cannot delete core system role: ${roleName}.` });
             return;
        }
        if (!confirm(`Are you sure you want to delete the role "${roleName}"? This cannot be undone.`)) return;

        setIsSubmitting(true); // Use isSubmitting or a dedicated loading state
        try {
             const result = await deleteRole(roleId);
             if (result.success) {
                 toast({ title: "Success", description: result.message });
                 // Refresh roles list
                 const fetchedRoles = await getRoles();
                 setRoles(fetchedRoles);
             } else {
                 toast({ variant: "destructive", title: "Error", description: result.message });
             }
         } catch (error: any) {
              console.error("Error deleting role:", error);
             toast({ variant: "destructive", title: "Delete Failed", description: error.message || "Could not delete role." });
         } finally {
            setIsSubmitting(false);
         }
     };


    // Group permissions by module/feature for better UI
    const groupedPermissions = ALL_PERMISSIONS.reduce((acc, perm) => {
        const group = perm.id.split(':')[0]; // e.g., 'attendance', 'fees'
        if (!acc[group]) {
            acc[group] = [];
        }
        acc[group].push(perm);
        return acc;
    }, {} as Record<string, Permission[]>);


    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold text-primary flex items-center gap-2"><ShieldCheck /> Roles & Permissions</h1>
                 <Dialog open={showRoleDialog} onOpenChange={setShowRoleDialog}>
                     <DialogTrigger asChild>
                         <Button className="bg-accent hover:bg-accent/90 text-accent-foreground" onClick={handleAddNewRole}>
                            <PlusCircle className="mr-2 h-4 w-4" /> Add Role
                         </Button>
                     </DialogTrigger>
                     <DialogContent className="max-w-3xl">
                          <DialogHeader>
                            <DialogTitle>{editingRole ? `Edit Permissions for ${editingRole.name}` : 'Add New Role'}</DialogTitle>
                             <DialogDescription>
                                {editingRole ? 'Modify the permissions assigned to this role.' : 'Define a new role and assign permissions.'}
                             </DialogDescription>
                          </DialogHeader>
                          <div className="grid gap-4 py-4">
                              {!editingRole && (
                                 <div className="grid grid-cols-4 items-center gap-4">
                                    <Label htmlFor="role-name" className="text-right">Role Name</Label>
                                    <Input
                                        id="role-name"
                                        value={newRoleName}
                                        onChange={(e) => setNewRoleName(e.target.value)}
                                        className="col-span-3"
                                        placeholder="e.g., Clearance Officer"
                                        required
                                    />
                                 </div>
                              )}
                               <Label className="font-semibold">Permissions:</Label>
                               <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-6 max-h-[60vh] overflow-y-auto p-2 border rounded-md">
                                   {Object.entries(groupedPermissions).map(([group, permissions]) => (
                                       <div key={group} className="space-y-2">
                                           <h4 className="font-medium capitalize border-b pb-1">{group}</h4>
                                           {permissions.map(permission => (
                                               <div key={permission.id} className="flex items-center space-x-2">
                                                   <Checkbox
                                                       id={permission.id}
                                                       checked={selectedPermissions.has(permission.id)}
                                                       onCheckedChange={(checked) => handlePermissionChange(permission.id, !!checked)}
                                                        // Disable editing core admin permissions?
                                                        disabled={editingRole?.id === 'admin' && permission.id.startsWith('admin:')}
                                                    />
                                                   <Label htmlFor={permission.id} className="text-sm font-normal cursor-pointer">
                                                        {permission.description}
                                                   </Label>
                                                </div>
                                           ))}
                                       </div>
                                   ))}
                               </div>
                          </div>
                          <DialogFooter>
                             <Button type="button" variant="ghost" onClick={() => setShowRoleDialog(false)}>
                                 <X className="mr-2 h-4 w-4"/> Cancel
                             </Button>
                             <Button type="button" onClick={handleSaveRole} disabled={isSubmitting}>
                                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                                Save Changes
                             </Button>
                          </DialogFooter>
                     </DialogContent>
                 </Dialog>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Existing Roles</CardTitle>
                    <CardDescription>Manage system roles and their assigned permissions.</CardDescription>
                </CardHeader>
                <CardContent>
                    {isLoading ? (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Role Name</TableHead>
                                    <TableHead>Assigned Permissions</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                             </TableHeader>
                             <TableBody>
                                {Array.from({ length: 3 }).map((_, i) => (
                                    <TableRow key={i}>
                                        <TableCell><Skeleton className="h-5 w-24 rounded" /></TableCell>
                                        <TableCell><Skeleton className="h-4 w-48 rounded" /></TableCell>
                                        <TableCell className="text-right flex justify-end gap-2">
                                            <Skeleton className="h-8 w-8 rounded" />
                                            <Skeleton className="h-8 w-8 rounded" />
                                         </TableCell>
                                    </TableRow>
                                ))}
                             </TableBody>
                        </Table>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Role Name</TableHead>
                                    <TableHead>Assigned Permissions Count</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {roles.length > 0 ? (
                                    roles.map((role) => (
                                        <TableRow key={role.id}>
                                            <TableCell className="font-medium">{role.name} <span className="text-xs text-muted-foreground">({role.id})</span></TableCell>
                                            <TableCell>{role.permissions.length}</TableCell>
                                            <TableCell className="text-right">
                                                 <Button variant="outline" size="sm" className="mr-2" onClick={() => handleEditRole(role)} disabled={isSubmitting}>
                                                     <Edit className="mr-1 h-4 w-4" /> Edit Permissions
                                                 </Button>
                                                 <Button
                                                     variant="destructive"
                                                     size="sm"
                                                     onClick={() => handleDeleteRole(role.id, role.name)}
                                                     disabled={isSubmitting || ['admin', 'student', 'faculty'].includes(role.id)} // Disable delete for core roles
                                                     title={['admin', 'student', 'faculty'].includes(role.id) ? "Cannot delete core roles" : "Delete Role"}
                                                 >
                                                    <Trash2 className="mr-1 h-4 w-4" /> Delete
                                                 </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={3} className="text-center text-muted-foreground py-6">No roles found.</TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}

    