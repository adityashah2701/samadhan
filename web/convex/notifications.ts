import { v } from "convex/values";
import { internalMutation, mutation, query } from "./_generated/server";
import { internal } from "./_generated/api";

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

    // Also send a local notification immediately for testing in Expo Go
    // This will be visible in the app's notification screen
    console.log(`🔔 NOTIFICATION: ${title} - ${message}`);
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

    // Log for testing in Expo Go
    console.log(`🔔 NOTIFICATION: ${title} - ${message}`);
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
