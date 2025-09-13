import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    // Clerk user ID (primary identifier)
    clerkId: v.string(),
    
    // Basic user information
    email: v.string(),
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
    
    // OAuth provider information
    provider: v.optional(v.string()), // "email" | "google"
    
    // User role for civic platform
    role: v.union(v.literal("citizen"), v.literal("admin"), v.literal("department")),
    
    // User profile for civic platform
    phone: v.optional(v.string()),
    address: v.optional(v.string()),
    city: v.optional(v.string()),
    district: v.optional(v.string()),
    
    // Timestamps
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_clerk_id", ["clerkId"])
    .index("by_email", ["email"])
    .index("by_role", ["role"]),

  departments: defineTable({
    name: v.string(),
    description: v.optional(v.string()),
    category: v.string(), // "Infrastructure", "Water", "Roads", etc.
    contactEmail: v.optional(v.string()),
    contactPhone: v.optional(v.string()),
    headOfficerName: v.optional(v.string()),
    isActive: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_name", ["name"])
    .index("by_category", ["category"])
    .index("by_active", ["isActive"]),

  civicIssues: defineTable({
    // User who reported the issue
    reportedBy: v.id("users"),
    
    // Issue details
    title: v.string(),
    description: v.string(),
    category: v.string(), // "Infrastructure", "Roads", "Water", "Sanitation", etc.
    subcategory: v.optional(v.string()),
    
    // Location information
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
    
    // Media attachments
    images: v.optional(v.array(v.id("_storage"))), // Convex file storage IDs
    imageUrls: v.optional(v.array(v.string())), // Fallback URLs for backward compatibility
    
    // Issue status and priority
    status: v.union(
      v.literal("pending"),
      v.literal("acknowledged"),
      v.literal("in_progress"),
      v.literal("resolved"),
      v.literal("rejected")
    ),
    priority: v.union(
      v.literal("low"),
      v.literal("medium"),
      v.literal("high"),
      v.literal("urgent")
    ),
    
    // Department assignment
    assignedDepartment: v.optional(v.id("departments")),
    assignedOfficer: v.optional(v.id("users")),
    
    // Engagement metrics
    upvotes: v.number(),
    upvotedBy: v.array(v.id("users")),
    viewCount: v.number(),
    
    // Resolution details
    resolutionNote: v.optional(v.string()),
    resolutionImages: v.optional(v.array(v.string())),
    resolvedAt: v.optional(v.number()),
    
    // Timestamps
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_reporter", ["reportedBy"])
    .index("by_status", ["status"])
    .index("by_category", ["category"])
    .index("by_department", ["assignedDepartment"])
    .index("by_location", ["location.city", "location.district"])
    .index("by_priority", ["priority"])
    .index("by_created", ["createdAt"]),

  statusUpdates: defineTable({
    issueId: v.id("civicIssues"),
    updatedBy: v.id("users"),
    previousStatus: v.string(),
    newStatus: v.string(),
    note: v.optional(v.string()),
    isPublic: v.boolean(), // Whether citizens can see this update
    createdAt: v.number(),
  }).index("by_issue", ["issueId"]),

  comments: defineTable({
    issueId: v.id("civicIssues"),
    userId: v.id("users"),
    content: v.string(),
    isOfficial: v.boolean(), // Whether this is from department/admin
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_issue", ["issueId"])
    .index("by_user", ["userId"]),

  notifications: defineTable({
    userId: v.id("users"),
    title: v.string(),
    message: v.string(),
    type: v.union(
      v.literal("issue_update"),
      v.literal("issue_resolved"),
      v.literal("new_comment"),
      v.literal("system")
    ),
    relatedIssueId: v.optional(v.id("civicIssues")),
    isRead: v.boolean(),
    createdAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_read", ["isRead"]),
});
