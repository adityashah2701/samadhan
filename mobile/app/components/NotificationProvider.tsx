import React, { createContext, useContext, useEffect, useState } from 'react';
import { useUser } from '@clerk/clerk-expo';
import { useQuery } from 'convex/react';
import { api } from "@/convex/_generated/api";
import { useNotifications, NotificationHelpers } from '../hooks/useNotifications';

interface NotificationContextType {
  unreadCount: number;
  sendLocalNotificationForIssue: (issueTitle: string, issueNumber: string) => void;
  sendLocalNotificationForStatus: (issueTitle: string, newStatus: string, note?: string) => void;
  sendLocalNotificationForComment: (issueTitle: string, commenterName: string, isOfficial: boolean) => void;
}

const NotificationContext = createContext<NotificationContextType>({
  unreadCount: 0,
  sendLocalNotificationForIssue: () => {},
  sendLocalNotificationForStatus: () => {},
  sendLocalNotificationForComment: () => {},
});

export const useNotificationContext = () => useContext(NotificationContext);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const { user } = useUser();
  const { sendLocalNotification, setBadgeCount } = useNotifications();
  const [lastNotificationCount, setLastNotificationCount] = useState(0);

  // Get user data from Convex
  const userData = useQuery(api.users.getUserByClerkId, 
    user?.id ? { clerkId: user.id } : "skip"
  );

  // Get notification counts
  const notificationCounts = useQuery(api.notifications.getNotificationCounts,
    userData ? { userId: userData._id } : "skip"
  );

  // Watch for new notifications and send local notifications
  useEffect(() => {
    if (notificationCounts?.unread !== undefined) {
      // Update badge count
      setBadgeCount(notificationCounts.unread);
      
      // If unread count increased, there's a new notification
      if (notificationCounts.unread > lastNotificationCount) {
        // Get the latest notifications to send local notification
        // This will be handled by the Convex functions calling local notifications
      }
      
      setLastNotificationCount(notificationCounts.unread);
    }
  }, [notificationCounts?.unread, setBadgeCount, lastNotificationCount]);

  const sendLocalNotificationForIssue = (issueTitle: string, issueNumber: string) => {
    const { title, body } = NotificationHelpers.formatIssueCreatedNotification(issueTitle, issueNumber);
    sendLocalNotification({ title, body });
  };

  const sendLocalNotificationForStatus = (issueTitle: string, newStatus: string, note?: string) => {
    const { title, body } = NotificationHelpers.formatStatusUpdateNotification(issueTitle, newStatus, note);
    sendLocalNotification({ title, body });
  };

  const sendLocalNotificationForComment = (issueTitle: string, commenterName: string, isOfficial: boolean) => {
    const { title, body } = NotificationHelpers.formatCommentNotification(issueTitle, commenterName, isOfficial);
    sendLocalNotification({ title, body });
  };

  const contextValue: NotificationContextType = {
    unreadCount: notificationCounts?.unread || 0,
    sendLocalNotificationForIssue,
    sendLocalNotificationForStatus,
    sendLocalNotificationForComment,
  };

  return (
    <NotificationContext.Provider value={contextValue}>
      {children}
    </NotificationContext.Provider>
  );
}
