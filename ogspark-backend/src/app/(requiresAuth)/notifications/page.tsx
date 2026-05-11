
"use client"; // Needed for useState, useEffect

import * as React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bell, AlertTriangle, CheckCircle, Info, Loader2, Trash2, EyeOff, Eye } from "lucide-react";
import { cn } from "@/lib/utils";
import { getNotifications, markNotificationAsRead, markAllNotificationsAsRead, deleteNotification, type Notification, type NotificationType } from "@/services/notifications"; // Assuming service exists
import { AuthUser, getCurrentUser } from "@/types/user";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from 'date-fns';

const getNotificationStyle = (type: NotificationType) => {
  switch (type) {
    case 'warning': return { icon: <AlertTriangle className="text-yellow-500" />, borderClass: "border-l-yellow-500" };
    case 'error': return { icon: <AlertTriangle className="text-red-500" />, borderClass: "border-l-red-500" };
    case 'success': return { icon: <CheckCircle className="text-green-500" />, borderClass: "border-l-green-500" };
    case 'info':
    default: return { icon: <Info className="text-blue-500" />, borderClass: "border-l-blue-500" };
  }
};

export default function NotificationsPage() {
    const { toast } = useToast();
    const [user, setUser] = React.useState<AuthUser | null>(null);
    const [notifications, setNotifications] = React.useState<Notification[]>([]);
    const [isLoading, setIsLoading] = React.useState(true);
    const [activeTab, setActiveTab] = React.useState<"all" | NotificationType>("all");

    // Fetch user and notifications
    React.useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true);
            const currentUser = await getCurrentUser();
            setUser(currentUser);
            if (currentUser) {
                try {
                    const fetchedNotifications = await getNotifications(currentUser.id);
                    setNotifications(fetchedNotifications.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()));
                } catch (error) {
                    console.error("Error fetching notifications:", error);
                    toast({ variant: "destructive", title: "Error", description: "Could not fetch notifications." });
                }
            } else {
                 // Handled by layout, but set state for consistency
                 toast({ variant: "destructive", title: "Error", description: "User not authenticated." });
            }
            setIsLoading(false);
        };
        fetchData();
    }, [toast]);

    const handleMarkRead = async (id: string) => {
        if (!user) return;
        try {
            const success = await markNotificationAsRead(user.id, id);
            if (success) {
                setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
                // No toast needed for simple mark as read
            } else {
                throw new Error("Failed to mark as read on server.");
            }
        } catch (error) {
            console.error("Error marking notification as read:", error);
            toast({ variant: "destructive", title: "Error", description: "Could not mark notification as read." });
        }
    };

     const handleMarkAllRead = async () => {
         if (!user) return;
         try {
             const success = await markAllNotificationsAsRead(user.id);
             if (success) {
                 setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
                 toast({ title: "Success", description: "All notifications marked as read." });
             } else {
                 throw new Error("Failed to mark all as read on server.");
             }
         } catch (error) {
             console.error("Error marking all notifications as read:", error);
             toast({ variant: "destructive", title: "Error", description: "Could not mark all notifications as read." });
         }
     };

    const handleDelete = async (id: string) => {
         if (!user) return;
        if (!confirm("Are you sure you want to delete this notification?")) return;
         try {
             const success = await deleteNotification(user.id, id);
             if (success) {
                 setNotifications(prev => prev.filter(n => n.id !== id));
                 toast({ title: "Success", description: "Notification deleted." });
             } else {
                  throw new Error("Failed to delete notification on server.");
             }
         } catch (error) {
             console.error("Error deleting notification:", error);
             toast({ variant: "destructive", title: "Error", description: "Could not delete notification." });
         }
    };

    const filteredNotifications = React.useMemo(() => {
        if (activeTab === "all") return notifications;
        return notifications.filter(n => n.type === activeTab);
    }, [notifications, activeTab]);

    const unreadCount = notifications.filter(n => !n.isRead).length;

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                <h1 className="text-3xl font-bold text-primary flex items-center gap-2">
                    <Bell /> Notifications
                     {unreadCount > 0 && (
                        <Badge variant="destructive" className="ml-2">{unreadCount} New</Badge>
                     )}
                </h1>
                 <Button variant="outline" size="sm" onClick={handleMarkAllRead} disabled={unreadCount === 0 || isLoading}>
                     <Eye className="mr-1 h-4 w-4" /> Mark All as Read
                 </Button>
            </div>

            <Card className="transform transition-transform duration-300 hover:shadow-lg">
                <CardHeader>
                    <CardTitle>Your Updates</CardTitle>
                    <CardDescription>Alerts related to attendance, fees, clearance, and announcements.</CardDescription>
                     <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)} className="pt-2">
                         <TabsList>
                             <TabsTrigger value="all">All</TabsTrigger>
                             <TabsTrigger value="info"><Info className="h-4 w-4 mr-1 text-blue-500" />Info</TabsTrigger>
                             <TabsTrigger value="warning"><AlertTriangle className="h-4 w-4 mr-1 text-yellow-500" />Warnings</TabsTrigger>
                             <TabsTrigger value="error"><AlertTriangle className="h-4 w-4 mr-1 text-red-500" />Errors</TabsTrigger>
                             <TabsTrigger value="success"><CheckCircle className="h-4 w-4 mr-1 text-green-500" />Success</TabsTrigger>
                         </TabsList>
                     </Tabs>
                </CardHeader>
                <CardContent className="space-y-4 max-h-[70vh] overflow-y-auto">
                    {isLoading ? (
                        <div className="flex justify-center items-center py-10">
                            <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        </div>
                    ) : filteredNotifications.length > 0 ? (
                        filteredNotifications.map((notification) => {
                            const style = getNotificationStyle(notification.type);
                            const timeAgo = formatDistanceToNow(new Date(notification.timestamp), { addSuffix: true });
                            return (
                                <div
                                    key={notification.id}
                                    className={cn(
                                        "relative flex items-start gap-4 rounded-md border border-l-4 p-4 transition-colors hover:bg-muted/50 group",
                                        style.borderClass,
                                        !notification.isRead && "bg-primary/5 border-primary/20"
                                    )}
                                >
                                    <div className="flex-shrink-0 pt-1">{style.icon}</div>
                                    <div className="flex-1">
                                        <p className={cn("font-semibold", !notification.isRead && "text-primary")}>{notification.title}</p>
                                        <p className="text-sm text-muted-foreground">{notification.message}</p>
                                        <p className="text-xs text-muted-foreground mt-1">{timeAgo}</p>
                                         {/* Link to related page */}
                                         {notification.link && (
                                            <a href={notification.link} className="text-xs text-accent hover:underline mt-1 inline-block">View Details</a>
                                         )}
                                    </div>
                                     <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        {!notification.isRead && (
                                            <Button variant="ghost" size="icon" className="h-7 w-7" title="Mark as read" onClick={() => handleMarkRead(notification.id)}>
                                                <Eye className="h-4 w-4" />
                                            </Button>
                                        )}
                                         <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10" title="Delete" onClick={() => handleDelete(notification.id)}>
                                             <Trash2 className="h-4 w-4" />
                                         </Button>
                                     </div>
                                </div>
                            );
                        })
                    ) : (
                        <div className="flex flex-col items-center justify-center py-10 text-center text-muted-foreground">
                            <Bell className="h-12 w-12 mb-4 text-gray-400" />
                            <p>No notifications {activeTab !== 'all' ? `of type "${activeTab}"` : 'yet'}.</p>
                            <p className="text-sm">Check back later for updates.</p>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
