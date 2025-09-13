#!/bin/bash

# Samadhan - Simple Convex Sync Script
# Removes convex folders from mobile and web, then copies the main convex folder to both

set -e

echo "🔄 Syncing Convex folders..."

# 1. Remove mobile/convex folder
echo "📱 Removing mobile/convex..."
rm -rf ./mobile/convex

# 2. Remove web/convex folder  
echo "🌐 Removing web/convex..."
rm -rf ./web/convex

# 3. Copy convex to mobile
echo "📱 Copying convex to mobile..."
cp -r ./convex ./mobile/

# 4. Copy convex to web
echo "🌐 Copying convex to web..."
cp -r ./convex ./web/

echo "✅ Done! Convex folders synchronized."
