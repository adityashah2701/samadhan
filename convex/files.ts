import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Generate upload URL for file storage
export const generateUploadUrl = mutation(async (ctx) => {
  return await ctx.storage.generateUploadUrl();
});

// Get file URL for display
export const getFileUrl = query({
  args: { storageId: v.id("_storage") },
  handler: async (ctx, args) => {
    return await ctx.storage.getUrl(args.storageId);
  },
});

// Get multiple file URLs
export const getFileUrls = query({
  args: { storageIds: v.array(v.id("_storage")) },
  handler: async (ctx, args) => {
    const urls = await Promise.all(
      args.storageIds.map(async (id) => {
        const url = await ctx.storage.getUrl(id);
        return { storageId: id, url };
      })
    );
    return urls;
  },
});
