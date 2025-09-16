import React, { useState } from "react";
import { 
  Upload, 
  Download, 
  Users, 
  FileText, 
  CheckCircle, 
  XCircle, 
  AlertTriangle,
  Send,
  Eye,
  Filter,
  Search,
  Plus,
  Trash2
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";

import { NotificationFormData } from "../page";

interface User {
  _id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  role: "citizen" | "admin" | "department";
  city?: string;
  district?: string;
}

interface BulkCampaign {
  id: string;
  name: string;
  title: string;
  body: string;
  targetCount: number;
  sentCount: number;
  deliveredCount: number;
  readCount: number;
  status: "draft" | "sending" | "completed" | "failed";
  createdAt: number;
  completedAt?: number;
}

interface BulkNotificationManagerProps {
  users: User[];
  onSendNotification: (data: NotificationFormData) => Promise<boolean>;
}

export function BulkNotificationManager({ users, onSendNotification }: BulkNotificationManagerProps) {
  const [activeTab, setActiveTab] = useState("create");
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [locationFilter, setLocationFilter] = useState<string>("all");
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [sendProgress, setSendProgress] = useState(0);

  // Bulk notification form
  const [bulkForm, setBulkForm] = useState({
    campaignName: "",
    title: "",
    body: "",
    type: "announcement" as NotificationFormData["type"],
    channels: ["app"] as NotificationFormData["channels"],
    urgent: false
  });

  // Mock bulk campaigns data
  const bulkCampaigns: BulkCampaign[] = [
    {
      id: "1",
      name: "System Maintenance Alert",
      title: "Scheduled System Maintenance",
      body: "The system will be under maintenance tomorrow from 2 AM to 4 AM",
      targetCount: 1250,
      sentCount: 1250,
      deliveredCount: 1198,
      readCount: 890,
      status: "completed",
      createdAt: Date.now() - 2 * 24 * 60 * 60 * 1000,
      completedAt: Date.now() - 2 * 24 * 60 * 60 * 1000 + 30 * 60 * 1000
    },
    {
      id: "2",
      name: "New Feature Announcement",
      title: "New Features Available",
      body: "Check out the latest features in the mobile app",
      targetCount: 856,
      sentCount: 780,
      deliveredCount: 745,
      readCount: 0,
      status: "sending",
      createdAt: Date.now() - 30 * 60 * 1000
    }
  ];

  // Filter users based on search and filters
  const filteredUsers = users.filter(user => {
    const matchesSearch = 
      `${user.firstName} ${user.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesRole = roleFilter === "all" || user.role === roleFilter;
    const matchesLocation = locationFilter === "all" || user.city === locationFilter || user.district === locationFilter;
    
    return matchesSearch && matchesRole && matchesLocation;
  });

  // Get unique locations for filter
  const uniqueLocations = [...new Set([
    ...users.map(u => u.city).filter(Boolean),
    ...users.map(u => u.district).filter(Boolean)
  ])];

  // Handle file upload for bulk user selection
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.type === "text/csv" || file.name.endsWith(".csv")) {
        setUploadedFile(file);
        // In a real app, parse CSV and extract user IDs/emails
        toast.success("CSV file uploaded successfully");
      } else {
        toast.error("Please upload a CSV file");
      }
    }
  };

  // Handle bulk selection
  const handleSelectAll = () => {
    if (selectedUsers.length === filteredUsers.length) {
      setSelectedUsers([]);
    } else {
      setSelectedUsers(filteredUsers.map(u => u._id));
    }
  };

  // Handle sending bulk notification
  const handleSendBulkNotification = async () => {
    if (!bulkForm.title.trim() || !bulkForm.body.trim()) {
      toast.error("Please fill in title and message");
      return;
    }

    if (selectedUsers.length === 0) {
      toast.error("Please select users to send notifications to");
      return;
    }

    setIsSending(true);
    setSendProgress(0);

    try {
      // Simulate batch sending with progress
      const batchSize = 50;
      const batches = Math.ceil(selectedUsers.length / batchSize);
      
      for (let i = 0; i < batches; i++) {
        const batchUsers = selectedUsers.slice(i * batchSize, (i + 1) * batchSize);
        
        // Send notification for this batch
        await onSendNotification({
          title: bulkForm.title,
          body: bulkForm.body,
          type: bulkForm.type,
          channels: bulkForm.channels,
          targetAudience: "custom",
          customUserIds: batchUsers,
          urgent: bulkForm.urgent
        });

        // Update progress
        setSendProgress(((i + 1) / batches) * 100);
        
        // Small delay to show progress
        await new Promise(resolve => setTimeout(resolve, 200));
      }

      toast.success(`Bulk notification sent to ${selectedUsers.length} users`);
      
      // Reset form
      setBulkForm({
        campaignName: "",
        title: "",
        body: "",
        type: "announcement",
        channels: ["app"],
        urgent: false
      });
      setSelectedUsers([]);
      
    } catch (error) {
      toast.error("Failed to send bulk notification");
    } finally {
      setIsSending(false);
      setSendProgress(0);
    }
  };

  // Get status color and icon
  const getStatusConfig = (status: string) => {
    const configs = {
      draft: { icon: FileText, color: "bg-gray-500/10 text-gray-500" },
      sending: { icon: Send, color: "bg-blue-500/10 text-blue-500" },
      completed: { icon: CheckCircle, color: "bg-green-500/10 text-green-500" },
      failed: { icon: XCircle, color: "bg-red-500/10 text-red-500" }
    };
    return configs[status as keyof typeof configs] || configs.draft;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Bulk Notification Manager
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Send notifications to multiple users and manage bulk campaigns
          </p>
        </CardHeader>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-1 md:grid-cols-3">
          <TabsTrigger value="create">Create Bulk Campaign</TabsTrigger>
          <TabsTrigger value="campaigns">Campaign History</TabsTrigger>
          <TabsTrigger value="import">Import Users</TabsTrigger>
        </TabsList>

        {/* Create Bulk Campaign */}
        <TabsContent value="create" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Campaign Form */}
            <div className="lg:col-span-2 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Campaign Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="campaign-name">Campaign Name</Label>
                    <Input
                      id="campaign-name"
                      placeholder="Internal campaign name..."
                      value={bulkForm.campaignName}
                      onChange={(e) => setBulkForm(prev => ({ ...prev, campaignName: e.target.value }))}
                    />
                  </div>

                  <div>
                    <Label htmlFor="bulk-title">Notification Title *</Label>
                    <Input
                      id="bulk-title"
                      placeholder="Notification title..."
                      value={bulkForm.title}
                      onChange={(e) => setBulkForm(prev => ({ ...prev, title: e.target.value }))}
                    />
                  </div>

                  <div>
                    <Label htmlFor="bulk-body">Message *</Label>
                    <Textarea
                      id="bulk-body"
                      placeholder="Notification message..."
                      value={bulkForm.body}
                      onChange={(e) => setBulkForm(prev => ({ ...prev, body: e.target.value }))}
                      className="min-h-[120px]"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Notification Type</Label>
                      <Select
                        value={bulkForm.type}
                        onValueChange={(value: NotificationFormData["type"]) => 
                          setBulkForm(prev => ({ ...prev, type: value }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="announcement">Announcement</SelectItem>
                          <SelectItem value="system">System</SelectItem>
                          <SelectItem value="maintenance">Maintenance</SelectItem>
                          <SelectItem value="emergency">Emergency</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label>Delivery Channels</Label>
                      <div className="flex gap-2 mt-1">
                        {["app", "email", "sms"].map((channel) => (
                          <div key={channel} className="flex items-center space-x-1">
                            <Checkbox
                              id={`bulk-${channel}`}
                              checked={bulkForm.channels.includes(channel as any)}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setBulkForm(prev => ({
                                    ...prev,
                                    channels: [...prev.channels, channel as any]
                                  }));
                                } else {
                                  setBulkForm(prev => ({
                                    ...prev,
                                    channels: prev.channels.filter(c => c !== channel)
                                  }));
                                }
                              }}
                            />
                            <label htmlFor={`bulk-${channel}`} className="text-xs capitalize cursor-pointer">
                              {channel}
                            </label>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="bulk-urgent"
                      checked={bulkForm.urgent}
                      onCheckedChange={(checked) => 
                        setBulkForm(prev => ({ ...prev, urgent: !!checked }))
                      }
                    />
                    <label htmlFor="bulk-urgent" className="text-sm cursor-pointer">
                      Mark as urgent
                    </label>
                  </div>
                </CardContent>
              </Card>

              {/* User Selection */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Select Recipients</CardTitle>
                    <Badge variant="outline">
                      {selectedUsers.length} selected
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  {/* Filters */}
                  <div className="flex flex-col md:flex-row gap-4 mb-4">
                    <div className="flex-1">
                      <div className="relative">
                        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="Search users..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="pl-8"
                        />
                      </div>
                    </div>
                    
                    <Select value={roleFilter} onValueChange={setRoleFilter}>
                      <SelectTrigger className="w-[140px]">
                        <SelectValue placeholder="Role" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Roles</SelectItem>
                        <SelectItem value="citizen">Citizens</SelectItem>
                        <SelectItem value="department">Departments</SelectItem>
                        <SelectItem value="admin">Admins</SelectItem>
                      </SelectContent>
                    </Select>

                    <Select value={locationFilter} onValueChange={setLocationFilter}>
                      <SelectTrigger className="w-[140px]">
                        <SelectValue placeholder="Location" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Locations</SelectItem>
                        {uniqueLocations.map(location => (
                          <SelectItem key={location} value={location!}>
                            {location}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Bulk Actions */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="select-all"
                        checked={selectedUsers.length === filteredUsers.length && filteredUsers.length > 0}
                        onCheckedChange={handleSelectAll}
                      />
                      <label htmlFor="select-all" className="text-sm cursor-pointer">
                        Select All ({filteredUsers.length})
                      </label>
                    </div>
                    
                    <div className="text-sm text-muted-foreground">
                      {selectedUsers.length} of {filteredUsers.length} selected
                    </div>
                  </div>

                  {/* User List */}
                  <div className="max-h-64 overflow-y-auto border rounded-md">
                    {filteredUsers.map((user) => (
                      <div key={user._id} className="flex items-center space-x-2 p-2 hover:bg-muted/50">
                        <Checkbox
                          id={user._id}
                          checked={selectedUsers.includes(user._id)}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              setSelectedUsers(prev => [...prev, user._id]);
                            } else {
                              setSelectedUsers(prev => prev.filter(id => id !== user._id));
                            }
                          }}
                        />
                        <label htmlFor={user._id} className="flex-1 text-sm cursor-pointer">
                          {user.firstName} {user.lastName} ({user.email})
                          <Badge variant="outline" className="ml-2 text-xs">
                            {user.role}
                          </Badge>
                          {user.city && (
                            <span className="ml-2 text-xs text-muted-foreground">
                              {user.city}
                            </span>
                          )}
                        </label>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Campaign Summary */}
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Campaign Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-muted-foreground">Recipients:</span>
                      <span className="font-medium">{selectedUsers.length}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-muted-foreground">Channels:</span>
                      <span className="font-medium">{bulkForm.channels.length}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-muted-foreground">Type:</span>
                      <span className="font-medium capitalize">{bulkForm.type}</span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-muted-foreground">Priority:</span>
                      <span className={`font-medium ${bulkForm.urgent ? "text-red-500" : "text-green-500"}`}>
                        {bulkForm.urgent ? "High" : "Normal"}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Sending Progress */}
              {isSending && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Sending Progress</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span>Progress</span>
                        <span>{Math.round(sendProgress)}%</span>
                      </div>
                      <Progress value={sendProgress} className="h-2" />
                      <p className="text-xs text-muted-foreground">
                        Sending notifications in batches...
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Send Button */}
              <Button 
                onClick={handleSendBulkNotification}
                disabled={isSending || selectedUsers.length === 0 || !bulkForm.title.trim() || !bulkForm.body.trim()}
                className="w-full"
                size="lg"
              >
                {isSending ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Send to {selectedUsers.length} Users
                  </>
                )}
              </Button>
            </div>
          </div>
        </TabsContent>

        {/* Campaign History */}
        <TabsContent value="campaigns" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Bulk Campaign History</CardTitle>
              <p className="text-sm text-muted-foreground">
                Track performance of your bulk notification campaigns
              </p>
            </CardHeader>
            <CardContent>
              <div className="table-responsive">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Campaign</TableHead>
                      <TableHead className="hidden md:table-cell">Status</TableHead>
                      <TableHead>Performance</TableHead>
                      <TableHead className="hidden lg:table-cell">Created</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {bulkCampaigns.map((campaign) => {
                      const statusConfig = getStatusConfig(campaign.status);
                      const StatusIcon = statusConfig.icon;
                      const deliveryRate = Math.round((campaign.deliveredCount / campaign.targetCount) * 100);
                      const readRate = campaign.deliveredCount > 0 ? 
                        Math.round((campaign.readCount / campaign.deliveredCount) * 100) : 0;

                      return (
                        <TableRow key={campaign.id}>
                          <TableCell className="max-w-0">
                            <div className="space-y-1">
                              <h4 className="font-medium text-sm truncate">{campaign.name}</h4>
                              <p className="text-xs text-muted-foreground line-clamp-1">
                                {campaign.title}
                              </p>
                            </div>
                          </TableCell>

                          <TableCell className="hidden md:table-cell">
                            <Badge variant="outline" className={statusConfig.color}>
                              <StatusIcon className="h-3 w-3 mr-1" />
                              {campaign.status}
                            </Badge>
                          </TableCell>

                          <TableCell>
                            <div className="space-y-1">
                              <div className="flex justify-between text-xs">
                                <span>Delivery</span>
                                <span>{deliveryRate}%</span>
                              </div>
                              <Progress value={deliveryRate} className="h-1" />
                              <div className="flex justify-between text-xs">
                                <span>Read</span>
                                <span>{readRate}%</span>
                              </div>
                              <Progress value={readRate} className="h-1" />
                              <div className="text-xs text-muted-foreground">
                                {campaign.sentCount}/{campaign.targetCount} sent
                              </div>
                            </div>
                          </TableCell>

                          <TableCell className="hidden lg:table-cell">
                            <div className="text-xs text-muted-foreground">
                              {new Date(campaign.createdAt).toLocaleDateString()}
                            </div>
                          </TableCell>

                          <TableCell className="text-right">
                            <div className="flex items-center gap-2 justify-end">
                              <Button variant="ghost" size="sm">
                                <Eye className="h-3 w-3" />
                              </Button>
                              <Button variant="ghost" size="sm">
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Import Users */}
        <TabsContent value="import" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Import User Lists</CardTitle>
              <p className="text-sm text-muted-foreground">
                Upload CSV files to create custom user lists for bulk notifications
              </p>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* File Upload */}
              <div className="border-2 border-dashed border-border rounded-lg p-8 text-center">
                <Upload className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <div className="space-y-2">
                  <h3 className="text-lg font-medium">Upload CSV File</h3>
                  <p className="text-sm text-muted-foreground">
                    Upload a CSV file with user emails or IDs
                  </p>
                  <div className="flex items-center justify-center gap-4">
                    <Button variant="outline" onClick={() => document.getElementById('file-upload')?.click()}>
                      <Upload className="h-4 w-4 mr-2" />
                      Choose File
                    </Button>
                    <Button variant="outline">
                      <Download className="h-4 w-4 mr-2" />
                      Download Template
                    </Button>
                  </div>
                  <input
                    id="file-upload"
                    type="file"
                    accept=".csv"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </div>
              </div>

              {uploadedFile && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Uploaded File</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">{uploadedFile.name}</span>
                        <Badge variant="outline" className="text-xs">
                          {(uploadedFile.size / 1024).toFixed(1)} KB
                        </Badge>
                      </div>
                      <Button variant="ghost" size="sm" onClick={() => setUploadedFile(null)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* CSV Format Requirements */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">CSV Format Requirements</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 text-sm">
                    <div>
                      <h4 className="font-medium mb-1">Required Columns:</h4>
                      <ul className="list-disc list-inside text-muted-foreground space-y-1">
                        <li><code>email</code> - User email address</li>
                        <li><code>user_id</code> - User ID (alternative to email)</li>
                      </ul>
                    </div>
                    
                    <div>
                      <h4 className="font-medium mb-1">Optional Columns:</h4>
                      <ul className="list-disc list-inside text-muted-foreground space-y-1">
                        <li><code>first_name</code> - User first name</li>
                        <li><code>last_name</code> - User last name</li>
                        <li><code>role</code> - User role (citizen, department, admin)</li>
                        <li><code>city</code> - User city</li>
                        <li><code>district</code> - User district</li>
                      </ul>
                    </div>

                    <div>
                      <h4 className="font-medium mb-1">Example:</h4>
                      <div className="bg-muted p-3 rounded-md font-mono text-xs">
                        email,first_name,last_name,role,city<br/>
                        john@example.com,John,Doe,citizen,Mumbai<br/>
                        admin@dept.gov,Jane,Smith,department,Delhi
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Saved Lists */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Saved User Lists</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {[
                      { name: "Mumbai Citizens", count: 245, lastUsed: "2 days ago" },
                      { name: "Department Heads", count: 12, lastUsed: "1 week ago" },
                      { name: "Test Group", count: 50, lastUsed: "3 weeks ago" }
                    ].map((list, index) => (
                      <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <h4 className="font-medium text-sm">{list.name}</h4>
                          <p className="text-xs text-muted-foreground">
                            {list.count} users • Last used {list.lastUsed}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button variant="outline" size="sm">
                            Use List
                          </Button>
                          <Button variant="ghost" size="sm">
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}