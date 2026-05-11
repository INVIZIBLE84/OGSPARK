
"use client";

import * as React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { Settings, User, Lock, Bell, Palette, Loader2 } from "lucide-react";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { Switch } from "@/components/ui/switch";
import { AuthUser, getCurrentUser } from "@/types/user";
import { Skeleton } from "@/components/ui/skeleton";

export default function SettingsPage() {
    const { toast } = useToast();
    const [user, setUser] = React.useState<AuthUser | null>(null);
    const [isLoading, setIsLoading] = React.useState(true);
    const [isSaving, setIsSaving] = React.useState(false);
    
    // Form states
    const [currentPassword, setCurrentPassword] = React.useState("");
    const [newPassword, setNewPassword] = React.useState("");
    const [confirmPassword, setConfirmPassword] = React.useState("");

    React.useEffect(() => {
        const fetchUser = async () => {
            setIsLoading(true);
            const currentUser = await getCurrentUser();
            setUser(currentUser);
            setIsLoading(false);
        };
        fetchUser();
    }, []);

    const handlePasswordChange = async (e: React.FormEvent) => {
        e.preventDefault();
        if (newPassword !== confirmPassword) {
            toast({ variant: "destructive", title: "Error", description: "New passwords do not match." });
            return;
        }
        if (newPassword.length < 8) {
            toast({ variant: "destructive", title: "Error", description: "New password must be at least 8 characters long." });
            return;
        }
        
        setIsSaving(true);
        toast({ title: "Updating...", description: "Changing your password." });
        
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 1000));

        // In a real app, you would call a service function here:
        // const result = await changePassword(user.id, currentPassword, newPassword);
        // if (result.success) { ... }
        
        // Mocked response:
        const result = { success: false, message: "Password change requires a backend." };

        if (result.success) {
            toast({ title: "Success", description: "Password changed successfully." });
            setCurrentPassword("");
            setNewPassword("");
            setConfirmPassword("");
        } else {
            toast({ variant: "destructive", title: "Failed", description: result.message });
        }
        
        setIsSaving(false);
    };

    if (isLoading) {
        return <SettingsSkeleton />;
    }
    
    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold text-primary flex items-center gap-2">
                <Settings className="h-7 w-7" /> Settings
            </h1>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-8">
                    {/* Password Settings */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2"><Lock /> Change Password</CardTitle>
                            <CardDescription>Update your account password. Remember to use a strong, unique password.</CardDescription>
                        </CardHeader>
                        <form onSubmit={handlePasswordChange}>
                            <CardContent className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="current-password">Current Password</Label>
                                    <Input id="current-password" type="password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} required disabled={isSaving} />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="new-password">New Password</Label>
                                    <Input id="new-password" type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} required disabled={isSaving} />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="confirm-password">Confirm New Password</Label>
                                    <Input id="confirm-password" type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required disabled={isSaving} />
                                </div>
                            </CardContent>
                            <CardContent>
                                <Button type="submit" disabled={isSaving}>
                                    {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : null}
                                    Save Password
                                </Button>
                            </CardContent>
                        </form>
                    </Card>

                    {/* Notification Settings */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2"><Bell /> Notification Preferences</CardTitle>
                            <CardDescription>Choose how you receive notifications from the system.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <SettingSwitch
                                id="email-notifications"
                                label="Email Notifications"
                                description="Receive important updates via email."
                            />
                            <SettingSwitch
                                id="in-app-notifications"
                                label="In-App Banners"
                                description="Show notification banners inside the app."
                                defaultChecked
                            />
                            <SettingSwitch
                                id="mobile-push"
                                label="Push Notifications"
                                description="Get alerts on your mobile device (coming soon)."
                                disabled
                            />
                        </CardContent>
                    </Card>
                </div>
                
                <div className="space-y-8">
                     {/* Theme Settings */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2"><Palette /> Theme</CardTitle>
                            <CardDescription>Customize the look and feel of the application.</CardDescription>
                        </CardHeader>
                        <CardContent className="flex items-center justify-between">
                            <Label htmlFor="theme-toggle">Light / Dark / System</Label>
                            <ThemeToggle />
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}

interface SettingSwitchProps {
    id: string;
    label: string;
    description: string;
    defaultChecked?: boolean;
    disabled?: boolean;
}

function SettingSwitch({ id, label, description, defaultChecked, disabled }: SettingSwitchProps) {
    return (
        <div className="flex items-center justify-between space-x-2 rounded-lg border p-4">
            <div className="space-y-0.5">
                <Label htmlFor={id} className="text-base">{label}</Label>
                <p className="text-sm text-muted-foreground">{description}</p>
            </div>
            <Switch id={id} defaultChecked={defaultChecked} disabled={disabled} />
        </div>
    );
}


function SettingsSkeleton() {
    return (
      <div className="space-y-6 animate-pulse">
        <Skeleton className="h-9 w-48 rounded-md" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            <Card>
              <CardHeader>
                <Skeleton className="h-6 w-1/3 rounded-md" />
                <Skeleton className="h-4 w-2/3 rounded-md" />
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2"><Skeleton className="h-4 w-24 rounded-md" /><Skeleton className="h-10 w-full rounded-md" /></div>
                <div className="space-y-2"><Skeleton className="h-4 w-24 rounded-md" /><Skeleton className="h-10 w-full rounded-md" /></div>
                <div className="space-y-2"><Skeleton className="h-4 w-24 rounded-md" /><Skeleton className="h-10 w-full rounded-md" /></div>
              </CardContent>
              <CardContent>
                <Skeleton className="h-10 w-32 rounded-md" />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                 <Skeleton className="h-6 w-1/3 rounded-md" />
                 <Skeleton className="h-4 w-2/3 rounded-md" />
              </CardHeader>
              <CardContent className="space-y-4">
                <Skeleton className="h-16 w-full rounded-md" />
                <Skeleton className="h-16 w-full rounded-md" />
              </CardContent>
            </Card>
          </div>
          <div className="space-y-8">
            <Card>
              <CardHeader>
                <Skeleton className="h-6 w-1/4 rounded-md" />
                <Skeleton className="h-4 w-3/4 rounded-md" />
              </CardHeader>
              <CardContent className="flex justify-between items-center">
                 <Skeleton className="h-5 w-1/2 rounded-md" />
                 <Skeleton className="h-10 w-10 rounded-md" />
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
}
