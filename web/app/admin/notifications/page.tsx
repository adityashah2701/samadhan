"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { useUser } from "@clerk/nextjs";
import { useState } from "react";
import { toast } from "sonner";
import { Loader } from "lucide-react";

import { NotificationHeader } from "./components/notification-header";
import { NotificationComposer } from "./components/notification-composer";
import { NotificationHistory } from "./components/notification-history";
import { NotificationTemplates } from "./components/notification-templates";
import { NotificationAnalytics } from "./components/notification-analytics";
import { NotificationScheduler } from "./components/notification-scheduler";
import { NotificationSettings } from "./components/notification-settings";
import { BulkNotificationManager } from "./components/bulk-notification-manager";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";

export interface NotificationFormData {
  title: string;
  body: string;
  type:
    | "issue_created"
    | "issue_update"
    | "issue_resolved"
    | "new_comment"
    | "system"
    | "announcement"
    | "maintenance"
    | "emergency"
    | "department_update"
    | "user_registration";
  channels: ("app" | "email" | "sms" | "web")[];
  targetAudience:
    | "all_users"
    | "citizens"
    | "departments"
    | "admins"
    | "custom";
  customUserIds?: string[];
  urgent: boolean;
  scheduledAt?: number;
}

export interface NotificationTemplate {
  id: string;
  title: string;
  body: string;
  type: NotificationFormData["type"];
  channels: NotificationFormData["channels"];
  targetAudience: NotificationFormData["targetAudience"];
  variables: string[];
  isActive: boolean;
  createdAt: number;
  usageCount: number;
}

export default function AdminNotificationsPage() {
  const { user } = useUser();
  const [activeTab, setActiveTab] = useState("compose");
  const [refreshKey, setRefreshKey] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  // Get current admin user
  const currentAdminUser = useQuery(
    api.users.getUserByClerkId,
    user?.id ? { clerkId: user.id } : "skip"
  );

  // Get all users for targeting
  const allUsers = useQuery(api.users.getAllUsers, {});

  // Get notification statistics
  const notificationStats = useQuery(api.notifications.getNotificationStats, {
    timeRange: "30d",
  });

  // Get notification history
  const notificationHistory = useQuery(
    api.notifications.getAdminNotificationHistory,
    {
      limit: 50,
      status: "all",
    }
  );

  // Get notification templates
  const notificationTemplates = useQuery(
    api.notifications.getNotificationTemplates,
    {}
  );

  // Mutations
  const sendNotification = useMutation(api.notifications.sendAdminNotification);

  // Refresh data
  const handleRefresh = () => {
    setIsLoading(true);
    setRefreshKey((prev) => prev + 1);

    // Simulate refresh delay
    setTimeout(() => {
      setIsLoading(false);
      toast.success("Data refreshed");
    }, 1000);
  };

  // Handle sending notification
  const handleSendNotification = async (formData: NotificationFormData): Promise<boolean> => {
    if (!currentAdminUser) {
      toast.error("Admin user not found");
      return false;
    }

    try {
      const result = await sendNotification({
        title: formData.title,
        body: formData.body,
        type: formData.type,
        channels: formData.channels,
        targetAudience: formData.targetAudience,
        customUserIds: formData.customUserIds?.map((id) => id as any),
        urgent: formData.urgent,
        scheduledAt: formData.scheduledAt,
        senderId: currentAdminUser._id,
      });

      toast.success(
        `Notification ${result.status === "sent" ? "sent" : "scheduled"} to ${result.recipientCount} users`
      );

      // Refresh data
      setRefreshKey((prev) => prev + 1);

      return true;
    } catch (error) {
      console.error("Failed to send notification:", error);
      toast.error("Failed to send notification");
      return false;
    }
  };

  // Loading state
  if (!currentAdminUser && user?.id) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center space-y-4">
          <Loader className="h-8 w-8 animate-spin mx-auto text-green-500" />
          <p className="text-muted-foreground">Loading admin panel...</p>
        </div>
      </div>
    );
  }

  // Access control
  if (currentAdminUser && currentAdminUser.role !== "admin") {
    return (
      <div className="flex items-center justify-center py-12">
        <Card>
          <CardContent className="p-8 text-center">
            <div className="text-destructive mb-4">🚫 Access Denied</div>
            <h2 className="text-xl font-semibold mb-2">
              Admin Access Required
            </h2>
            <p className="text-muted-foreground">
              You need administrator privileges to access the notification
              system.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <NotificationHeader
        stats={notificationStats}
        totalUsers={allUsers?.length || 0}
        onRefresh={handleRefresh}
        isRefreshing={isLoading}
      />

      {/* Main Notification Interface */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 lg:grid-cols-7">
          <TabsTrigger value="compose">Compose</TabsTrigger>
          <TabsTrigger value="scheduler">Schedule</TabsTrigger>
          <TabsTrigger value="bulk">Bulk Send</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        {/* Compose Notification */}
        <TabsContent value="compose" className="space-y-6">
          <NotificationComposer
            users={allUsers || []}
            templates={notificationTemplates || []}
            onSendNotification={handleSendNotification}
          />
        </TabsContent>

        {/* Scheduled Notifications */}
        <TabsContent value="scheduler" className="space-y-6">
          <NotificationScheduler
            users={allUsers || []}
            templates={notificationTemplates || []}
            onSendNotification={handleSendNotification}
            scheduledNotifications={
              notificationHistory
                ?.filter(
                  (n) => n.status === "scheduled" && n.scheduledAt !== undefined
                )
                .map((n) => ({
                  ...n,
                  scheduledAt: n.scheduledAt!, // Assert it's defined due to filter
                })) || []
            }
          />
        </TabsContent>

        {/* Bulk Notification Manager */}
        <TabsContent value="bulk" className="space-y-6">
          <BulkNotificationManager
            users={allUsers || []}
            onSendNotification={handleSendNotification}
          />
        </TabsContent>

        {/* Notification History */}
        <TabsContent value="history" className="space-y-6">
          <NotificationHistory
            notifications={notificationHistory || []}
            onRefresh={handleRefresh}
          />
        </TabsContent>

        {/* Templates */}
        <TabsContent value="templates" className="space-y-6">
          <NotificationTemplates
            templates={notificationTemplates || []}
            onUseTemplate={(template) => {
              // Switch to compose tab and populate form with template
              setActiveTab("compose");
              // Template data will be passed to NotificationComposer
            }}
          />
        </TabsContent>

        {/* Analytics */}
        <TabsContent value="analytics" className="space-y-6">
          <NotificationAnalytics
            stats={notificationStats}
            history={notificationHistory || []}
          />
        </TabsContent>

        {/* Settings */}
        <TabsContent value="settings" className="space-y-6">
          <NotificationSettings />
        </TabsContent>
      </Tabs>
    </div>
  );
}
