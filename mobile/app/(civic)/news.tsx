"use client"

import { useState, useRef, useEffect } from "react"
import { View, Text, StyleSheet, TouchableOpacity, FlatList, Dimensions, SafeAreaView, Linking } from "react-native"
import { Ionicons } from "@expo/vector-icons"
import { useRouter } from "expo-router"

const NEWS_DATA = [
  {
    id: "1",
    title: "New Water Supply Project Launched in Ranchi",
    content: "The Jharkhand government has announced a major water supply project covering 15 wards in Ranchi.",
    category: "Infrastructure",
    publishedAt: Date.now() - 2 * 24 * 60 * 60 * 1000,
    department: "Water Resources Department",
    link: "https://jharkhand.gov.in/water",
    icon: "water",
  },
  {
    id: "2",
    title: "Road Maintenance Drive to Begin in Jamshedpur",
    content: "Jamshedpur Municipal Corporation will begin a comprehensive road maintenance drive starting next week.",
    category: "Roads",
    publishedAt: Date.now() - 1 * 24 * 60 * 60 * 1000,
    department: "Public Works Department",
    link: "https://jharkhand.gov.in/pwd",
    icon: "car-sport",
  },
  {
    id: "3",
    title: "Digital Citizen Portal is Now Live for All Districts",
    content: "The new digital citizen portal for reporting civic issues is now live across all districts.",
    category: "Technology",
    publishedAt: Date.now() - 5 * 60 * 60 * 1000,
    department: "IT & e-Governance Department",
    link: "https://jharkhand.gov.in/it",
    icon: "phone-portrait",
  },
  {
    id: "4",
    title: "Healthcare Initiative Reaches Rural Areas",
    content: "Mobile healthcare units are now serving remote villages with essential medical services.",
    category: "Healthcare",
    publishedAt: Date.now() - 3 * 24 * 60 * 60 * 1000,
    department: "Health Department",
    link: "https://jharkhand.gov.in/health",
    icon: "medical",
  },
  {
    id: "5",
    title: "Education Reform Program Launched",
    content: "New digital learning initiatives are being rolled out across government schools.",
    category: "Education",
    publishedAt: Date.now() - 4 * 24 * 60 * 60 * 1000,
    department: "Education Department",
    link: "https://jharkhand.gov.in/education",
    icon: "school",
  },
  {
    id: "6",
    title: "Environmental Conservation Drive",
    content: "Tree plantation drive aims to plant 1 million trees across the state this year.",
    category: "Environment",
    publishedAt: Date.now() - 6 * 24 * 60 * 60 * 1000,
    department: "Forest Department",
    link: "https://jharkhand.gov.in/forest",
    icon: "leaf",
  },
]

const { width } = Dimensions.get("window")
const CARD_WIDTH = width * 0.8
const CARD_SPACING = 16

export default function NewsCarousel() {
  const router = useRouter()
  const flatListRef = useRef<FlatList>(null)
  const [currentIndex, setCurrentIndex] = useState(0)

  const infiniteData = [...NEWS_DATA, ...NEWS_DATA, ...NEWS_DATA]
  const initialIndex = NEWS_DATA.length // Start from the middle set

  useEffect(() => {
    const interval = setInterval(() => {
      if (flatListRef.current) {
        const nextIndex = currentIndex + 1
        flatListRef.current.scrollToIndex({
          index: nextIndex,
          animated: true,
        })
      }
    }, 4000) // Auto-scroll every 4 seconds

    return () => clearInterval(interval)
  }, [currentIndex])

  const onViewableItemsChanged = useRef(({ viewableItems }: any) => {
    if (viewableItems.length > 0) {
      const index = viewableItems[0].index
      setCurrentIndex(index)

      if (index >= NEWS_DATA.length * 2) {
        // Reset to beginning of middle set
        setTimeout(() => {
          flatListRef.current?.scrollToIndex({
            index: NEWS_DATA.length,
            animated: false,
          })
          setCurrentIndex(NEWS_DATA.length)
        }, 100)
      } else if (index < NEWS_DATA.length) {
        // Reset to end of middle set
        setTimeout(() => {
          flatListRef.current?.scrollToIndex({
            index: NEWS_DATA.length * 2 - 1,
            animated: false,
          })
          setCurrentIndex(NEWS_DATA.length * 2 - 1)
        }, 100)
      }
    }
  }).current

  const viewabilityConfig = useRef({
    viewAreaCoveragePercentThreshold: 50,
    minimumViewTime: 300,
  }).current

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffTime = Math.abs(now.getTime() - date.getTime())
    const diffHours = Math.floor(diffTime / (1000 * 60 * 60))

    if (diffHours < 1) return "Just now"
    if (diffHours < 24) return `${diffHours}h ago`
    return date.toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" })
  }

  const renderItem = ({ item }: { item: (typeof NEWS_DATA)[0] }) => (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.iconContainer}>
          <Ionicons name={item.icon as any} size={24} color="#16a34a" />
        </View>
        <View style={styles.categoryBadge}>
          <Text style={styles.categoryText}>{item.category}</Text>
        </View>
      </View>

      <View style={styles.cardContent}>
        <Text style={styles.dateText}>{formatDate(item.publishedAt)}</Text>
        <Text style={styles.titleText}>{item.title}</Text>
        <Text style={styles.contentText} numberOfLines={3}>
          {item.content}
        </Text>
        <Text style={styles.departmentText}>{item.department}</Text>
      </View>

      <TouchableOpacity style={styles.readMoreButton} onPress={() => Linking.openURL(item.link)}>
        <Text style={styles.readMoreButtonText}>Read More</Text>
        <Ionicons name="arrow-forward" size={14} color="#16a34a" />
      </TouchableOpacity>
    </View>
  )

  const getItemLayout = (data: any, index: number) => ({
    length: CARD_WIDTH + CARD_SPACING,
    offset: (CARD_WIDTH + CARD_SPACING) * index,
    index,
  })

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="#1f2937" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>News & Updates</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.carouselContainer}>
        <FlatList
          ref={flatListRef}
          data={infiniteData}
          renderItem={renderItem}
          keyExtractor={(item, index) => `${item.id}-${index}`}
          horizontal
          showsHorizontalScrollIndicator={false}
          snapToInterval={CARD_WIDTH + CARD_SPACING}
          snapToAlignment="start"
          decelerationRate="fast"
          contentContainerStyle={styles.flatListContent}
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={viewabilityConfig}
          getItemLayout={getItemLayout}
          initialScrollIndex={initialIndex}
          onScrollToIndexFailed={() => {
            // Handle scroll to index failure
            setTimeout(() => {
              flatListRef.current?.scrollToIndex({
                index: initialIndex,
                animated: false,
              })
            }, 100)
          }}
        />
      </View>

      <View style={styles.paginationContainer}>
        {NEWS_DATA.map((_, index) => (
          <View
            key={index}
            style={[
              styles.paginationDot,
              {
                backgroundColor: currentIndex % NEWS_DATA.length === index ? "#16a34a" : "#d1d5db",
              },
            ]}
          />
        ))}
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#ffffff",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1f2937",
  },
  carouselContainer: {
    flex: 1,
    paddingVertical: 20,
  },
  flatListContent: {
    paddingHorizontal: CARD_SPACING,
  },
  card: {
    width: CARD_WIDTH,
    backgroundColor: "#ffffff",
    borderRadius: 16,
    marginRight: CARD_SPACING,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: "#f3f4f6",
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#f0fdf4",
    justifyContent: "center",
    alignItems: "center",
  },
  categoryBadge: {
    backgroundColor: "#dcfce7",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  categoryText: {
    color: "#15803d",
    fontSize: 12,
    fontWeight: "600",
  },
  cardContent: {
    flex: 1,
    marginBottom: 16,
  },
  dateText: {
    fontSize: 12,
    color: "#6b7280",
    marginBottom: 8,
  },
  titleText: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1f2937",
    lineHeight: 24,
    marginBottom: 12,
  },
  contentText: {
    fontSize: 14,
    color: "#4b5563",
    lineHeight: 20,
    marginBottom: 12,
  },
  departmentText: {
    fontSize: 12,
    color: "#9ca3af",
    fontStyle: "italic",
  },
  readMoreButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#16a34a",
    backgroundColor: "#f0fdf4",
    gap: 6,
  },
  readMoreButtonText: {
    color: "#16a34a",
    fontSize: 14,
    fontWeight: "600",
  },
  paginationContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingBottom: 20,
    gap: 8,
  },
  paginationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
})
