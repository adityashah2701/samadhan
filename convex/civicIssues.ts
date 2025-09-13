import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Create a new civic issue report with file upload support
export const createIssue = mutation({
  args: {
    reportedBy: v.id("users"),
    title: v.string(),
    description: v.string(),
    category: v.string(),
    subcategory: v.optional(v.string()),
    location: v.object({
      address: v.string(),
      city: v.string(),
      district: v.string(),
      pincode: v.optional(v.string()),
      landmark: v.optional(v.string()),
      coordinates: v.optional(v.object({
        lat: v.number(),
        lng: v.number(),
      })),
    }),
    priority: v.union(
      v.literal("low"),
      v.literal("medium"),
      v.literal("high"),
      v.literal("urgent")
    ),
    images: v.optional(v.array(v.id("_storage"))), // File storage IDs
    imageUrls: v.optional(v.array(v.string())), // Fallback URLs
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    
    const issueId = await ctx.db.insert("civicIssues", {
      ...args,
      status: "pending",
      upvotes: 0,
      upvotedBy: [],
      viewCount: 0,
      createdAt: now,
      updatedAt: now,
    });

    // Create initial status update
    await ctx.db.insert("statusUpdates", {
      issueId,
      updatedBy: args.reportedBy,
      previousStatus: "",
      newStatus: "pending",
      note: "Issue reported",
      isPublic: true,
      createdAt: now,
    });

    return issueId;
  },
});

// Get all issues with filters
export const getIssues = query({
  args: {
    status: v.optional(v.string()),
    category: v.optional(v.string()),
    city: v.optional(v.string()),
    district: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    let query;
     query = ctx.db.query("civicIssues");

    if (args.status) {
      query = query.withIndex("by_status", (q) => q.eq("status", args.status as any));
    } else if (args.category) {
      query = query.withIndex("by_category", (q) => q.eq("category", args.category!));
    } else {
      query = query.withIndex("by_created");
    }

    let issues = await query.order("desc").take(args.limit || 50);

    // Filter by location if specified
    if (args.city || args.district) {
      issues = issues.filter(issue => {
        if (args.city && issue.location.city !== args.city) return false;
        if (args.district && issue.location.district !== args.district) return false;
        return true;
      });
    }

    // Get reporter details for each issue
    const issuesWithReporter = await Promise.all(
      issues.map(async (issue) => {
        const reporter = await ctx.db.get(issue.reportedBy);
        return {
          ...issue,
          reporter: reporter ? {
            firstName: reporter.firstName,
            lastName: reporter.lastName,
            imageUrl: reporter.imageUrl,
          } : null,
        };
      })
    );

    return issuesWithReporter;
  },
});

// Get issues by user
export const getUserIssues = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("civicIssues")
      .withIndex("by_reporter", (q) => q.eq("reportedBy", args.userId))
      .order("desc")
      .collect();
  },
});

// Get single issue with details
export const getIssueById = query({
  args: { issueId: v.id("civicIssues") },
  handler: async (ctx, args) => {
    const issue = await ctx.db.get(args.issueId);
    if (!issue) return null;

    // Get reporter details
    const reporter = await ctx.db.get(issue.reportedBy);
    
    // Get status updates
    const statusUpdates = await ctx.db
      .query("statusUpdates")
      .withIndex("by_issue", (q) => q.eq("issueId", args.issueId))
      .order("desc")
      .collect();

    // Get comments
    const comments = await ctx.db
      .query("comments")
      .withIndex("by_issue", (q) => q.eq("issueId", args.issueId))
      .order("asc")
      .collect();

    // Get commenter details
    const commentsWithUser = await Promise.all(
      comments.map(async (comment) => {
        const user = await ctx.db.get(comment.userId);
        return {
          ...comment,
          user: user ? {
            firstName: user.firstName,
            lastName: user.lastName,
            imageUrl: user.imageUrl,
            role: user.role,
          } : null,
        };
      })
    );

    return {
      ...issue,
      reporter: reporter ? {
        firstName: reporter.firstName,
        lastName: reporter.lastName,
        imageUrl: reporter.imageUrl,
      } : null,
      statusUpdates,
      comments: commentsWithUser,
    };
  },
});

// Upvote/downvote an issue
export const toggleUpvote = mutation({
  args: {
    issueId: v.id("civicIssues"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const issue = await ctx.db.get(args.issueId);
    if (!issue) throw new Error("Issue not found");

    const hasUpvoted = issue.upvotedBy.includes(args.userId);
    
    if (hasUpvoted) {
      // Remove upvote
      await ctx.db.patch(args.issueId, {
        upvotes: issue.upvotes - 1,
        upvotedBy: issue.upvotedBy.filter(id => id !== args.userId),
        updatedAt: Date.now(),
      });
    } else {
      // Add upvote
      await ctx.db.patch(args.issueId, {
        upvotes: issue.upvotes + 1,
        upvotedBy: [...issue.upvotedBy, args.userId],
        updatedAt: Date.now(),
      });
    }

    return !hasUpvoted;
  },
});

// Update issue status (admin/department only)
export const updateIssueStatus = mutation({
  args: {
    issueId: v.id("civicIssues"),
    newStatus: v.union(
      v.literal("pending"),
      v.literal("acknowledged"),
      v.literal("in_progress"),
      v.literal("resolved"),
      v.literal("rejected")
    ),
    updatedBy: v.id("users"),
    note: v.optional(v.string()),
    resolutionNote: v.optional(v.string()),
    resolutionImages: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const issue = await ctx.db.get(args.issueId);
    if (!issue) throw new Error("Issue not found");

    const now = Date.now();
    const updateData: any = {
      status: args.newStatus,
      updatedAt: now,
    };

    if (args.newStatus === "resolved") {
      updateData.resolvedAt = now;
      if (args.resolutionNote) updateData.resolutionNote = args.resolutionNote;
      if (args.resolutionImages) updateData.resolutionImages = args.resolutionImages;
    }

    await ctx.db.patch(args.issueId, updateData);

    // Create status update record
    await ctx.db.insert("statusUpdates", {
      issueId: args.issueId,
      updatedBy: args.updatedBy,
      previousStatus: issue.status,
      newStatus: args.newStatus,
      note: args.note,
      isPublic: true,
      createdAt: now,
    });

    return true;
  },
});

// Add comment to issue
export const addComment = mutation({
  args: {
    issueId: v.id("civicIssues"),
    userId: v.id("users"),
    content: v.string(),
    isOfficial: v.boolean(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    
    const commentId = await ctx.db.insert("comments", {
      ...args,
      createdAt: now,
      updatedAt: now,
    });

    return commentId;
  },
});

// Get issue statistics
export const getIssueStats = query({
  args: {},
  handler: async (ctx) => {
    const allIssues = await ctx.db.query("civicIssues").collect();
    
    const stats = {
      total: allIssues.length,
      pending: allIssues.filter(i => i.status === "pending").length,
      acknowledged: allIssues.filter(i => i.status === "acknowledged").length,
      inProgress: allIssues.filter(i => i.status === "in_progress").length,
      resolved: allIssues.filter(i => i.status === "resolved").length,
      rejected: allIssues.filter(i => i.status === "rejected").length,
    };

    // Category wise breakdown
    const categoryStats = allIssues.reduce((acc, issue) => {
      acc[issue.category] = (acc[issue.category] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      ...stats,
      categories: categoryStats,
    };
  },
});

// Increment view count
export const incrementViewCount = mutation({
  args: { issueId: v.id("civicIssues") },
  handler: async (ctx, args) => {
    const issue = await ctx.db.get(args.issueId);
    if (!issue) return;

    await ctx.db.patch(args.issueId, {
      viewCount: issue.viewCount + 1,
    });
  },
});
