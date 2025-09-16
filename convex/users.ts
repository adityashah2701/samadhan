import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Create or update user in Convex when they sign up/sign in
export const createOrUpdateUser = mutation({
  args: {
    clerkId: v.string(),
    email: v.string(),
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
    provider: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .first();

    const now = Date.now();

    if (existingUser) {
      // Update existing user
      await ctx.db.patch(existingUser._id, {
        email: args.email,
        firstName: args.firstName,
        lastName: args.lastName,
        imageUrl: args.imageUrl,
        provider: args.provider,
        updatedAt: now,
      });
      return existingUser._id;
    } else {
      // Create new user with default citizen role
      const userId = await ctx.db.insert("users", {
        clerkId: args.clerkId,
        email: args.email,
        firstName: args.firstName,
        lastName: args.lastName,
        imageUrl: args.imageUrl,
        provider: args.provider,
        role: "citizen",
        createdAt: now,
        updatedAt: now,
      });
      return userId;
    }
  },
});

// Update user profile
export const updateUserProfile = mutation({
  args: {
    clerkId: v.string(),
    phone: v.optional(v.string()),
    address: v.optional(v.string()),
    city: v.optional(v.string()),
    district: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .first();
    
    if (!user) {
      throw new Error("User not found");
    }

    await ctx.db.patch(user._id, {
      phone: args.phone,
      address: args.address,
      city: args.city,
      district: args.district,
      updatedAt: Date.now(),
    });
  },
});

// Get user by Clerk ID
export const getUserByClerkId = query({
  args: { clerkId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .first();
  },
});

// Get user with issue counts
export const getUserWithStats = query({
  args: { clerkId: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .first();

    if (!user) return null;

    // Get user's issue counts
    const allIssues = await ctx.db
      .query("civicIssues")
      .withIndex("by_reporter", (q) => q.eq("reportedBy", user._id))
      .collect();

    const pendingCount = allIssues.filter(issue => issue.status === "pending").length;
    const resolvedCount = allIssues.filter(issue => issue.status === "resolved").length;
    const totalCount = allIssues.length;

    return {
      ...user,
      stats: {
        totalIssues: totalCount,
        pendingIssues: pendingCount,
        resolvedIssues: resolvedCount,
      }
    };
  },
});

// Get all users (for admin)
export const getAllUsers = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("users").collect();
  },
});

// Get users by role
export const getUsersByRole = query({
  args: { role: v.union(v.literal("citizen"), v.literal("admin"), v.literal("department")) },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("users")
      .withIndex("by_role", (q) => q.eq("role", args.role))
      .collect();
  },
});

// Get user statistics for admin dashboard
export const getUserStatistics = query({
  args: {},
  handler: async (ctx) => {
    const allUsers = await ctx.db.query("users").collect();
    
    const stats = {
      total: allUsers.length,
      citizens: allUsers.filter(u => u.role === "citizen").length,
      departments: allUsers.filter(u => u.role === "department").length,
      admins: allUsers.filter(u => u.role === "admin").length,
      withPushTokens: allUsers.filter(u => u.expoPushToken).length,
      recentRegistrations: allUsers.filter(u => u.createdAt > Date.now() - 7 * 24 * 60 * 60 * 1000).length
    };
    
    return stats;
  },
});

// Update user role (admin only)
export const updateUserRole = mutation({
  args: {
    userId: v.id("users"),
    newRole: v.union(v.literal("citizen"), v.literal("admin"), v.literal("department")),
    updatedBy: v.id("users")
  },
  handler: async (ctx, args) => {
    // Verify updater is admin
    const updater = await ctx.db.get(args.updatedBy);
    if (!updater || updater.role !== "admin") {
      throw new Error("Only administrators can update user roles");
    }

    await ctx.db.patch(args.userId, {
      role: args.newRole,
      updatedAt: Date.now(),
    });

    console.log(`👤 User role updated to ${args.newRole}`);
    return true;
  },
});

// Update user's Expo push token
export const updateUserPushToken = mutation({
  args: {
    clerkId: v.string(),
    expoPushToken: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_clerk_id", (q) => q.eq("clerkId", args.clerkId))
      .first();
    
    if (!user) {
      throw new Error("User not found");
    }

    await ctx.db.patch(user._id, {
      expoPushToken: args.expoPushToken,
      updatedAt: Date.now(),
    });

    console.log(`🔔 Updated push token for user: ${user.email}`);
    return true;
  },
});
