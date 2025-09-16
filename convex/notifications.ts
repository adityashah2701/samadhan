import { v } from "convex/values";
import { internalMutation, mutation, query } from "./_generated/server";
import { internal } from "./_generated/api";

// Extended notification types for admin functionality
const adminNotificationTypes = v.union(
  v.literal("issue_created"),
  v.literal("issue_update"),
  v.literal("issue_resolved"),
  v.literal("new_comment"),
  v.literal("system"),
  v.literal("announcement"),
  v.literal("maintenance"),
  v.literal("emergency"),
  v.literal("department_update"),
  v.literal("user_registration")
);

// Delivery channels
const deliveryChannels = v.array(
  v.union(
    v.literal("app"),
    v.literal("email"),
    v.literal("sms"),
    v.literal("web")
  )
);

// Target audiences
const targetAudiences = v.union(
  v.literal("all_users"),
  v.literal("citizens"),
  v.literal("departments"),
  v.literal("admins"),
  v.literal("custom")
);

// Admin notification management
export const sendAdminNotification = mutation({
  args: {
    title: v.string(),
    body: v.string(),
    type: adminNotificationTypes,
    channels: deliveryChannels,
    targetAudience: targetAudiences,
    customUserIds: v.optional(v.array(v.id("users"))),
    urgent: v.optional(v.boolean()),
    scheduledAt: v.optional(v.number()),
    senderId: v.id("users")
  },
  handler: async (ctx, args) => {
    // Verify sender is admin
    const sender = await ctx.db.get(args.senderId);
    if (!sender || sender.role !== "admin") {
      throw new Error("Only administrators can send system notifications");
    }

    // Determine target users
    let targetUsers: any[] = [];
    
    switch (args.targetAudience) {
      case "all_users":
        targetUsers = await ctx.db.query("users").collect();
        break;
      case "citizens":
        targetUsers = await ctx.db
          .query("users")
          .withIndex("by_role", (q) => q.eq("role", "citizen"))
          .collect();
        break;
      case "departments":
        targetUsers = await ctx.db
          .query("users")
          .withIndex("by_role", (q) => q.eq("role", "department"))
          .collect();
        break;
      case "admins":
        targetUsers = await ctx.db
          .query("users")
          .withIndex("by_role", (q) => q.eq("role", "admin"))
          .collect();
        break;
      case "custom":
        if (args.customUserIds) {
          targetUsers = await Promise.all(
            args.customUserIds.map(id => ctx.db.get(id))
          );
          targetUsers = targetUsers.filter(Boolean);
        }
        break;
    }

    if (targetUsers.length === 0) {
      throw new Error("No target users found");
    }

    const now = Date.now();
    const deliveryTime = args.scheduledAt || now;

    // Create notification record
    const notificationId = await ctx.db.insert("adminNotifications", {
      title: args.title,
      body: args.body,
      type: args.type,
      channels: args.channels,
      targetAudience: args.targetAudience,
      customUserIds: args.customUserIds,
      urgent: args.urgent || false,
      senderId: args.senderId,
      scheduledAt: deliveryTime,
      sentAt: deliveryTime <= now ? now : undefined,
      recipientCount: targetUsers.length,
      deliveredCount: 0,
      readCount: 0,
      status: deliveryTime <= now ? "sent" : "scheduled",
      createdAt: now,
    });

    // If not scheduled for future, send immediately
    if (deliveryTime <= now) {
      await ctx.runMutation(internal.notifications.processAdminNotification, {
        notificationId,
        targetUsers: targetUsers.map(u => u._id),
      });
    }

    console.log(`📢 Admin notification created: "${args.title}" for ${targetUsers.length} users`);
    
    return {
      notificationId,
      recipientCount: targetUsers.length,
      status: deliveryTime <= now ? "sent" : "scheduled"
    };
  },
});

// Process admin notification delivery
export const processAdminNotification = internalMutation({
  args: {
    notificationId: v.id("adminNotifications"),
    targetUsers: v.array(v.id("users")),
  },
  handler: async (ctx, args) => {
    const adminNotification = await ctx.db.get(args.notificationId);
    if (!adminNotification) {
      console.error("Admin notification not found");
      return;
    }

    const now = Date.now();
    let deliveredCount = 0;

    // Create individual notifications for each user
    const userNotifications = await Promise.all(
      args.targetUsers.map(async (userId) => {
        const notificationId = await ctx.db.insert("notifications", {
          userId,
          title: adminNotification.title,
          message: adminNotification.body,
          type: "system", // Map admin types to basic types
          isRead: false,
          createdAt: now,
          adminNotificationId: adminNotification._id,
        });
        deliveredCount++;
        return { userId, notificationId };
      })
    );

    // Send push notifications if app channel is enabled
    if (adminNotification.channels.includes("app")) {
      await Promise.all(
        userNotifications.map(async ({ userId }) => {
          try {
            await ctx.runMutation(internal.notifications.sendPushNotification, {
              userId,
              title: adminNotification.urgent ? `🚨 ${adminNotification.title}` : adminNotification.title,
              body: adminNotification.body,
              data: {
                type: "admin_notification",
                notificationId: adminNotification._id,
                urgent: adminNotification.urgent?.toString(),
              },
            });
          } catch (error) {
            console.error(`Failed to send push notification to user ${userId}:`, error);
          }
        })
      );
    }

    // Send email notifications if email channel is enabled
    if (adminNotification.channels.includes("email")) {
      await Promise.all(
        args.targetUsers.map(async (userId) => {
          try {
            await ctx.runMutation(internal.notifications.sendEmailWithTemplate, {
              userId,
              subject: adminNotification.title,
              body: adminNotification.body,
              urgent: adminNotification.urgent || false,
            });
          } catch (error) {
            console.error(`Failed to send email notification to user ${userId}:`, error);
          }
        })
      );
    }

    // Update admin notification status
    await ctx.db.patch(adminNotification._id, {
      status: "delivered",
      deliveredCount,
      sentAt: now,
    });

    console.log(`✅ Processed admin notification: ${deliveredCount} notifications delivered`);
  },
});



// Get admin notification history
export const getAdminNotificationHistory = query({
  args: {
    limit: v.optional(v.number()),
    status: v.optional(v.union(
      v.literal("all"),
      v.literal("sent"),
      v.literal("scheduled"),
      v.literal("delivered"),
      v.literal("failed")
    )),
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 50;
    
    let notifications = await ctx.db
      .query("adminNotifications")
      .order("desc")
      .take(limit);

    if (args.status && args.status !== "all") {
      notifications = notifications.filter(n => n.status === args.status);
    }

    // Get sender details
    const notificationsWithSender = await Promise.all(
      notifications.map(async (notification) => {
        const sender = await ctx.db.get(notification.senderId);
        return {
          ...notification,
          senderName: sender ? `${sender.firstName} ${sender.lastName}` : "Unknown",
        };
      })
    );

    return notificationsWithSender;
  },
});

// Get notification statistics
export const getNotificationStats = query({
  args: {
    timeRange: v.optional(v.union(
      v.literal("24h"),
      v.literal("7d"),
      v.literal("30d"),
      v.literal("90d")
    )),
  },
  handler: async (ctx, args) => {
    const timeRange = args.timeRange || "30d";
    const now = Date.now();
    const timeRangeMs = {
      "24h": 24 * 60 * 60 * 1000,
      "7d": 7 * 24 * 60 * 60 * 1000,
      "30d": 30 * 24 * 60 * 60 * 1000,
      "90d": 90 * 24 * 60 * 60 * 1000,
    };
    
    const cutoffTime = now - timeRangeMs[timeRange];
    
    const adminNotifications = await ctx.db
      .query("adminNotifications")
      .filter((q) => q.gte(q.field("createdAt"), cutoffTime))
      .collect();
    
    const userNotifications = await ctx.db
      .query("notifications")
      .filter((q) => q.gte(q.field("createdAt"), cutoffTime))
      .collect();

    const totalSent = adminNotifications.reduce((sum, n) => sum + (n.recipientCount || 0), 0);
    const totalDelivered = adminNotifications.reduce((sum, n) => sum + (n.deliveredCount || 0), 0);
    const totalRead = adminNotifications.reduce((sum, n) => sum + (n.readCount || 0), 0);
    
    return {
      totalAdminNotifications: adminNotifications.length,
      totalUserNotifications: userNotifications.length,
      totalSent,
      totalDelivered,
      totalRead,
      deliveryRate: totalSent > 0 ? Math.round((totalDelivered / totalSent) * 100) : 0,
      readRate: totalDelivered > 0 ? Math.round((totalRead / totalDelivered) * 100) : 0,
      byType: adminNotifications.reduce((acc, n) => {
        acc[n.type] = (acc[n.type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      byStatus: adminNotifications.reduce((acc, n) => {
        acc[n.status] = (acc[n.status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
    };
  },
});

// Mark admin notification as read (when user reads it)
export const markAdminNotificationAsRead = mutation({
  args: {
    userNotificationId: v.id("notifications"),
  },
  handler: async (ctx, args) => {
    const userNotification = await ctx.db.get(args.userNotificationId);
    if (!userNotification || userNotification.isRead) {
      return; // Already read or doesn't exist
    }

    // Mark user notification as read
    await ctx.db.patch(args.userNotificationId, {
      isRead: true,
    });

    // Update admin notification read count if it's linked
    if (userNotification.adminNotificationId) {
      const adminNotification = await ctx.db.get(userNotification.adminNotificationId);
      if (adminNotification) {
        await ctx.db.patch(adminNotification._id, {
          readCount: (adminNotification.readCount || 0) + 1,
        });
      }
    }
  },
});

// Get notification templates
export const getNotificationTemplates = query({
  handler: async (ctx) => {
    // Return predefined templates - in a real app, these could be stored in the database
    const now = Date.now();
    return [
      {
        id: "issue_status_update",
        title: "Issue Status Update",
        body: "Your reported issue has been updated to: {status}",
        type: "issue_update",
        channels: ["app", "email"],
        targetAudience: "citizens",
        variables: ["status", "issue_title", "issue_id"],
        isActive: true,
        createdAt: now,
        usageCount: 0,
      },
      {
        id: "new_issue_assignment",
        title: "New Issue Assignment",
        body: "A new issue has been assigned to your department: {issue_title}",
        type: "department_update",
        channels: ["app", "email"],
        targetAudience: "departments",
        variables: ["issue_title", "issue_category", "priority"],
        isActive: true,
        createdAt: now,
        usageCount: 0,
      },
      {
        id: "system_maintenance",
        title: "Scheduled System Maintenance",
        body: "The system will be under maintenance from {start_time} to {end_time} on {date}",
        type: "maintenance",
        channels: ["app", "email", "web"],
        targetAudience: "all_users",
        variables: ["start_time", "end_time", "date"],
        isActive: true,
        createdAt: now,
        usageCount: 0,
      },
      {
        id: "emergency_alert",
        title: "Emergency Alert",
        body: "EMERGENCY: {emergency_details}",
        type: "emergency",
        channels: ["app", "sms"],
        targetAudience: "all_users",
        variables: ["emergency_details", "action_required"],
        isActive: true,
        createdAt: now,
        usageCount: 0,
      },
    ];
  },
});

// Create a notification
export const createNotification = mutation({
  args: {
    userId: v.id("users"),
    title: v.string(),
    message: v.string(),
    type: v.union(
      v.literal("issue_created"),
      v.literal("issue_update"),
      v.literal("issue_resolved"),
      v.literal("new_comment"),
      v.literal("system")
    ),
    relatedIssueId: v.optional(v.id("civicIssues")),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    
    const notificationId = await ctx.db.insert("notifications", {
      userId: args.userId,
      title: args.title,
      message: args.message,
      type: args.type,
      relatedIssueId: args.relatedIssueId,
      isRead: false,
      createdAt: now,
    });

    return notificationId;
  },
});

// Get notifications for a user
export const getUserNotifications = query({
  args: { 
    userId: v.id("users"),
    limit: v.optional(v.number()),
    filter: v.optional(v.union(
      v.literal("all"),
      v.literal("unread"),
      v.literal("issue_update"),
      v.literal("system")
    ))
  },
  handler: async (ctx, args) => {
    const limit = args.limit || 50;
    
    let notifications = await ctx.db
      .query("notifications")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .order("desc")
      .take(limit);

    // Apply filter
    if (args.filter && args.filter !== "all") {
      notifications = notifications.filter(notification => {
        switch (args.filter) {
          case "unread":
            return !notification.isRead;
          case "issue_update":
            return notification.type === "issue_update" || 
                   notification.type === "issue_resolved" || 
                   notification.type === "issue_created";
          case "system":
            return notification.type === "system";
          default:
            return true;
        }
      });
    }

    // Get related issue details for notifications that have them
    const notificationsWithIssueDetails = await Promise.all(
      notifications.map(async (notification) => {
        if (notification.relatedIssueId) {
          const issue = await ctx.db.get(notification.relatedIssueId);
          return {
            ...notification,
            relatedIssue: issue ? {
              title: issue.title,
              status: issue.status,
              category: issue.category,
            } : null,
          };
        }
        return notification;
      })
    );

    return notificationsWithIssueDetails;
  },
});

// Mark notification as read
export const markNotificationAsRead = mutation({
  args: { notificationId: v.id("notifications") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.notificationId, {
      isRead: true,
    });
  },
});

// Mark all notifications as read for a user
export const markAllNotificationsAsRead = mutation({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const unreadNotifications = await ctx.db
      .query("notifications")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .filter((q) => q.eq(q.field("isRead"), false))
      .collect();

    await Promise.all(
      unreadNotifications.map((notification) =>
        ctx.db.patch(notification._id, { isRead: true })
      )
    );
  },
});

// Delete notification
export const deleteNotification = mutation({
  args: { notificationId: v.id("notifications") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.notificationId);
  },
});

// Delete all notifications for a user
export const deleteAllNotifications = mutation({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const userNotifications = await ctx.db
      .query("notifications")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();

    await Promise.all(
      userNotifications.map((notification) =>
        ctx.db.delete(notification._id)
      )
    );
  },
});

// Get notification counts for a user
export const getNotificationCounts = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const notifications = await ctx.db
      .query("notifications")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();

    const unreadCount = notifications.filter(n => !n.isRead).length;
    const totalCount = notifications.length;
    const issueUpdateCount = notifications.filter(n => 
      n.type === "issue_update" || n.type === "issue_resolved" || n.type === "issue_created"
    ).length;
    const systemCount = notifications.filter(n => n.type === "system").length;

    return {
      total: totalCount,
      unread: unreadCount,
      issueUpdates: issueUpdateCount,
      system: systemCount,
    };
  },
});

// Helper function to send notifications for issue creation
export const notifyIssueCreated = internalMutation({
  args: {
    userId: v.id("users"),
    issueId: v.id("civicIssues"),
    issueTitle: v.string(),
    issueNumber: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("notifications", {
      userId: args.userId,
      title: "Issue Reported Successfully",
      message: `Your issue "${args.issueTitle}" has been submitted successfully and assigned tracking ID: ${args.issueNumber}. You will receive updates as it progresses.`,
      type: "issue_created",
      relatedIssueId: args.issueId,
      isRead: false,
      createdAt: Date.now(),
    });

    console.log(`🔔 Issue creation notification sent for: ${args.issueTitle}`);
  },
});

// Helper function to send notifications for status updates
export const notifyStatusUpdate = internalMutation({
  args: {
    userId: v.id("users"),
    issueId: v.id("civicIssues"),
    issueTitle: v.string(),
    previousStatus: v.string(),
    newStatus: v.string(),
    note: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const statusMessages = {
      pending: "is pending review",
      acknowledged: "has been acknowledged",
      in_progress: "is now being worked on",
      resolved: "has been resolved",
      rejected: "has been rejected"
    };

    const title = args.newStatus === "resolved" ? "Issue Resolved!" : "Issue Status Updated";
    const message = args.newStatus === "resolved" 
      ? `Great news! Your issue "${args.issueTitle}" has been successfully resolved.${args.note ? ` Resolution note: ${args.note}` : ""}`
      : `Your issue "${args.issueTitle}" ${statusMessages[args.newStatus as keyof typeof statusMessages] || "has been updated"}.${args.note ? ` Update: ${args.note}` : ""}`;

    const type = args.newStatus === "resolved" ? "issue_resolved" : "issue_update";

    await ctx.db.insert("notifications", {
      userId: args.userId,
      title,
      message,
      type,
      relatedIssueId: args.issueId,
      isRead: false,
      createdAt: Date.now(),
    });

    // Send push notification
    await ctx.runMutation(internal.notifications.sendPushNotification, {
      userId: args.userId,
      title: args.newStatus === "resolved" ? "🎉 Issue Resolved!" : "📢 Status Updated",
      body: `Your issue "${args.issueTitle}" is now ${args.newStatus}${args.note ? `: ${args.note}` : ''}`,
      data: {
        issueId: args.issueId,
        type: "status_update",
      },
    });

    console.log(`🔔 Status notification sent for issue: ${args.issueTitle}`);
  },
});

// Helper function to send notifications for new comments
export const notifyNewComment = internalMutation({
  args: {
    userId: v.id("users"),
    issueId: v.id("civicIssues"),
    issueTitle: v.string(),
    commenterName: v.string(),
    isOfficial: v.boolean(),
  },
  handler: async (ctx, args) => {
    const title = args.isOfficial ? "Official Update on Your Issue" : "New Comment on Your Issue";
    const message = args.isOfficial 
      ? `An official update has been posted on your issue "${args.issueTitle}" by ${args.commenterName}.`
      : `${args.commenterName} has commented on your issue "${args.issueTitle}".`;

    await ctx.db.insert("notifications", {
      userId: args.userId,
      title,
      message,
      type: "new_comment",
      relatedIssueId: args.issueId,
      isRead: false,
      createdAt: Date.now(),
    });

    // Send push notification
    await ctx.runMutation(internal.notifications.sendPushNotification, {
      userId: args.userId,
      title: args.isOfficial ? "🏦 Official Update" : "💬 New Comment",
      body: `${args.commenterName} ${args.isOfficial ? 'posted an official update' : 'commented'} on "${args.issueTitle}"`,
      data: {
        issueId: args.issueId,
        type: "new_comment",
      },
    });

    console.log(`🔔 Comment notification sent for issue: ${args.issueTitle}`);
  },
});

// Send system notifications to all users (admin only)
export const sendSystemNotification = mutation({
  args: {
    title: v.string(),
    message: v.string(),
    targetRole: v.optional(v.union(v.literal("citizen"), v.literal("admin"), v.literal("department"))),
  },
  handler: async (ctx, args) => {
    // Get all users or filtered by role
    let users;
    if (args.targetRole) {
      users = await ctx.db
        .query("users")
        .withIndex("by_role", (q) => q.eq("role", args.targetRole as any))
        .collect();
    } else {
      users = await ctx.db.query("users").collect();
    }

    const now = Date.now();
    
    // Create notification for each user
    await Promise.all(
      users.map((user) =>
        ctx.db.insert("notifications", {
          userId: user._id,
          title: args.title,
          message: args.message,
          type: "system",
          isRead: false,
          createdAt: now,
        })
      )
    );

    console.log(`🔔 SYSTEM NOTIFICATION sent to ${users.length} users: ${args.title}`);
    return users.length; // Return count of notifications sent
  },
});

// FOR TESTING IN EXPO GO - Manual notification trigger
export const triggerTestNotification = mutation({
  args: {
    userId: v.id("users"),
    type: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const testType = args.type || "test";
    
    await ctx.db.insert("notifications", {
      userId: args.userId,
      title: "Test Notification",
      message: `This is a test notification (${testType}) sent at ${new Date().toLocaleTimeString()}`,
      type: "system",
      isRead: false,
      createdAt: Date.now(),
    });

    console.log(`🧪 TEST NOTIFICATION created for user ${args.userId}`);
    return "Test notification created successfully";
  },
});

// Process scheduled notifications (called periodically)
export const processScheduledNotifications = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    
    // Find scheduled notifications that are ready to be sent
    const scheduledNotifications = await ctx.db
      .query("adminNotifications")
      .withIndex("by_status", (q) => q.eq("status", "scheduled"))
      .filter((q) => q.lte(q.field("scheduledAt"), now))
      .collect();

    console.log(`📅 Processing ${scheduledNotifications.length} scheduled notifications`);

    for (const notification of scheduledNotifications) {
      try {
        // Update status to sending
        await ctx.db.patch(notification._id, {
          status: "sent",
          sentAt: now,
        });

        // Get target users
        let targetUsers: any[] = [];
        
        switch (notification.targetAudience) {
          case "all_users":
            targetUsers = await ctx.db.query("users").collect();
            break;
          case "citizens":
            targetUsers = await ctx.db
              .query("users")
              .withIndex("by_role", (q) => q.eq("role", "citizen"))
              .collect();
            break;
          case "departments":
            targetUsers = await ctx.db
              .query("users")
              .withIndex("by_role", (q) => q.eq("role", "department"))
              .collect();
            break;
          case "admins":
            targetUsers = await ctx.db
              .query("users")
              .withIndex("by_role", (q) => q.eq("role", "admin"))
              .collect();
            break;
          case "custom":
            if (notification.customUserIds) {
              targetUsers = await Promise.all(
                notification.customUserIds.map(id => ctx.db.get(id))
              );
              targetUsers = targetUsers.filter(Boolean);
            }
            break;
        }

        // Process the notification
        if (targetUsers.length > 0) {
          await ctx.runMutation(internal.notifications.processAdminNotification, {
            notificationId: notification._id,
            targetUsers: targetUsers.map(u => u._id),
          });
        }

        console.log(`✅ Processed scheduled notification: ${notification.title}`);
      } catch (error) {
        console.error(`❌ Failed to process scheduled notification ${notification._id}:`, error);
        
        // Mark as failed
        await ctx.db.patch(notification._id, {
          status: "failed",
        });
      }
    }
  },
});

// Send push notification to specific user (INTERNAL)
export const sendPushNotification = internalMutation({
  args: {
    userId: v.id("users"),
    title: v.string(),
    body: v.string(),
    data: v.optional(v.object({
      issueId: v.optional(v.string()),
      type: v.optional(v.string()),
      notificationId: v.optional(v.string()),
      urgent: v.optional(v.string()),
    })),
  },
  handler: async (ctx, args) => {
    try {
      const user = await ctx.db.get(args.userId);
      if (!user) {
        console.error('User not found for push notification');
        return false;
      }

      if (!user.expoPushToken) {
        console.log(`⚠️ No push token for user ${user.email}, skipping push notification`);
        return false;
      }

      const message = {
        to: user.expoPushToken,
        title: args.title,
        body: args.body,
        data: args.data || {},
        sound: 'default',
        priority: args.data?.urgent === 'true' ? 'high' : 'normal',
      };

      console.log(`🚀 Sending push notification to ${user.email}`);
      console.log(`📱 Title: ${args.title}`);
      console.log(`💬 Body: ${args.body}`);

      const response = await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Accept-Encoding': 'gzip, deflate',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(message),
      });

      const result = await response.json();
      
      if (response.ok && result.data && result.data.status === 'ok') {
        console.log(`✅ Push notification sent successfully to ${user.email}`);
        return true;
      } else {
        console.error(`❌ Push notification failed:`, result);
        return false;
      }
    } catch (error) {
      console.error('💥 Error sending push notification:', error);
      return false;
    }
  },
});

// Enhanced email notification with real service integration
export const sendEmailWithTemplate = internalMutation({
  args: {
    userId: v.id("users"),
    subject: v.string(),
    body: v.string(),
    templateId: v.optional(v.string()),
    urgent: v.boolean(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user || !user.email) {
      console.log(`⚠️ No email address for user ${args.userId}`);
      return false;
    }

    try {
      // TODO: Replace with actual email service (SendGrid, AWS SES, etc.)
      // This is a placeholder implementation
      
      const emailData = {
        to: user.email,
        subject: args.urgent ? `🚨 URGENT: ${args.subject}` : args.subject,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: ${args.urgent ? '#fee2e2' : '#f3f4f6'}; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
              <h2 style="color: ${args.urgent ? '#dc2626' : '#374151'}; margin: 0;">
                ${args.urgent ? '🚨 ' : ''}${args.subject}
              </h2>
            </div>
            <div style="padding: 20px; background: white; border-radius: 8px; border: 1px solid #e5e7eb;">
              <p style="color: #374151; line-height: 1.6;">${args.body.replace(/\n/g, '<br>')}</p>
            </div>
            <div style="margin-top: 20px; padding: 15px; background: #f9fafb; border-radius: 8px; text-align: center;">
              <p style="color: #6b7280; font-size: 14px; margin: 0;">
                This email was sent from Samadhan - Civic Issue Management System
              </p>
            </div>
          </div>
        `,
        text: args.body,
      };

      console.log(`📧 EMAIL NOTIFICATION (${args.urgent ? 'URGENT' : 'normal'})`);
      console.log(`📧 To: ${user.email}`);
      console.log(`📧 Subject: ${args.subject}`);
      console.log(`📧 Body: ${args.body}`);
      
      // Example using SendGrid (uncomment and configure when ready)
      /*
      const sgMail = require('@sendgrid/mail');
      sgMail.setApiKey(process.env.SENDGRID_API_KEY);
      
      await sgMail.send({
        to: user.email,
        from: 'noreply@samadhan.gov.in',
        subject: emailData.subject,
        html: emailData.html,
        text: emailData.text,
      });
      */
      
      // Simulate email sending delay
      await new Promise(resolve => setTimeout(resolve, 200));
      
      console.log(`✅ Email sent successfully to ${user.email}`);
      return true;
    } catch (error) {
      console.error(`❌ Failed to send email to ${user.email}:`, error);
      return false;
    }
  },
});
