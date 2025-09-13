import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    clerkId: v.string(),
    email: v.string(),
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    imageUrl: v.optional(v.string()),
    provider: v.optional(v.string()),
    role: v.union(v.literal("citizen"), v.literal("admin"), v.literal("department")),
    phone: v.optional(v.string()),
    address: v.optional(v.string()),
    city: v.optional(v.string()),
    district: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_clerk_id", ["clerkId"])
    .index("by_email", ["email"])
    .index("by_role", ["role"]),

  departments: defineTable({
    name: v.string(),
    description: v.string(),
    headOfDepartment: v.optional(v.string()),
    contactEmail: v.optional(v.string()),
    contactPhone: v.optional(v.string()),
    isActive: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.optional(v.number()),
  })
    .index("by_name", ["name"])
    .index("by_active", ["isActive"]),

  civicIssues: defineTable({
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
    images: v.optional(v.array(v.id("_storage"))),
    imageUrls: v.optional(v.array(v.string())),
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
    assignedToDepartment: v.optional(v.id("departments")),
    assignedBy: v.optional(v.id("users")),
    assignedAt: v.optional(v.number()),
    upvotes: v.number(),
    upvotedBy: v.array(v.id("users")),
    viewCount: v.number(),
    resolutionNote: v.optional(v.string()),
    resolutionImages: v.optional(v.array(v.string())),
    resolvedAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_reporter", ["reportedBy"])
    .index("by_status", ["status"])
    .index("by_category", ["category"])
    .index("by_department", ["assignedToDepartment"])
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
