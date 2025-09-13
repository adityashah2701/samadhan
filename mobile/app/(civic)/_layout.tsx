import { Stack } from 'expo-router'

export default function CivicLayout() {
  return (
    <Stack 
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
      }} 
    />
  )
}
