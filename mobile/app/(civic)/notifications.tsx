import React, { useState } from 'react'
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  RefreshControl,
  Alert
} from 'react-native'
import { useUser } from '@clerk/clerk-expo'
import { useQuery, useMutation } from 'convex/react'
import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import { SafeAreaView } from 'react-native-safe-area-context'

// Mock notifications data - In production, this would come from Convex
const MOCK_NOTIFICATIONS = [
  {
    id: '1',
    title: 'Issue Status Updated',
    message: 'Your water supply issue has been acknowledged by the Water Department.',
    type: 'issue_update',
    relatedIssueId: 'issue1',
    isRead: false,
    createdAt: Date.now() - 2 * 60 * 60 * 1000, // 2 hours ago
  },
  {
    id: '2',
    title: 'New Comment on Your Issue',
    message: 'The Public Works Department has added a comment to your road pothole report.',
    type: 'new_comment',
    relatedIssueId: 'issue2',
    isRead: false,
    createdAt: Date.now() - 5 * 60 * 60 * 1000, // 5 hours ago
  },
  {
    id: '3',
    title: 'Issue Resolved',
    message: 'Great news! Your street lighting issue has been marked as resolved.',
    type: 'issue_resolved',
    relatedIssueId: 'issue3',
    isRead: true,
    createdAt: Date.now() - 1 * 24 * 60 * 60 * 1000, // 1 day ago
  },
  {
    id: '4',
    title: 'System Maintenance',
    message: 'The civic portal will undergo scheduled maintenance tonight from 11 PM to 2 AM.',
    type: 'system',
    relatedIssueId: null,
    isRead: true,
    createdAt: Date.now() - 2 * 24 * 60 * 60 * 1000, // 2 days ago
  },
  {
    id: '5',
    title: 'Weekly Summary',
    message: 'You have 2 active issues and 1 resolved issue this week.',
    type: 'system',
    relatedIssueId: null,
    isRead: true,
    createdAt: Date.now() - 7 * 24 * 60 * 60 * 1000, // 1 week ago
  },
]

export default function NotificationsPage() {
  const { user } = useUser()
  const router = useRouter()
  const [refreshing, setRefreshing] = useState(false)
  const [filter, setFilter] = useState<'all' | 'unread' | 'issue_update' | 'system'>('all')

  const [notifications, setNotifications] = useState(MOCK_NOTIFICATIONS)

  const onRefresh = async () => {
    setRefreshing(true)
    setTimeout(() => setRefreshing(false), 1000)
  }

  const markAsRead = (notificationId: string) => {
    setNotifications(prev => 
      prev.map(notif => 
        notif.id === notificationId ? { ...notif, isRead: true } : notif
      )
    )
  }

  const markAllAsRead = () => {
    Alert.alert(
      'Mark All as Read',
      'Are you sure you want to mark all notifications as read?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Mark All',
          onPress: () => {
            setNotifications(prev => 
              prev.map(notif => ({ ...notif, isRead: true }))
            )
          }
        }
      ]
    )
  }

  const deleteNotification = (notificationId: string) => {
    Alert.alert(
      'Delete Notification',
      'Are you sure you want to delete this notification?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            setNotifications(prev => 
              prev.filter(notif => notif.id !== notificationId)
            )
          }
        }
      ]
    )
  }

  const handleNotificationPress = (notification: any) => {
    if (!notification.isRead) {
      markAsRead(notification.id)
    }

    if (notification.relatedIssueId) {
      router.push(`/(civic)/issues/${notification.relatedIssueId}`)
    }
  }

  const filteredNotifications = notifications.filter(notification => {
    switch (filter) {
      case 'unread':
        return !notification.isRead
      case 'issue_update':
        return notification.type === 'issue_update' || notification.type === 'issue_resolved'
      case 'system':
        return notification.type === 'system'
      default:
        return true
    }
  })

  const unreadCount = notifications.filter(n => !n.isRead).length

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
      month: 'short'
    })
  }

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'issue_update':
        return 'refresh-circle'
      case 'issue_resolved':
        return 'checkmark-circle'
      case 'new_comment':
        return 'chatbubble'
      case 'system':
        return 'settings'
      default:
        return 'notifications'
    }
  }

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'issue_update':
        return '#3b82f6'
      case 'issue_resolved':
        return '#10b981'
      case 'new_comment':
        return '#8b5cf6'
      case 'system':
        return '#f59e0b'
      default:
        return '#6b7280'
    }
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Notifications</Text>
          {unreadCount > 0 && (
            <View style={styles.unreadBadge}>
              <Text style={styles.unreadCount}>{unreadCount}</Text>
            </View>
          )}
        </View>
        <TouchableOpacity onPress={markAllAsRead}>
          <Ionicons name="checkmark-done" size={24} color="white" />
        </TouchableOpacity>
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.filterTabs}>
            {[
              { key: 'all', label: 'All', count: notifications.length },
              { key: 'unread', label: 'Unread', count: unreadCount },
              { key: 'issue_update', label: 'Issues', count: notifications.filter(n => n.type.includes('issue')).length },
              { key: 'system', label: 'System', count: notifications.filter(n => n.type === 'system').length }
            ].map((tab) => (
              <TouchableOpacity
                key={tab.key}
                style={[
                  styles.filterTab,
                  filter === tab.key && styles.activeFilterTab
                ]}
                onPress={() => setFilter(tab.key as any)}
              >
                <Text style={[
                  styles.filterTabText,
                  filter === tab.key && styles.activeFilterTabText
                ]}>
                  {tab.label} ({tab.count})
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </View>

      {/* Notifications List */}
      <ScrollView 
        style={styles.notificationsList}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {filteredNotifications.length > 0 ? (
          filteredNotifications.map((notification) => (
            <TouchableOpacity 
              key={notification.id} 
              style={[
                styles.notificationCard,
                !notification.isRead && styles.unreadNotification
              ]}
              onPress={() => handleNotificationPress(notification)}
            >
              <View style={styles.notificationContent}>
                <View style={styles.notificationHeader}>
                  <View style={styles.notificationIcon}>
                    <Ionicons 
                      name={getNotificationIcon(notification.type) as any} 
                      size={20} 
                      color={getNotificationColor(notification.type)} 
                    />
                  </View>
                  
                  <View style={styles.notificationInfo}>
                    <Text style={[
                      styles.notificationTitle,
                      !notification.isRead && styles.unreadTitle
                    ]}>
                      {notification.title}
                    </Text>
                    <Text style={styles.notificationTime}>
                      {formatDate(notification.createdAt)}
                    </Text>
                  </View>

                  <View style={styles.notificationActions}>
                    {!notification.isRead && (
                      <View style={styles.unreadDot} />
                    )}
                    <TouchableOpacity 
                      style={styles.deleteButton}
                      onPress={() => deleteNotification(notification.id)}
                    >
                      <Ionicons name="close" size={16} color="#9ca3af" />
                    </TouchableOpacity>
                  </View>
                </View>

                <Text style={styles.notificationMessage}>
                  {notification.message}
                </Text>

                {notification.relatedIssueId && (
                  <View style={styles.actionButton}>
                    <Ionicons name="arrow-forward" size={14} color="#16a34a" />
                    <Text style={styles.actionText}>View Issue</Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>
          ))
        ) : (
          <View style={styles.emptyState}>
            <Ionicons name="notifications-outline" size={64} color="#9ca3af" />
            <Text style={styles.emptyStateText}>No notifications</Text>
            <Text style={styles.emptyStateSubtext}>
              {filter === 'unread' 
                ? "You're all caught up! No unread notifications."
                : "No notifications match the selected filter."
              }
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Quick Actions */}
      {unreadCount > 0 && (
        <View style={styles.quickActions}>
          <TouchableOpacity style={styles.quickActionButton} onPress={markAllAsRead}>
            <Ionicons name="checkmark-done" size={20} color="#16a34a" />
            <Text style={styles.quickActionText}>Mark All Read</Text>
          </TouchableOpacity>
        </View>
      )}
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
  headerCenter: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
  },
  unreadBadge: {
    backgroundColor: '#ef4444',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    marginLeft: 8,
    minWidth: 20,
    alignItems: 'center',
  },
  unreadCount: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  filterContainer: {
    backgroundColor: 'white',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e7eb',
  },
  filterTabs: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 8,
  },
  filterTab: {
    backgroundColor: '#f3f4f6',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  activeFilterTab: {
    backgroundColor: '#16a34a',
  },
  filterTabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6b7280',
  },
  activeFilterTabText: {
    color: 'white',
  },
  notificationsList: {
    flex: 1,
    paddingHorizontal: 16,
  },
  notificationCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    marginVertical: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  unreadNotification: {
    borderLeftWidth: 4,
    borderLeftColor: '#16a34a',
  },
  notificationContent: {
    padding: 16,
  },
  notificationHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  notificationIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f9fafb',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  notificationInfo: {
    flex: 1,
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 2,
  },
  unreadTitle: {
    color: '#1f2937',
    fontWeight: 'bold',
  },
  notificationTime: {
    fontSize: 12,
    color: '#9ca3af',
  },
  notificationActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#16a34a',
    marginRight: 8,
  },
  deleteButton: {
    padding: 4,
  },
  notificationMessage: {
    fontSize: 14,
    color: '#6b7280',
    lineHeight: 20,
    marginBottom: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0fdf4',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    alignSelf: 'flex-start',
  },
  actionText: {
    fontSize: 12,
    color: '#16a34a',
    fontWeight: '600',
    marginLeft: 4,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 20,
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
    lineHeight: 20,
  },
  quickActions: {
    backgroundColor: 'white',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb',
  },
  quickActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f0fdf4',
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#bbf7d0',
  },
  quickActionText: {
    color: '#16a34a',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
})
