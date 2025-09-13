import React, { useState } from 'react'
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  RefreshControl,
  Linking
} from 'react-native'
import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'

// Mock news data - In production, this would come from an API or Convex
const NEWS_DATA = [
  {
    id: '1',
    title: 'New Water Supply Project Launched in Ranchi',
    content: 'The Jharkhand government has announced a major water supply project covering 15 wards in Ranchi. The project aims to provide 24/7 clean water supply to over 50,000 households.',
    category: 'Infrastructure',
    priority: 'high',
    publishedAt: Date.now() - 2 * 24 * 60 * 60 * 1000,
    readTime: '3 min read',
    department: 'Water Resources Department',
    status: 'active',
  },
  {
    id: '2',
    title: 'Road Maintenance Drive in Jamshedpur',
    content: 'Jamshedpur Municipal Corporation will begin a comprehensive road maintenance drive starting next week. Citizens are advised to plan alternate routes during peak hours.',
    category: 'Roads',
    priority: 'medium',
    publishedAt: Date.now() - 1 * 24 * 60 * 60 * 1000,
    readTime: '2 min read',
    department: 'Public Works Department',
    status: 'active',
  },
  {
    id: '3',
    title: 'Digital Citizen Portal Now Live',
    content: 'The new digital citizen portal for reporting civic issues is now live. Citizens can report issues, track progress, and receive real-time updates on their mobile devices.',
    category: 'Technology',
    priority: 'high',
    publishedAt: Date.now() - 5 * 60 * 60 * 1000,
    readTime: '4 min read',
    department: 'IT Department',
    status: 'active',
  },
]

// const CATEGORIES = ['All', 'Infrastructure', 'Roads', 'Technology', 'Waste Management', 'Public Transport', 'Emergency Services']

export default function NewsPage() {
  const router = useRouter()
  const [refreshing, setRefreshing] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState('All')
  const [expandedArticle, setExpandedArticle] = useState<string | null>(null)

  const onRefresh = async () => {
    setRefreshing(true)
    setTimeout(() => setRefreshing(false), 1000)
  }

  const filteredNews = NEWS_DATA.filter(article => {
    if (selectedCategory === 'All') return true
    return article.category === selectedCategory
  })

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffTime = Math.abs(now.getTime() - date.getTime())
    const diffHours = Math.floor(diffTime / (1000 * 60 * 60))
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24))
    
    if (diffHours < 1) return 'Just now'
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays === 1) return 'Yesterday'
    if (diffDays <= 7) return `${diffDays} days ago`
    
    return date.toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    })
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return '#ef4444'
      case 'medium': return '#f59e0b'
      case 'low': return '#10b981'
      default: return '#6b7280'
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>News & Updates</Text>
        <TouchableOpacity>
          <Ionicons name="notifications-outline" size={24} color="white" />
        </TouchableOpacity>
      </View>

      <View style={styles.statsBanner}>
        <View style={styles.statsItem}>
          <Text style={styles.statsNumber}>{NEWS_DATA.length}</Text>
          <Text style={styles.statsLabel}>Updates</Text>
        </View>
        <View style={styles.statsItem}>
          <Text style={styles.statsNumber}>
            {NEWS_DATA.filter(n => n.priority === 'high').length}
          </Text>
          <Text style={styles.statsLabel}>Important</Text>
        </View>
        <View style={styles.statsItem}>
          <Text style={styles.statsNumber}>1</Text>
          <Text style={styles.statsLabel}>Today</Text>
        </View>
      </View>

      {/* <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterContainer}>
        <View style={styles.filterChips}>
          {CATEGORIES.map((category) => (
            <TouchableOpacity
              key={category}
              style={[
                styles.filterChip,
                selectedCategory === category && styles.activeFilterChip
              ]}
              onPress={() => setSelectedCategory(category)}
            >
              <Text style={[
                styles.filterChipText,
                selectedCategory === category && styles.activeFilterChipText
              ]}>
                {category}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView> */}

      <ScrollView 
        style={styles.newsList}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {filteredNews.map((article) => (
          <TouchableOpacity 
            key={article.id} 
            style={styles.newsCard}
            onPress={() => setExpandedArticle(expandedArticle === article.id ? null : article.id)}
          >
            <View style={styles.articleHeader}>
              <View style={[styles.priorityBadge, { backgroundColor: getPriorityColor(article.priority) + '20' }]}>
                <View style={[styles.priorityDot, { backgroundColor: getPriorityColor(article.priority) }]} />
                <Text style={[styles.priorityText, { color: getPriorityColor(article.priority) }]}>
                  {article.priority.toUpperCase()}
                </Text>
              </View>
              <Text style={styles.articleDate}>{formatDate(article.publishedAt)}</Text>
            </View>

            <Text style={styles.articleTitle}>{article.title}</Text>
            <Text style={styles.departmentText}>{article.department}</Text>
            
            <Text 
              style={styles.articleContent} 
              numberOfLines={expandedArticle === article.id ? undefined : 3}
            >
              {article.content}
            </Text>

            <View style={styles.articleFooter}>
              <Text style={styles.readTime}>{article.readTime}</Text>
              <Ionicons 
                name={expandedArticle === article.id ? "chevron-up" : "chevron-down"} 
                size={16} 
                color="#16a34a" 
              />
            </View>
          </TouchableOpacity>
        ))}

        {filteredNews.length === 0 && (
          <View style={styles.emptyState}>
            <Ionicons name="newspaper-outline" size={64} color="#9ca3af" />
            <Text style={styles.emptyStateText}>No news found</Text>
            <Text style={styles.emptyStateSubtext}>
              No news articles match the selected category
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    backgroundColor: '#16a34a',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 10,
    paddingBottom: 15,
    paddingHorizontal: 20,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
  },
  statsBanner: {
    backgroundColor: 'white',
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  statsItem: {
    alignItems: 'center',
  },
  statsNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#16a34a',
  },
  statsLabel: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 4,
  },
  filterContainer: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  filterChips: {
    flexDirection: 'row',
    gap: 8,
  },
  filterChip: {
    backgroundColor: 'white',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
  },
  activeFilterChip: {
    backgroundColor: '#16a34a',
    borderColor: '#16a34a',
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6b7280',
  },
  activeFilterChipText: {
    color: 'white',
  },
  newsList: {
    flex: 1,
    paddingHorizontal: 16,
  },
  newsCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  articleHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  priorityBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  priorityDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  priorityText: {
    fontSize: 10,
    fontWeight: '600',
  },
  articleDate: {
    fontSize: 12,
    color: '#9ca3af',
  },
  articleTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 4,
  },
  departmentText: {
    fontSize: 12,
    color: '#16a34a',
    marginBottom: 8,
  },
  articleContent: {
    fontSize: 14,
    color: '#4b5563',
    lineHeight: 20,
    marginBottom: 12,
  },
  articleFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  readTime: {
    fontSize: 12,
    color: '#9ca3af',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#6b7280',
    marginTop: 16,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#9ca3af',
    textAlign: 'center',
    marginTop: 8,
  },
})
