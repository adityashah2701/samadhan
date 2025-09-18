import { Slot } from 'expo-router';
import { ClerkProvider } from '@clerk/clerk-expo';
import { ConvexProvider, ConvexReactClient } from 'convex/react';
import Constants from 'expo-constants';
import  NotificationProvider from './components/NotificationProvider';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import createTokenCache from '@/utils/tokenCache';

const convex = new ConvexReactClient(process.env.EXPO_PUBLIC_CONVEX_URL!);

export default function RootLayout() {
  return (
  <ClerkProvider 
      publishableKey={process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY!}
      tokenCache={createTokenCache()} // Add this prop
    >
      <ConvexProvider client={convex}>
        <SafeAreaProvider>
          <NotificationProvider>
            <Slot />
          </NotificationProvider>
        </SafeAreaProvider>
      </ConvexProvider>
    </ClerkProvider>
  );
}