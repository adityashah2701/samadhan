import { Stack } from 'expo-router'
import { View } from 'react-native'

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
