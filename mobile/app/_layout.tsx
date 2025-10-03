import { Slot } from 'expo-router';
import { ClerkProvider } from '@clerk/clerk-expo';
import { ConvexProvider, ConvexReactClient } from 'convex/react';
import Constants from 'expo-constants';
import  NotificationProvider from './components/NotificationProvider';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import createTokenCache from '@/utils/tokenCache';
import ErrorBoundary from './components/ErrorBoundary';
import React, { useEffect } from 'react';

// Safely get environment variables with proper error handling
const convexUrl = process.env.EXPO_PUBLIC_CONVEX_URL || Constants.expoConfig?.extra?.EXPO_PUBLIC_CONVEX_URL;
const clerkKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY || Constants.expoConfig?.extra?.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY;

// Validate required environment variables
if (!convexUrl) {
  throw new Error('EXPO_PUBLIC_CONVEX_URL is not defined. Please check your app.json or .env.local file.');
}
if (!clerkKey) {
  throw new Error('EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY is not defined. Please check your app.json or .env.local file.');
}

console.log('🔧 Initializing app with:', { convexUrl, clerkKey: clerkKey.substring(0, 20) + '...' });

const convex = new ConvexReactClient(convexUrl);

export default function RootLayout() {
  // Add memory management
  useEffect(() => {
    return () => {
      // Cleanup on unmount
      if (global.gc) {
        global.gc();
      }
    };
  }, []);

  return (
    <ErrorBoundary>
      <ClerkProvider 
        publishableKey={clerkKey}
        tokenCache={createTokenCache()}
      >
        <ConvexProvider client={convex}>
          <SafeAreaProvider>
            <ErrorBoundary>
              <NotificationProvider>
                <Slot />
              </NotificationProvider>
            </ErrorBoundary>
          </SafeAreaProvider>
        </ConvexProvider>
      </ClerkProvider>
    </ErrorBoundary>
  );
}