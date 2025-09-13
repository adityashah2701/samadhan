import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Get all departments
export const getDepartments = query({
  handler: async (ctx) => {
    return await ctx.db.query("departments").collect();
  },
});

// Create a new department
export const createDepartment = mutation({
  args: {
    name: v.string(),
    description: v.string(),
    headOfDepartment: v.optional(v.string()),
    contactEmail: v.optional(v.string()),
    contactPhone: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("departments", {
      name: args.name,
      description: args.description,
      headOfDepartment: args.headOfDepartment,
      contactEmail: args.contactEmail,
      contactPhone: args.contactPhone,
      createdAt: Date.now(),
      isActive: true,
    });
  },
});

// Update department
export const updateDepartment = mutation({
  args: {
    departmentId: v.id("departments"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    headOfDepartment: v.optional(v.string()),
    contactEmail: v.optional(v.string()),
    contactPhone: v.optional(v.string()),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { departmentId, ...updates } = args;
    return await ctx.db.patch(departmentId, {
      ...updates,
      updatedAt: Date.now(),
    });
  },
});

// Delete department
export const deleteDepartment = mutation({
  args: {
    departmentId: v.id("departments"),
  },
  handler: async (ctx, args) => {
    return await ctx.db.delete(args.departmentId);
  },
});

export const assignIssueToDepartment = mutation({
  args: {
    issueId: v.id("civicIssues"),
    departmentId: v.id("departments"),
    assignedBy: v.id("users"),
    note: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const issue = await ctx.db.get(args.issueId);

    if (!issue) {
      throw new Error("Issue not found.");
    }
    
    // Fix: Explicitly declare the literal type for newStatus
    const newStatus: "acknowledged" = "acknowledged"; 

    // Prepare all updates to be patched on the issue document
    const updates = {
      assignedToDepartment: args.departmentId,
      assignedBy: args.assignedBy,
      assignedAt: Date.now(),
      status: newStatus,
      updatedAt: Date.now(),
    };

    // Patch the issue document with all changes at once
    await ctx.db.patch(args.issueId, updates);

    return { success: true };
  },
});