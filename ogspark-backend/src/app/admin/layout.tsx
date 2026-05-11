"use client";

import * as React from "react";
import { useRouter } from "next/navigation"; // For redirection
import { AuthUser, getCurrentUser, UserRole } from "@/types/user";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircle, Loader2 } from "lucide-react";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const [user, setUser] = React.useState<AuthUser | null>(null);
    const [isLoading, setIsLoading] = React.useState(true);
    const [authChecked, setAuthChecked] = React.useState(false); // To ensure auth check completes before role check

    React.useEffect(() => {
        const performChecks = async () => {
            setIsLoading(true);
            const currentUser = await getCurrentUser();

            if (!currentUser) {
                console.log("AdminLayout: User not authenticated, redirecting to /login.");
                router.replace('/login');
                return;
            }

            setAuthChecked(true); 
            setUser(currentUser); 

            // No need to set isLoading to false if role is not admin,
            // the component will render the Access Denied message.
            // Only set isLoading to false if user is admin or if auth check fails and leads to redirect.
            if (currentUser.role === 'admin') {
                setIsLoading(false);
            } else {
                // If not admin, we still stop "loading" the page content,
                // but will show access denied instead.
                setIsLoading(false); 
            }
        };
        performChecks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [router]); 

    if (isLoading) { 
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh]">
                <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
                <p className="text-muted-foreground">Verifying access...</p>
            </div>
        );
    }

    // If auth check is done and user exists, but not admin
    if (authChecked && user && user.role !== 'admin') {
        return (
             <div className="p-4 md:p-6">
                 <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Access Denied</AlertTitle>
                    <AlertDescription>
                        You must be an administrator to access this section.
                    </AlertDescription>
                </Alert>
             </div>
        );
    }

    // If user is null AFTER auth check (should have been redirected, but as a fallback)
    // This case should ideally not be hit if redirection works.
    if (authChecked && !user) {
         return (
             <div className="p-4 md:p-6">
                 <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Authentication Error</AlertTitle>
                    <AlertDescription>
                        User data not found after authentication check. Please try logging in again.
                    </AlertDescription>
                </Alert>
             </div>
        );
    }
    
    // User is authenticated and is an admin
    if (user && user.role === 'admin') {
        return (
            <div className="admin-layout-container">
                {children}
            </div>
        );
    }

    // Fallback for any unhandled state, though ideally, previous checks cover all scenarios.
    // This might briefly appear if redirection is slow or there's an unexpected state.
    return (
        <div className="flex flex-col items-center justify-center min-h-[60vh]">
            <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
            <p className="text-muted-foreground">Finalizing admin access...</p>
        </div>
    );
}
