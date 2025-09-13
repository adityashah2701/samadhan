import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  RefreshControl,
  Linking,
  Share,
  Dimensions,
} from "react-native";
import { useUser } from "@clerk/clerk-expo";
import { useQuery, useMutation } from "convex/react";
import { Ionicons } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { api } from "@/convex/_generated/api";

export default function IssueDetailPage() {
  const { id } = useLocalSearchParams();
  const { user } = useUser();
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  const [comment, setComment] = useState("");
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);

  const convexUser = useQuery(
    api.users.getUserByClerkId,
    user ? { clerkId: user.id } : "skip"
  );

  const issue = useQuery(
    api.civicIssues.getIssueById,
    id ? { issueId: id as any } : "skip"
  );

  const addComment = useMutation(api.civicIssues.addComment);
  const toggleUpvote = useMutation(api.civicIssues.toggleUpvote);
  const incrementViewCount = useMutation(api.civicIssues.incrementViewCount);

  // useEffect(() => {
  //   if (issue && convexUser) {
  //     incrementViewCount({ issueId: id as any });
  //   }
  // }, [issue, convexUser]);

  const onRefresh = async () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1000);
  };

  const handleUpvote = async () => {
    if (!convexUser || !issue) return;
    try {
      await toggleUpvote({
        issueId: issue._id,
        userId: convexUser._id,
      });
    } catch (error) {
      console.error("Error toggling upvote:", error);
    }
  };

  const handleAddComment = async () => {
    if (!convexUser || !comment.trim() || !issue) return;

    setIsSubmittingComment(true);
    try {
      await addComment({
        issueId: issue._id,
        userId: convexUser._id,
        content: comment.trim(),
        isOfficial: convexUser.role !== "citizen",
      });
      setComment("");
      Alert.alert("Success", "Comment added successfully!");
    } catch (error) {
      console.error("Error adding comment:", error);
      Alert.alert("Error", "Failed to add comment. Please try again.");
    } finally {
      setIsSubmittingComment(false);
    }
  };

  const handleShare = async () => {
    if (!issue) return;

    try {
      await Share.share({
        message: `Check out this civic issue: ${issue.title}\n\nLocation: ${issue.location.address}, ${issue.location.city}\n\nDescription: ${issue.description}`,
        title: "Civic Issue Report",
      });
    } catch (error) {
      console.error("Error sharing:", error);
    }
  };

  const handleWhatsAppShare = () => {
    if (!issue) return;

    const message = `🚨 *Civic Issue Report*\n\n*${issue.title}*\n\n📍 Location: ${issue.location.address}, ${issue.location.city}, ${issue.location.district}\n\n📝 Description: ${issue.description}\n\n🏷️ Category: ${issue.category}\n📊 Status: ${issue.status.replace("_", " ").toUpperCase()}\n⚡ Priority: ${issue.priority.toUpperCase()}\n\n👍 Support this issue by upvoting it in the Jharkhand Civic Portal app!`;

    const url = `whatsapp://send?text=${encodeURIComponent(message)}`;

    Linking.canOpenURL(url)
      .then((supported) => {
        if (supported) {
          Linking.openURL(url);
        } else {
          Alert.alert(
            "WhatsApp not found",
            "Please install WhatsApp to share via WhatsApp"
          );
        }
      })
      .catch((error) => console.error("Error opening WhatsApp:", error));
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "#f59e0b";
      case "acknowledged":
        return "#3b82f6";
      case "in_progress":
        return "#8b5cf6";
      case "resolved":
        return "#10b981";
      case "rejected":
        return "#ef4444";
      default:
        return "#6b7280";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pending":
        return "time-outline";
      case "acknowledged":
        return "checkmark-circle-outline";
      case "in_progress":
        return "construct-outline";
      case "resolved":
        return "checkmark-done-circle";
      case "rejected":
        return "close-circle-outline";
      default:
        return "help-circle-outline";
    }
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (!issue) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Issue Details</Text>
          <View style={{ width: 24 }} />
        </View>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading issue details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Issue Details</Text>
        <TouchableOpacity onPress={handleShare}>
          <Ionicons name="share-outline" size={24} color="white" />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Issue Header */}
        <View style={styles.issueHeader}>
          <View style={styles.statusContainer}>
            <View
              style={[
                styles.statusBadge,
                { backgroundColor: getStatusColor(issue.status) },
              ]}
            >
              <Ionicons
                name={getStatusIcon(issue.status) as any}
                size={16}
                color="white"
              />
              <Text style={styles.statusText}>
                {issue.status.replace("_", " ").toUpperCase()}
              </Text>
            </View>
            <Text style={styles.issueId}>#{issue._id.slice(-6)}</Text>
          </View>

          <Text style={styles.issueTitle}>{issue.title}</Text>

          <View style={styles.metaInfo}>
            <View style={styles.metaItem}>
              <Ionicons name="calendar-outline" size={16} color="#6b7280" />
              <Text style={styles.metaText}>
                Reported on {formatDate(issue.createdAt)}
              </Text>
            </View>
            {issue.reporter && (
              <View style={styles.metaItem}>
                <Ionicons name="person-outline" size={16} color="#6b7280" />
                <Text style={styles.metaText}>
                  By {issue.reporter.firstName} {issue.reporter.lastName}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Issue Details */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Description</Text>
          <Text style={styles.description}>{issue.description}</Text>

          <View style={styles.tagsContainer}>
            <View style={styles.tag}>
              <Text style={styles.tagText}>{issue.category}</Text>
            </View>
            <View
              style={[
                styles.tag,
                {
                  backgroundColor:
                    issue.priority === "urgent"
                      ? "#fef2f2"
                      : issue.priority === "high"
                        ? "#fff7ed"
                        : issue.priority === "medium"
                          ? "#fef3c7"
                          : "#f0fdf4",
                },
              ]}
            >
              <Text
                style={[
                  styles.tagText,
                  {
                    color:
                      issue.priority === "urgent"
                        ? "#dc2626"
                        : issue.priority === "high"
                          ? "#ea580c"
                          : issue.priority === "medium"
                            ? "#d97706"
                            : "#16a34a",
                  },
                ]}
              >
                {issue.priority.toUpperCase()} PRIORITY
              </Text>
            </View>
          </View>
        </View>

        {/* Location */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Location</Text>
          <View style={styles.locationCard}>
            <Ionicons name="location" size={24} color="#16a34a" />
            <View style={styles.locationInfo}>
              <Text style={styles.locationAddress}>
                {issue.location.address}
              </Text>
              <Text style={styles.locationDetails}>
                {issue.location.city}, {issue.location.district}
                {issue.location.pincode && ` - ${issue.location.pincode}`}
              </Text>
              {issue.location.landmark && (
                <Text style={styles.landmark}>
                  Near: {issue.location.landmark}
                </Text>
              )}
            </View>
          </View>
        </View>

        {/* Engagement */}
        <View style={styles.section}>
          <View style={styles.engagementContainer}>
            <TouchableOpacity
              style={styles.upvoteButton}
              onPress={handleUpvote}
            >
              <Ionicons
                name={
                  issue.upvotedBy?.includes(convexUser?._id!)
                    ? "heart"
                    : "heart-outline"
                }
                size={24}
                color={
                  issue.upvotedBy?.includes(convexUser?._id!)
                    ? "#ef4444"
                    : "#6b7280"
                }
              />
              <Text style={styles.upvoteText}>{issue.upvotes} Support</Text>
            </TouchableOpacity>

            <View style={styles.viewsContainer}>
              <Ionicons name="eye-outline" size={20} color="#6b7280" />
              <Text style={styles.viewsText}>{issue.viewCount} Views</Text>
            </View>

            <TouchableOpacity
              style={styles.whatsappButton}
              onPress={handleWhatsAppShare}
            >
              <Ionicons name="logo-whatsapp" size={20} color="#25d366" />
              <Text style={styles.whatsappText}>Share</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Status Updates */}
        {issue.statusUpdates && issue.statusUpdates.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Progress Updates</Text>
            {issue.statusUpdates.map((update, index) => (
              <View key={index} style={styles.statusUpdate}>
                <View
                  style={[
                    styles.statusDot,
                    { backgroundColor: getStatusColor(update.newStatus) },
                  ]}
                />
                <View style={styles.statusUpdateContent}>
                  <Text style={styles.statusUpdateTitle}>
                    {update.newStatus.replace("_", " ").toUpperCase()}
                  </Text>
                  {update.note && (
                    <Text style={styles.statusUpdateNote}>{update.note}</Text>
                  )}
                  <Text style={styles.statusUpdateDate}>
                    {formatDate(update.createdAt)}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Resolution Details */}
        {issue.status === "resolved" && issue.resolutionNote && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Resolution</Text>
            <View style={styles.resolutionCard}>
              <Ionicons name="checkmark-circle" size={24} color="#10b981" />
              <View style={styles.resolutionContent}>
                <Text style={styles.resolutionText}>
                  {issue.resolutionNote}
                </Text>
                {issue.resolvedAt && (
                  <Text style={styles.resolutionDate}>
                    Resolved on {formatDate(issue.resolvedAt)}
                  </Text>
                )}
              </View>
            </View>
          </View>
        )}

        {/* Comments Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            Comments ({issue.comments?.length || 0})
          </Text>

          {/* Add Comment */}
          <View style={styles.addCommentContainer}>
            <TextInput
              style={styles.commentInput}
              value={comment}
              onChangeText={setComment}
              placeholder="Add a comment..."
              multiline
              numberOfLines={3}
            />
            <TouchableOpacity
              style={[
                styles.submitCommentButton,
                !comment.trim() && styles.disabledButton,
              ]}
              onPress={handleAddComment}
              disabled={!comment.trim() || isSubmittingComment}
            >
              {isSubmittingComment ? (
                <Text style={styles.submitCommentText}>Posting...</Text>
              ) : (
                <>
                  <Ionicons name="send" size={16} color="white" />
                  <Text style={styles.submitCommentText}>Post</Text>
                </>
              )}
            </TouchableOpacity>
          </View>

          {/* Comments List */}
          {issue.comments && issue.comments.length > 0 ? (
            issue.comments.map((comment, index) => (
              <View key={index} style={styles.commentCard}>
                <View style={styles.commentHeader}>
                  <View style={styles.commentUser}>
                    <Ionicons
                      name={
                        comment.isOfficial
                          ? "shield-checkmark"
                          : "person-circle-outline"
                      }
                      size={20}
                      color={comment.isOfficial ? "#16a34a" : "#6b7280"}
                    />
                    <Text
                      style={[
                        styles.commentUsername,
                        comment.isOfficial && styles.officialUser,
                      ]}
                    >
                      {comment.user
                        ? `${comment.user.firstName} ${comment.user.lastName}`
                        : "Anonymous"}
                      {comment.isOfficial && " (Official)"}
                    </Text>
                  </View>
                  <Text style={styles.commentDate}>
                    {formatDate(comment.createdAt)}
                  </Text>
                </View>
                <Text style={styles.commentContent}>{comment.content}</Text>
              </View>
            ))
          ) : (
            <View style={styles.noComments}>
              <Ionicons name="chatbubble-outline" size={48} color="#9ca3af" />
              <Text style={styles.noCommentsText}>No comments yet</Text>
              <Text style={styles.noCommentsSubtext}>
                Be the first to comment on this issue
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
const { width } = Dimensions.get('window')

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8fafc",
  },
  header: {
    backgroundColor: "#16a34a",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 10,
    paddingBottom: 15,
    paddingHorizontal: 20,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "white",
  },
  content: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    fontSize: 16,
    color: "#6b7280",
  },
  issueHeader: {
    backgroundColor: "white",
    padding: 20,
    marginBottom: 8,
  },
  statusRow: {
    flexDirection: "row",
    marginBottom: 12,
    gap: 8,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "600",
    color: "white",
  },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  priorityText: {
    fontSize: 10,
    fontWeight: "bold",
    color: "white",
  },
  issueTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#1f2937",
    marginBottom: 8,
    lineHeight: 28,
  },
  metaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  category: {
    fontSize: 14,
    fontWeight: "600",
    color: "#16a34a",
  },
  date: {
    fontSize: 12,
    color: "#6b7280",
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
    gap: 4,
  },
  locationText: {
    fontSize: 14,
    color: "#6b7280",
    flex: 1,
  },
  landmarkRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  landmarkText: {
    fontSize: 12,
    color: "#9ca3af",
    fontStyle: "italic",
  },
  section: {
    backgroundColor: "white",
    padding: 20,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1f2937",
    marginBottom: 12,
  },
  imagesSection: {
    backgroundColor: "white",
    paddingVertical: 20,
    marginBottom: 8,
  },
  imagesContainer: {
    flexDirection: "row",
    paddingHorizontal: 20,
    gap: 12,
  },
  imageWrapper: {
    position: "relative",
  },
  issueImage: {
    width: 120,
    height: 120,
    borderRadius: 8,
  },
  imageOverlay: {
    position: "absolute",
    top: 8,
    right: 8,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    borderRadius: 12,
    padding: 4,
  },
  description: {
    fontSize: 16,
    color: "#374151",
    lineHeight: 24,
  },
  reporterRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  reporterAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  reporterAvatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#f3f4f6",
    justifyContent: "center",
    alignItems: "center",
  },
  reporterName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1f2937",
  },
  engagementSection: {
    backgroundColor: "white",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    marginBottom: 8,
  },
  upvoteButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f0fdf4",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#16a34a",
    gap: 6,
  },
  upvotedButton: {
    backgroundColor: "#16a34a",
  },
  upvoteText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#16a34a",
  },
  upvotedText: {
    color: "white",
  },
  viewCount: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  viewText: {
    fontSize: 12,
    color: "#6b7280",
  },
  addCommentContainer: {
    flexDirection: "row",
    marginBottom: 20,
    gap: 12,
  },
  commentInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    maxHeight: 100,
  },
  submitCommentButton: {
    backgroundColor: "#16a34a",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  disabledButton: {
    backgroundColor: "#9ca3af",
  },
  commentItem: {
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  commentHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
    gap: 8,
  },
  commenterName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1f2937",
  },
  officialBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#3b82f6",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    gap: 2,
  },
  officialText: {
    fontSize: 10,
    fontWeight: "bold",
    color: "white",
  },
  commentDate: {
    fontSize: 12,
    color: "#9ca3af",
    marginLeft: "auto",
  },
  commentContent: {
    fontSize: 14,
    color: "#374151",
    lineHeight: 20,
  },
  noCommentsText: {
    fontSize: 14,
    color: "#9ca3af",
    textAlign: "center",
    padding: 20,
    fontStyle: "italic",
  },
  statusUpdateItem: {
    marginBottom: 12,
    paddingLeft: 16,
    borderLeftWidth: 2,
    borderLeftColor: "#e5e7eb",
  },
  statusUpdateHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
    gap: 8,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusUpdateText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1f2937",
  },
  statusUpdateNote: {
    fontSize: 13,
    color: "#6b7280",
    marginTop: 4,
    marginLeft: 16,
  },
  statusUpdateDate: {
    fontSize: 11,
    color: "#9ca3af",
    marginTop: 4,
    marginLeft: 16,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.9)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalCloseButton: {
    position: "absolute",
    top: 50,
    right: 20,
    zIndex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    borderRadius: 20,
    padding: 8,
  },
  fullScreenImage: {
    width: width - 40,
    height: "70%",
  },
  imageCounter: {
    position: "absolute",
    bottom: 50,
    alignSelf: "center",
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  imageCounterText: {
    color: "white",
    fontSize: 14,
    fontWeight: "600",
  },
  a: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 10,
    paddingBottom: 15,
    paddingHorizontal: 20,
  },

  statusContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  
  issueId: {
    fontSize: 14,
    color: "#6b7280",
    fontWeight: "600",
  },
 
  metaInfo: {
    gap: 8,
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
  },
  metaText: {
    fontSize: 14,
    color: "#6b7280",
    marginLeft: 6,
  },
 

  tagsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  tag: {
    backgroundColor: "#f3f4f6",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  tagText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#6b7280",
  },
  locationCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: 16,
    backgroundColor: "#f9fafb",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  locationInfo: {
    marginLeft: 12,
    flex: 1,
  },
  locationAddress: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1f2937",
    marginBottom: 4,
  },
  locationDetails: {
    fontSize: 14,
    color: "#6b7280",
  },
  landmark: {
    fontSize: 12,
    color: "#16a34a",
    marginTop: 4,
    fontStyle: "italic",
  },
  engagementContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
 
  viewsContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  viewsText: {
    fontSize: 14,
    color: "#6b7280",
    marginLeft: 4,
  },
  whatsappButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f0fdf4",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#bbf7d0",
  },
  whatsappText: {
    fontSize: 12,
    color: "#16a34a",
    marginLeft: 4,
    fontWeight: "600",
  },
  statusUpdate: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 16,
  },
  
  statusUpdateContent: {
    flex: 1,
  },
  statusUpdateTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1f2937",
    marginBottom: 4,
  },

  resolutionCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: 16,
    backgroundColor: "#f0fdf4",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#bbf7d0",
  },
  resolutionContent: {
    marginLeft: 12,
    flex: 1,
  },
  resolutionText: {
    fontSize: 16,
    color: "#16a34a",
    marginBottom: 8,
    fontWeight: "500",
  },
  resolutionDate: {
    fontSize: 12,
    color: "#16a34a",
  },
  
 
 
  submitCommentText: {
    color: "white",
    fontSize: 14,
    fontWeight: "600",
    marginLeft: 6,
  },
  commentCard: {
    backgroundColor: "#f9fafb",
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
 
  commentUser: {
    flexDirection: "row",
    alignItems: "center",
  },
  commentUsername: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
    marginLeft: 6,
  },
  officialUser: {
    color: "#16a34a",
  },

  noComments: {
    alignItems: "center",
    paddingVertical: 32,
  },

  noCommentsSubtext: {
    fontSize: 14,
    color: "#9ca3af",
    marginTop: 4,
  },
});
