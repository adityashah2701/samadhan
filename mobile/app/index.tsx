import { Redirect } from 'expo-router';
import { useUser } from '@clerk/clerk-expo';

export default function Index() {
  const { isSignedIn } = useUser();
  
  if (isSignedIn) {
    return <Redirect href="/(tabs)" />;
  }
  
  return <Redirect href="/(auth)/sign-in" />;
}