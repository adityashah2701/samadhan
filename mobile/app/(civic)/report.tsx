import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Image,
  Dimensions,
  Modal,
  FlatList,
  ActivityIndicator,
} from "react-native";
import { useUser } from "@clerk/clerk-expo";
import { useMutation, useQuery } from "convex/react";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import * as Location from "expo-location";
import { SafeAreaView } from "react-native-safe-area-context";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useNotificationContext } from "../components/NotificationProvider";

const CATEGORIES = [
  "Infrastructure",
  "Roads",
  "Water Supply",
  "Sanitation",
  "Electricity",
  "Public Transport",
  "Parks & Recreation",
  "Waste Management",
  "Street Lighting",
  "Drainage",
  "Other",
];
const jharkhandCities = [
  { name: "Ranchi", lat: 23.3441, lng: 85.3096 },
  { name: "Jamshedpur", lat: 22.8046, lng: 86.2029 },
  { name: "Dhanbad", lat: 23.7957, lng: 86.4304 },
  { name: "Bokaro Steel City", lat: 23.6693, lng: 86.1511 },
  { name: "Hazaribagh", lat: 23.9966, lng: 85.369 },
  { name: "Deoghar", lat: 24.4826, lng: 86.694 },
  { name: "Giridih", lat: 24.19, lng: 86.3006 },
  { name: "Chaibasa", lat: 22.5504, lng: 85.802 },
  { name: "Palamu (Daltonganj)", lat: 24.042, lng: 84.0795 },
  { name: "Dumka", lat: 24.2679, lng: 87.2481 },
];

const PRIORITY_LEVELS = [
  { label: "Low", value: "low" },
  { label: "Medium", value: "medium" },
  { label: "High", value: "high" },
  { label: "Urgent", value: "urgent" },
];

interface UploadedImage {
  uri: string;
  storageId?: Id<"_storage">;
  uploading: boolean;
}

// --- Reusable Dropdown Select Component ---
const DropdownSelect = ({
  label,
  options,
  selectedValue,
  onValueChange,
  placeholder,
}: any) => {
  const [modalVisible, setModalVisible] = useState(false);
  const selectedLabel =
    options.find((opt: any) => opt.value === selectedValue)?.label ||
    selectedValue;

  return (
    <>
      <View style={styles.inputGroup}>
        <Text style={styles.label}>{label}</Text>
        <TouchableOpacity
          style={styles.dropdownButton}
          onPress={() => setModalVisible(true)}
        >
          <Text
            style={[
              styles.dropdownButtonText,
              !selectedValue && styles.placeholderText,
            ]}
          >
            {selectedLabel || placeholder}
          </Text>
          <Ionicons name="chevron-down" size={20} color="#6b7280" />
        </TouchableOpacity>
      </View>

      <Modal
        transparent={true}
        visible={modalVisible}
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          onPress={() => setModalVisible(false)}
        >
          <View style={styles.modalContent}>
            <FlatList
              data={options}
              keyExtractor={(item) => item.value || item}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.optionItem}
                  onPress={() => {
                    onValueChange(item.value || item);
                    setModalVisible(false);
                  }}
                >
                  <Text style={styles.optionText}>{item.label || item}</Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
};

export default function ReportIssuePage() {
  const { user } = useUser();
  const router = useRouter();
  const convexUser = useQuery(
    api.users.getUserByClerkId,
    user ? { clerkId: user.id } : "skip"
  );
  const createIssue = useMutation(api.civicIssues.createIssue);
  const generateUploadUrl = useMutation(api.files.generateUploadUrl);
  const { sendLocalNotificationForIssue } = useNotificationContext();

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    category: "",
    address: "",
    city: "",
    district: "",
    pincode: "",
    landmark: "",
    priority: "medium" as "low" | "medium" | "high" | "urgent",
  });

  const [images, setImages] = useState<UploadedImage[]>([]);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(
    null
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccessModalVisible, setSuccessModalVisible] = useState(false);

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        Alert.alert(
          "Location Permission",
          "Location permission is needed to automatically fill your address. You can still manually enter the location."
        );
      } else {
        getCurrentLocation();
      }
    })();
  }, []);

  const getCurrentLocation = async () => {
    try {
      const currentLocation = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      setLocation({
        lat: currentLocation.coords.latitude,
        lng: currentLocation.coords.longitude,
      });

      const reverseGeocode = await Location.reverseGeocodeAsync(
        currentLocation.coords
      );
      if (reverseGeocode.length > 0) {
        const addr = reverseGeocode[0];
        const street = `${addr.streetNumber || ""} ${addr.street || ""}`.trim();
        const formattedAddress = [
          street,
          addr.district,
          addr.city,
          addr.region,
          addr.postalCode,
        ]
          .filter(Boolean)
          .join(", ");

        setFormData((prev) => ({
          ...prev,
          address: formattedAddress,
          city: addr.city || "",
          district: addr.region || "",
          pincode: addr.postalCode || "",
        }));
      }
    } catch (error) {
      console.error("Error getting current location:", error);
      Alert.alert(
        "Error",
        "Failed to get current location. Please enter it manually."
      );
    }
  };

  const uploadImageToConvex = async (
    imageUri: string
  ): Promise<Id<"_storage"> | null> => {
    try {
      const uploadUrl = await generateUploadUrl();
      const response = await fetch(imageUri);
      const blob = await response.blob();
      const result = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": blob.type },
        body: blob,
      });

      if (result.ok) {
        const { storageId } = await result.json();
        return storageId as Id<"_storage">;
      }
      return null;
    } catch (error) {
      console.error("Error uploading image:", error);
      return null;
    }
  };

  const handleImageSelection = async (
    result: ImagePicker.ImagePickerResult
  ) => {
    if (!result.canceled && result.assets[0]) {
      if (images.length >= 3) {
        Alert.alert("Limit Reached", "You can upload a maximum of 3 images.");
        return;
      }
      const newImage: UploadedImage = {
        uri: result.assets[0].uri,
        uploading: true,
      };
      setImages((prev) => [...prev, newImage]);
      const storageId: any = await uploadImageToConvex(result.assets[0].uri);
      setImages((prev) =>
        prev.map((img) =>
          img.uri === newImage.uri
            ? { ...img, storageId, uploading: false }
            : img
        )
      );
    }
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });
    handleImageSelection(result);
  };

  const takePhoto = async () => {
    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });
    handleImageSelection(result);
  };

  const showImagePicker = () =>
    Alert.alert("Add Photo", "Choose an option", [
      { text: "Camera", onPress: takePhoto },
      { text: "Gallery", onPress: pickImage },
      { text: "Cancel", style: "cancel" },
    ]);
  const removeImage = (index: number) =>
    setImages(images.filter((_, i) => i !== index));

  const resetForm = () => {
    setFormData({
      title: "",
      description: "",
      category: "",
      address: "",
      city: "",
      district: "",
      pincode: "",
      landmark: "",
      priority: "medium",
    });
    setImages([]);
    setLocation(null);
    getCurrentLocation(); // Re-fetch location for the new report
  };

  const handleSubmit = async () => {
    console.log("🚀 Submit button pressed");

    if (!convexUser) {
      console.error("❌ User not found");
      return Alert.alert("Error", "User not found. Please try again.");
    }

    console.log("✅ User found:", convexUser._id);

    if (
      !formData.title.trim() ||
      !formData.description.trim() ||
      !formData.category ||
      !formData.address.trim()
    ) {
      console.log("❌ Validation failed:", {
        title: !!formData.title.trim(),
        description: !!formData.description.trim(),
        category: !!formData.category,
        address: !!formData.address.trim(),
      });
      return Alert.alert("Error", "Please fill in all required fields.");
    }

    if (images.some((img) => img.uploading)) {
      console.log("❌ Images still uploading");
      return Alert.alert("Please wait", "Images are still uploading.");
    }

    console.log("🔄 Starting submission process...");
    setIsSubmitting(true);

    try {
      const imageStorageIds = images
        .filter((img) => img.storageId)
        .map((img) => img.storageId!);
      console.log("📁 Images prepared:", imageStorageIds.length);

      const issueData = {
        reportedBy: convexUser._id,
        title: formData.title.trim(),
        description: formData.description.trim(),
        category: formData.category,
        location: {
          address: formData.address.trim(),
          city: formData.city,
          district: formData.district,
          pincode: formData.pincode.trim() || undefined,
          landmark: formData.landmark.trim() || undefined,
          coordinates: location || undefined,
        },
        priority: formData.priority,
        images: imageStorageIds.length > 0 ? imageStorageIds : undefined,
      };

      console.log(
        "📝 Issue data prepared:",
        JSON.stringify(issueData, null, 2)
      );

      const issueId = await createIssue(issueData);
      console.log("✅ Issue created with ID:", issueId);

      // Send local notification
      try {
        const issueNumber = `SMD-${issueId.slice(-6).toUpperCase()}`;
        console.log("🔔 Sending local notification for:", issueNumber);
        sendLocalNotificationForIssue(formData.title.trim(), issueNumber);
      } catch (notifError) {
        console.error("⚠️ Notification error (non-critical):", notifError);
        // Don't fail the whole submission for notification errors
      }

      console.log("🎉 Showing success modal");
      setSuccessModalVisible(true);
    } catch (error) {
      console.error("💥 Error creating issue:", error);

      // More detailed error logging
      if (error instanceof Error) {
        console.error("Error name:", error.name);
        console.error("Error message:", error.message);
        console.error("Error stack:", error.stack);
      }

      Alert.alert(
        "Error",
        `Failed to submit your report. Please try again.\n\nError: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    } finally {
      console.log("🏁 Submission process completed");
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color="white" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Report Issue</Text>
        <View style={{ width: 24 }} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView style={styles.form} showsVerticalScrollIndicator={false}>
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Issue Details</Text>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Issue Title *</Text>
              <TextInput
                style={styles.input}
                value={formData.title}
                onChangeText={(text) =>
                  setFormData({ ...formData, title: text })
                }
                placeholder="e.g., Large pothole on Main Street"
                placeholderTextColor="#9ca3af"
              />
            </View>

            <DropdownSelect
              label="Category *"
              options={CATEGORIES}
              selectedValue={formData.category}
              onValueChange={(value: string) =>
                setFormData({ ...formData, category: value })
              }
              placeholder="Select a category"
            />

            <DropdownSelect
              label="Priority Level"
              options={PRIORITY_LEVELS}
              selectedValue={formData.priority}
              onValueChange={(value: any) =>
                setFormData({ ...formData, priority: value })
              }
              placeholder="Select a priority level"
            />

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Description *</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={formData.description}
                onChangeText={(text) =>
                  setFormData({ ...formData, description: text })
                }
                placeholder="Provide details about the issue..."
                placeholderTextColor="#9ca3af"
                multiline
              />
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Photos (Optional)</Text>
            <View style={styles.imageContainer}>
              {images.map((image, index) => (
                <View key={index} style={styles.imageWrapper}>
                  <Image
                    source={{ uri: image.uri }}
                    style={styles.uploadedImage}
                  />
                  {image.uploading && (
                    <View style={styles.uploadingOverlay}>
                      <ActivityIndicator color="#fff" />
                    </View>
                  )}
                  <TouchableOpacity
                    style={styles.removeImageButton}
                    onPress={() => removeImage(index)}
                  >
                    <Ionicons name="close-circle" size={24} color="#ef4444" />
                  </TouchableOpacity>
                </View>
              ))}
              {images.length < 3 && (
                <TouchableOpacity
                  style={styles.addImageButton}
                  onPress={showImagePicker}
                >
                  <Ionicons name="camera" size={32} color="#6b7280" />
                  <Text style={styles.addImageText}>Add Photo</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Location Details</Text>
              <TouchableOpacity
                style={styles.locationButton}
                onPress={getCurrentLocation}
              >
                <Ionicons name="navigate" size={16} color="#16a34a" />
                <Text style={styles.locationButtonText}>Refresh Location</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Full Address (Editable) *</Text>
              <TextInput
                style={[styles.input, { height: 80 }]}
                value={formData.address}
                onChangeText={(text) =>
                  setFormData({ ...formData, address: text })
                }
                placeholder="Auto-filled address, please verify or edit"
                placeholderTextColor="#9ca3af"
                multiline
              />
              <Text style={styles.locationInfoText}>
                📍 Your precise coordinates will be submitted for accuracy.
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={[
              styles.submitButton,
              (isSubmitting || images.some((img) => img.uploading)) &&
                styles.disabledButton,
            ]}
            onPress={handleSubmit}
            disabled={isSubmitting || images.some((img) => img.uploading)}
          >
            <Text style={styles.submitButtonText}>
              {isSubmitting ? "Submitting..." : "Submit Report"}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>

      <Modal
        transparent={true}
        visible={isSuccessModalVisible}
        animationType="fade"
      >
        <View style={styles.successModalOverlay}>
          <View style={styles.successModalContent}>
            <Ionicons name="checkmark-circle" size={64} color="#16a34a" />
            <Text style={styles.successModalTitle}>Report Submitted!</Text>
            <Text style={styles.successModalText}>
              Thank you for your contribution. Your issue has been sent to the
              relevant department for review.
            </Text>
            <TouchableOpacity
              style={styles.successModalButton}
              onPress={() => {
                setSuccessModalVisible(false);
                router.push("/(civic)/track");
              }}
            >
              <Text style={styles.successModalButtonText}>View My Reports</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.successModalSecondaryButton}
              onPress={() => {
                setSuccessModalVisible(false);
                resetForm();
              }}
            >
              <Text style={styles.successModalSecondaryButtonText}>
                Report Another Issue
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const { width } = Dimensions.get("window");
const imageSize = (width - 64) / 3 - 8;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8fafc" },
  header: {
    backgroundColor: "#16a34a",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 10,
    paddingBottom: 15,
    paddingHorizontal: 20,
  },
  headerTitle: { fontSize: 18, fontWeight: "bold", color: "white" },
  form: { flex: 1, padding: 16 },
  section: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1f2937",
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  inputGroup: { marginBottom: 16 },
  label: { fontSize: 14, fontWeight: "600", color: "#374151", marginBottom: 8 },
  input: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: "#000",
    backgroundColor: "#f9fafb",
  },
  textArea: { height: 100, textAlignVertical: "top", color: "#000" },
  imageContainer: { flexDirection: "row", flexWrap: "wrap" },
  imageWrapper: { position: "relative", marginRight: 8, marginBottom: 8 },
  uploadedImage: { width: imageSize, height: imageSize, borderRadius: 8 },
  uploadingOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  removeImageButton: {
    position: "absolute",
    top: -8,
    right: -8,
    backgroundColor: "white",
    borderRadius: 12,
  },
  addImageButton: {
    width: imageSize,
    height: imageSize,
    backgroundColor: "#f9fafb",
    borderWidth: 2,
    borderColor: "#d1d5db",
    borderStyle: "dashed",
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  addImageText: { fontSize: 12, color: "#6b7280", marginTop: 4 },
  locationButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f0fdf4",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
  },
  locationButtonText: {
    fontSize: 12,
    color: "#16a34a",
    fontWeight: "600",
    marginLeft: 4,
  },
  locationInfoText: { fontSize: 12, color: "#6b7280", marginTop: 8 },
  submitButton: {
    backgroundColor: "#16a34a",
    paddingVertical: 16,
    borderRadius: 12,
    marginVertical: 16,
    alignItems: "center",
  },
  disabledButton: { backgroundColor: "#9ca3af" },
  submitButtonText: { color: "white", fontSize: 16, fontWeight: "600" },

  // Dropdown Styles
  dropdownButton: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
    padding: 12,
    backgroundColor: "#f9fafb",
  },
  dropdownButtonText: { fontSize: 16, color: "#000" },
  placeholderText: { color: "#9ca3af" },
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  modalContent: {
    backgroundColor: "white",
    borderRadius: 12,
    padding: 16,
    width: "80%",
    maxHeight: "60%",
    
  },
  optionItem: {
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  optionText: { fontSize: 16, color: "#000" },

  // Success Modal Styles
  successModalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.6)",
  },
  successModalContent: {
    width: "85%",
    backgroundColor: "white",
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
  },
  successModalTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#1f2937",
    marginTop: 16,
    marginBottom: 8,
  },
  successModalText: {
    fontSize: 16,
    color: "#4b5563",
    textAlign: "center",
    marginBottom: 24,
  },
  successModalButton: {
    backgroundColor: "#16a34a",
    paddingVertical: 14,
    borderRadius: 12,
    width: "100%",
    alignItems: "center",
  },
  successModalButtonText: { color: "white", fontSize: 16, fontWeight: "600" },
  successModalSecondaryButton: { marginTop: 12 },
  successModalSecondaryButtonText: {
    color: "#16a34a",
    fontSize: 16,
    fontWeight: "500",
  },
});
