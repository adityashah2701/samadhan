import { useUser } from '@clerk/clerk-expo'
import { Redirect } from 'expo-router'
import React, { useEffect, useState } from 'react'
import { ActivityIndicator, Animated, Image, StyleSheet, Text, View } from 'react-native'

export default function Index() {
  const { user, isLoaded } = useUser()
  const [fadeAnim] = useState(new Animated.Value(0))
  const [scaleAnim] = useState(new Animated.Value(0.8))
  const [loadingProgress] = useState(new Animated.Value(0))
  const [showContent, setShowContent] = useState(true)
  const [minimumLoadingComplete, setMinimumLoadingComplete] = useState(false)

  useEffect(() => {
    // Logo entrance animation
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 120,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start()

    // Progress bar animation (10 seconds)
    Animated.timing(loadingProgress, {
      toValue: 1,
      duration: 1000,
      useNativeDriver: false,
    }).start()

    // Set minimum loading time to 10 seconds
    const timer = setTimeout(() => {
      setMinimumLoadingComplete(true)
    }, 1000)

    return () => clearTimeout(timer)
  }, [])

  // Show splash screen if either auth is not loaded OR minimum loading time hasn't passed
  if (!isLoaded || !minimumLoadingComplete) {
    return (
      <View style={styles.container}>
        {/* Background gradient overlay */}
        <View style={styles.gradientOverlay} />
        
        {/* Animated particles background */}
        <View style={styles.particlesContainer}>
          {[...Array(6)].map((_, i) => (
            <Animated.View key={i} style={[styles.particle, { 
              left: `${Math.random() * 80 + 10}%`,
              top: `${Math.random() * 80 + 10}%`,
              animationDelay: `${Math.random() * 2}s`
            }]} />
          ))}
        </View>

        <Animated.View 
          style={[
            styles.logoContainer,
            {
              opacity: fadeAnim,
              transform: [{ scale: scaleAnim }]
            }
          ]}
        >
          {/* Logo with enhanced styling */}
          
            {/* <View style={styles.logoGlow} /> */}
            <Image source={require('../assets/logo.png')} style={styles.logoImage} />
         
          
          {/* App title with enhanced styling */}
          <Text style={styles.appTitle}>Samadhan</Text>
          <Text style={styles.appSubtitle}>Solutions at your fingertips</Text>
          
          {/* Loading section */}
          <View style={styles.loadingSection}>
            {/* Custom progress bar */}
            <View style={styles.progressBarContainer}>
              <Animated.View 
                style={[
                  styles.progressBar,
                  {
                    width: loadingProgress.interpolate({
                      inputRange: [0, 1],
                      outputRange: ['0%', '100%']
                    })
                  }
                ]}
              />
            </View>
            
            {/* Loading spinner and text */}
            <View style={styles.loadingIndicator}>
              <ActivityIndicator size="small" color="#ffffff" />
              <Text style={styles.loadingText}>Loading your experience...</Text>
            </View>
          </View>
        </Animated.View>
        
        {/* Bottom branding */}
        <View style={styles.bottomBranding}>
          <Text style={styles.brandingText}>Powered by Innovation</Text>
        </View>
      </View>
    )
  }

  // Redirect based on auth status after loading is complete
  if (user) {
    return <Redirect href="/(home)" />
  } else {
    return <Redirect href="/(auth)/sign-in" />
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f172a',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  
  gradientOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'transparent',
    // Adding a subtle radial gradient effect
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.1,
    shadowRadius: 100,
  },

  particlesContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },

  particle: {
    position: 'absolute',
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: 'rgba(99, 102, 241, 0.3)',
  },

  logoContainer: {
    alignItems: 'center',
    zIndex: 10,
  },

  logoBackground: {
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(255, 255, 255, 1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    shadowColor: '#ffffff',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 10,
    position: 'relative',
  },

  logoGlow: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: 'rgba(99, 102, 241, 0.05)',
    top: -10,
    left: -10,
  },

  logoImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'contain',
  },

  appTitle: {
    fontSize: 42,
    fontWeight: '700',
    fontFamily: 'Helvetica Neue',
    color: '#ffffff',
    marginBottom: 8,
    textAlign: 'center',
    letterSpacing: 2,
    textShadowColor: 'rgba(99, 102, 241, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 10,
  },

  appSubtitle: {
    fontSize: 16,
    color: '#94a3b8',
    textAlign: 'center',
    marginBottom: 60,
    letterSpacing: 1,
    fontWeight: '300',
  },

  loadingSection: {
    alignItems: 'center',
    width: 280,
  },

  progressBarContainer: {
    width: '100%',
    height: 3,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 2,
    marginBottom: 24,
    overflow: 'hidden',
  },

  progressBar: {
    height: '100%',
    backgroundColor: '#6366f1',
    borderRadius: 2,
    shadowColor: '#6366f1',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
  },

  loadingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },

  loadingText: {
    fontSize: 14,
    color: '#94a3b8',
    marginLeft: 12,
    textAlign: 'center',
    fontWeight: '300',
  },

  bottomBranding: {
    position: 'absolute',
    bottom: 50,
    alignItems: 'center',
  },

  brandingText: {
    fontSize: 12,
    color: 'rgba(148, 163, 184, 0.6)',
    letterSpacing: 1,
    fontWeight: '300',
  },
})