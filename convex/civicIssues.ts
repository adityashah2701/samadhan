import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";
import { getCategoryDepartment } from "./constants/categoryDepartmentMapping";

// Create a new civic issue report with automatic department assignment
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
    images: v.optional(v.array(v.id("_storage"))), 
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    // Get the appropriate department for this category
    const departmentName = getCategoryDepartment(args.category);
    let assignedToDepartment: Id<"departments"> | undefined = undefined;
    let initialStatus: "pending" | "acknowledged" = "pending";

    if (departmentName) {
      // Find the department by name
      const department = await ctx.db
        .query("departments")
        .withIndex("by_name", (q) => q.eq("name", departmentName))
        .first();
      
      if (department && department.isActive) {
        assignedToDepartment = department._id;
        initialStatus = "acknowledged"; // Auto-acknowledge when assigned to department
      }
    }

    const issueData = {
      reportedBy: args.reportedBy,
      title: args.title,
      description: args.description,
      category: args.category,
      subcategory: args.subcategory,
      location: args.location,
      priority: args.priority,
      images: args.images,
      status: initialStatus,
      assignedToDepartment: assignedToDepartment, // No need to convert now
      assignedBy: assignedToDepartment ? args.reportedBy : undefined, // Auto-assigned by system
      assignedAt: assignedToDepartment ? now : undefined,
      upvotes: 0,
      upvotedBy: [],
      viewCount: 0,
      createdAt: now,
      updatedAt: now,
    };

    const issueId = await ctx.db.insert("civicIssues", issueData);

    // Create initial status update
    await ctx.db.insert("statusUpdates", {
      issueId,
      updatedBy: args.reportedBy,
      previousStatus: "",
      newStatus: initialStatus,
      note: assignedToDepartment 
        ? `Issue automatically assigned to ${departmentName}`
        : "Issue reported",
      isPublic: true,
      createdAt: now,
    });

    // If department was assigned, create assignment status update
    if (assignedToDepartment) {
      await ctx.db.insert("statusUpdates", {
        issueId,
        updatedBy: args.reportedBy, // System assignment
        previousStatus: "pending",
        newStatus: "acknowledged", 
        note: `Automatically assigned to ${departmentName} based on category: ${args.category}`,
        isPublic: true,
        createdAt: now + 1, // Slightly later timestamp
      });
    }

    // Generate issue tracking number
    const issueNumber = `SMD-${issueId.slice(-6).toUpperCase()}`;

    // Send notification to user about successful issue creation
    await ctx.runMutation(internal.notifications.notifyIssueCreated, {
      userId: args.reportedBy,
      issueId,
      issueTitle: args.title,
      issueNumber,
    });

    // Send push notification for successful issue creation
    const notificationTitle = assignedToDepartment 
      ? "✅ Issue Assigned Successfully"
      : "✅ Issue Reported Successfully";
    
    const notificationBody = assignedToDepartment
      ? `Your issue "${args.title}" has been assigned to ${departmentName}. Tracking ID: ${issueNumber}`
      : `Your issue "${args.title}" has been submitted. Tracking ID: ${issueNumber}`;

    await ctx.runMutation(internal.notifications.sendPushNotification, {
      userId: args.reportedBy,
      title: notificationTitle,
      body: notificationBody,
      data: {
        issueId,
        type: "issue_created",
      },
    });

    return {
      issueId,
      assignedDepartment: departmentName,
      status: initialStatus,
      issueNumber
    };
  },
});
// Get all issues with filters
// Updated getIssues query - generate imageUrls dynamically
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

    // Get reporter details and generate image URLs for each issue
    const issuesWithDetails = await Promise.all(
      issues.map(async (issue) => {
        const reporter = await ctx.db.get(issue.reportedBy);
        
        // Get department info if assigned
        let assignedDepartment = null;
        if (issue.assignedToDepartment) {
          assignedDepartment = await ctx.db.get(issue.assignedToDepartment);
        }
        
        // Generate image URLs from storage IDs
        let imageUrls: string[] = [];
        if (issue.images && issue.images.length > 0) {
          imageUrls = await Promise.all(
            issue.images.map(async (storageId) => {
              const url = await ctx.storage.getUrl(storageId);
              return url || "";
            })
          );
          // Filter out empty URLs
          imageUrls = imageUrls.filter(url => url !== "");
        }
        
        return {
          ...issue,
          imageUrls, // Add the generated URLs
          assignedDepartment: assignedDepartment ? {
            _id: assignedDepartment._id,
            name: assignedDepartment.name,
            description: assignedDepartment.description,
            headOfDepartment: assignedDepartment.headOfDepartment,
            contactEmail: assignedDepartment.contactEmail,
            isActive: assignedDepartment.isActive
          } : null,
          reporter: reporter ? {
            firstName: reporter.firstName,
            lastName: reporter.lastName,
            imageUrl: reporter.imageUrl,
          } : null,
        };
      })
    );

    return issuesWithDetails;
  },
});

// Get the department that will be assigned for a given category
export const getCategoryDepartmentMapping = query({
  args: { category: v.string() },
  handler: async (ctx, args) => {
    const departmentName = getCategoryDepartment(args.category);
    
    if (!departmentName) {
      return null;
    }

    // Find the actual department record
    const department = await ctx.db
      .query("departments")
      .withIndex("by_name", (q) => q.eq("name", departmentName))
      .first();
    
    return department ? {
      departmentId: department._id,
      departmentName: department.name,
      description: department.description,
      headOfDepartment: department.headOfDepartment,
      contactEmail: department.contactEmail,
      contactPhone: department.contactPhone,
      isActive: department.isActive
    } : null;
  },
});

// Get all category-department mappings
export const getAllCategoryDepartmentMappings = query({
  args: {},
  handler: async (ctx) => {
    const mappings = [];
    const categories = Object.keys({
      "Infrastructure": "Public Works Department",
      "Roads": "Public Works Department", 
      "Water Supply": "Water Resources Department",
      "Sanitation": "Health & Sanitation Department",
      "Electricity": "Electricity Board",
      "Public Transport": "Transport Department",
      "Parks & Recreation": "Parks & Recreation Department",
      "Waste Management": "Waste Management Department",
      "Street Lighting": "Municipal Corporation", 
      "Drainage": "Water Resources Department",
      "Other": "General Administration"
    });
    
    for (const category of categories) {
      const departmentName = getCategoryDepartment(category);
      if (departmentName) {
        const department = await ctx.db
          .query("departments")
          .withIndex("by_name", (q) => q.eq("name", departmentName))
          .first();
        
        if (department) {
          mappings.push({
            category,
            departmentId: department._id,
            departmentName: department.name,
            isActive: department.isActive
          });
        }
      }
    }
    
    return mappings;
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

    // Generate image URLs from storage IDs
    let imageUrls: string[] = [];
    if (issue.images && issue.images.length > 0) {
      imageUrls = await Promise.all(
        issue.images.map(async (storageId) => {
          const url = await ctx.storage.getUrl(storageId);
          return url || "";
        })
      );
      // Filter out empty URLs
      imageUrls = imageUrls.filter(url => url !== "");
    }

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
      imageUrls, // Add the generated URLs
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

    // Send notification to issue reporter about status change
    await ctx.runMutation(internal.notifications.notifyStatusUpdate, {
      userId: issue.reportedBy,
      issueId: args.issueId,
      issueTitle: issue.title,
      previousStatus: issue.status,
      newStatus: args.newStatus,
      note: args.note,
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

    // Get issue details for notification
    const issue = await ctx.db.get(args.issueId);
    if (issue) {
      // Get commenter details
      const commenter = await ctx.db.get(args.userId);
      const commenterName = commenter ? 
        `${commenter.firstName || ''} ${commenter.lastName || ''}`.trim() || 'Someone' :
        'Someone';

      // Only notify the issue reporter if the commenter is not the same person
      if (issue.reportedBy !== args.userId) {
        await ctx.runMutation(internal.notifications.notifyNewComment, {
          userId: issue.reportedBy,
          issueId: args.issueId,
          issueTitle: issue.title,
          commenterName,
          isOfficial: args.isOfficial,
        });
      }
    }

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
