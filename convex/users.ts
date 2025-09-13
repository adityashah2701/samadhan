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
