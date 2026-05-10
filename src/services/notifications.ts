
/**
 * Type representing different categories or severities of notifications.
 */
export type NotificationType = 'info' | 'warning' | 'success' | 'error';

/**
 * Represents a single notification item.
 */
export interface Notification {
  id: string;
  userId: string; // The user this notification is for
  title: string;
  message: string;
  type: NotificationType;
  timestamp: string; // ISO DateTime string
  isRead: boolean;
  link?: string; // Optional link to related page (e.g., /fees, /clearance/req-123)
}


// --- Service Functions ---

/**
 * Retrieves notifications for a specific user.
 * TODO: Implement backend logic.
 */
export async function getNotifications(userId: string): Promise<Notification[]> {
  console.log(`Fetching notifications for user: ${userId}`);
  return [];
}

/**
 * Retrieves the count of unread notifications for a user.
 * TODO: Implement backend logic.
 */
export async function getUnreadNotificationCount(userId: string): Promise<number> {
    console.log(`Fetching unread notification count for user: ${userId}`);
    return 0;
}

/**
 * Marks a specific notification as read.
 * TODO: Implement backend logic.
 */
export async function markNotificationAsRead(userId: string, notificationId: string): Promise<boolean> {
    console.log(`Marking notification ${notificationId} as read for user: ${userId}`);
    return false;
}

/**
 * Marks all notifications as read for a specific user.
 * TODO: Implement backend logic.
 */
export async function markAllNotificationsAsRead(userId: string): Promise<boolean> {
    console.log(`Marking all notifications as read for user: ${userId}`);
    return false;
}


/**
 * Deletes a specific notification.
 * TODO: Implement backend logic.
 */
export async function deleteNotification(userId: string, notificationId: string): Promise<boolean> {
    console.log(`Deleting notification ${notificationId} for user: ${userId}`);
    return false;
}


/**
 * Sends a notification.
 * TODO: Implement backend logic.
 */
export async function sendNotification(notification: Omit<Notification, 'id' | 'timestamp' | 'isRead'>): Promise<Notification | null> {
    console.log(`Sending notification to ${notification.userId}: ${notification.title}`);
    return null;
}
