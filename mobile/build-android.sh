#!/bin/bash

# Android Build Script for Hackathon 2025 App
# This script will help you build your app for Android

echo "🚀 Starting Android build process..."

# Check if EAS CLI is installed
if ! command -v eas &> /dev/null; then
    echo "❌ EAS CLI not found. Installing..."
    npm install -g @expo/eas-cli
fi

# Check if you're logged in to Expo
echo "📱 Checking Expo authentication..."
eas whoami || {
    echo "🔐 Please log in to your Expo account:"
    eas login
}

# Install dependencies
echo "📦 Installing dependencies..."
npm install --force

# Build for preview (APK)
echo "🔨 Building APK for testing..."
eas build --platform android --profile preview

echo "✅ Build complete! Check your Expo dashboard for the download link."
echo "🔗 Visit: https://expo.dev/accounts/adityashah27/projects/internal-hackathon-2025/builds"
