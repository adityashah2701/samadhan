import { ClerkProvider, useAuth } from "@clerk/clerk-expo";
import { ConvexReactClient } from "convex/react";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import * as SecureStore from "expo-secure-store";
import { Slot } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import { View } from "react-native";
import ErrorBoundary from "./components/ErrorBoundary";
import NotificationProvider from "./components/NotificationProvider";
import FloatingChatButton from "./components/FloatingChatButton";
import { Platform } from "react-native";
// Warm up the android browser to improve performance
if (Platform.OS === "web") {
  WebBrowser.warmUpAsync();
}

// Initialize Convex client
const convex = new ConvexReactClient(process.env.EXPO_PUBLIC_CONVEX_URL!, {
  unsavedChangesWarning: false,
});

// Create a custom token cache
const tokenCache = {
  async getToken(key: string) {
    try {
      return SecureStore.getItemAsync(key);
    } catch (err) {
      return null;
    }
  },
  async saveToken(key: string, value: string) {
    try {
      return SecureStore.setItemAsync(key, value);
    } catch (err) {
      return;
    }
  },
  async clearToken(key: string) {
    try {
      return SecureStore.deleteItemAsync(key);
    } catch (err) {
      return;
    }
  },
};

export default function RootLayout() {
  return (
    <ErrorBoundary>
      <ClerkProvider
        publishableKey={process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY!}
        tokenCache={tokenCache}
        telemetry={false}
      >
        <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
          <NotificationProvider>
            <View style={{ flex: 1 }}>
              <Slot />
              <FloatingChatButton />
            </View>
          </NotificationProvider>
        </ConvexProviderWithClerk>
      </ClerkProvider>
    </ErrorBoundary>
  );
}
