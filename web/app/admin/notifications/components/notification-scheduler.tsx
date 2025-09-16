import React, { useState } from "react";
import { 
  Calendar, 
  Clock, 
  Play, 
  Pause, 
  Trash2, 
  Edit, 
  Plus,
  CalendarDays,
  Timer,
  AlertCircle,
  CheckCircle,
  Users
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";

import { NotificationFormData, NotificationTemplate } from "../page";

interface User {
  _id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  role: "citizen" | "admin" | "department";
}

interface ScheduledNotification {
  _id: string;
  title: string;
  body: string;
  type: string;
  channels: string[];
  targetAudience: string;
  scheduledAt: number;
  recipientCount: number;
  status: "scheduled";
  urgent: boolean;
  createdAt: number;
  senderName: string;
}

interface NotificationSchedulerProps {
  users: User[];
  templates: any;
  onSendNotification: (data: NotificationFormData) => Promise<boolean>;
  scheduledNotifications: any;
}

export function NotificationScheduler({ 
  users, 
  templates, 
  onSendNotification, 
  scheduledNotifications 
}: NotificationSchedulerProps) {
  const [showScheduleDialog, setShowScheduleDialog] = useState(false);
  const [formData, setFormData] = useState<NotificationFormData>({
    title: "",
    body: "",
    type: "system",
    channels: ["app"],
    targetAudience: "all_users",
    customUserIds: [],
    urgent: false,
    scheduledAt: undefined
  });
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [recurringEnabled, setRecurringEnabled] = useState(false);
  const [recurringSettings, setRecurringSettings] = useState({
    frequency: "daily" as "daily" | "weekly" | "monthly",
    interval: 1,
    endDate: ""
  });

  // Calculate target user count
  const getTargetUserCount = () => {
    switch (formData.targetAudience) {
      case "all_users":
        return users.length;
      case "citizens":
        return users.filter(u => u.role === "citizen").length;
      case "departments":
        return users.filter(u => u.role === "department").length;
      case "admins":
        return users.filter(u => u.role === "admin").length;
      case "custom":
        return selectedUsers.length;
      default:
        return 0;
    }
  };

  // Handle form submission
  const handleScheduleNotification = async () => {
    if (!formData.title.trim() || !formData.body.trim()) {
      toast.error("Please fill in title and message");
      return;
    }

    if (!formData.scheduledAt) {
      toast.error("Please select a schedule time");
      return;
    }

    if (formData.scheduledAt <= Date.now()) {
      toast.error("Schedule time must be in the future");
      return;
    }

    const success = await onSendNotification({
      ...formData,
      customUserIds: formData.targetAudience === "custom" ? selectedUsers : undefined
    });

    if (success) {
      setFormData({
        title: "",
        body: "",
        type: "system",
        channels: ["app"],
        targetAudience: "all_users",
        customUserIds: [],
        urgent: false,
        scheduledAt: undefined
      });
      setSelectedUsers([]);
      setShowScheduleDialog(false);
      setRecurringEnabled(false);
    }
  };

  // Handle template selection
  const handleTemplateSelect = (template: NotificationTemplate) => {
    setFormData(prev => ({
      ...prev,
      title: template.title,
      body: template.body,
      type: template.type,
      channels: template.channels,
      targetAudience: template.targetAudience
    }));
  };

  // Cancel scheduled notification
  const handleCancelScheduled = (notificationId: string) => {
    // In a real app, this would call an API to cancel the scheduled notification
    toast.success("Scheduled notification cancelled");
  };

  // Format date and time
  const formatDateTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  // Get time until scheduled
  const getTimeUntilScheduled = (scheduledAt: number) => {
    const now = Date.now();
    const diff = scheduledAt - now;
    
    if (diff <= 0) return "Overdue";
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);
    
    if (days > 0) return `${days} day${days > 1 ? 's' : ''}`;
    if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''}`;
    
    const minutes = Math.floor(diff / (1000 * 60));
    return `${minutes} minute${minutes > 1 ? 's' : ''}`;
  };

  // Get minimum datetime for input (current time + 1 minute)
  const getMinDateTime = () => {
    const now = new Date();
    now.setMinutes(now.getMinutes() + 1);
    return now.toISOString().slice(0, 16);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Notification Scheduler
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Schedule notifications for future delivery and manage recurring campaigns
              </p>
            </div>
            
            <Dialog open={showScheduleDialog} onOpenChange={setShowScheduleDialog}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Schedule Notification
                </Button>
              </DialogTrigger>
              
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Schedule New Notification</DialogTitle>
                </DialogHeader>
                
                <div className="space-y-4">
                  {/* Quick Templates */}
                  {templates.length > 0 && (
                    <div>
                      <Label>Quick Templates</Label>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {templates.slice(0, 3).map((template:any) => (
                          <Button
                            key={template.id}
                            variant="outline"
                            size="sm"
                            onClick={() => handleTemplateSelect(template)}
                            className="text-xs"
                          >
                            {template.title}
                          </Button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Basic Fields */}
                  <div className="grid grid-cols-1 gap-4">
                    <div>
                      <Label htmlFor="schedule-title">Title *</Label>
                      <Input
                        id="schedule-title"
                        placeholder="Notification title..."
                        value={formData.title}
                        onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                      />
                    </div>

                    <div>
                      <Label htmlFor="schedule-body">Message *</Label>
                      <Textarea
                        id="schedule-body"
                        placeholder="Notification message..."
                        value={formData.body}
                        onChange={(e) => setFormData(prev => ({ ...prev, body: e.target.value }))}
                        className="min-h-[100px]"
                      />
                    </div>
                  </div>

                  {/* Type and Audience */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Type</Label>
                      <Select
                        value={formData.type}
                        onValueChange={(value: NotificationFormData["type"]) => 
                          setFormData(prev => ({ ...prev, type: value }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="system">System</SelectItem>
                          <SelectItem value="announcement">Announcement</SelectItem>
                          <SelectItem value="maintenance">Maintenance</SelectItem>
                          <SelectItem value="emergency">Emergency</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label>Target Audience</Label>
                      <Select
                        value={formData.targetAudience}
                        onValueChange={(value: NotificationFormData["targetAudience"]) => 
                          setFormData(prev => ({ ...prev, targetAudience: value }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all_users">All Users ({users.length})</SelectItem>
                          <SelectItem value="citizens">
                            Citizens ({users.filter(u => u.role === "citizen").length})
                          </SelectItem>
                          <SelectItem value="departments">
                            Departments ({users.filter(u => u.role === "department").length})
                          </SelectItem>
                          <SelectItem value="admins">
                            Admins ({users.filter(u => u.role === "admin").length})
                          </SelectItem>
                          <SelectItem value="custom">Custom Selection</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Schedule Time */}
                  <div>
                    <Label htmlFor="schedule-time">Schedule Time *</Label>
                    <Input
                      id="schedule-time"
                      type="datetime-local"
                      min={getMinDateTime()}
                      onChange={(e) => {
                        const value = e.target.value;
                        setFormData(prev => ({
                          ...prev,
                          scheduledAt: value ? new Date(value).getTime() : undefined
                        }));
                      }}
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Minimum 1 minute from now
                    </p>
                  </div>

                  {/* Delivery Channels */}
                  <div>
                    <Label>Delivery Channels</Label>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-2">
                      {[
                        { key: "app", label: "Mobile App" },
                        { key: "email", label: "Email" },
                        { key: "sms", label: "SMS" },
                        { key: "web", label: "Web Portal" }
                      ].map((channel) => (
                        <div key={channel.key} className="flex items-center space-x-2">
                          <Checkbox
                            id={`schedule-${channel.key}`}
                            checked={formData.channels.includes(channel.key as any)}
                            onCheckedChange={(checked) => {
                              if (checked) {
                                setFormData(prev => ({
                                  ...prev,
                                  channels: [...prev.channels, channel.key as any]
                                }));
                              } else {
                                setFormData(prev => ({
                                  ...prev,
                                  channels: prev.channels.filter(c => c !== channel.key)
                                }));
                              }
                            }}
                          />
                          <label htmlFor={`schedule-${channel.key}`} className="text-sm cursor-pointer">
                            {channel.label}
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Recurring Settings */}
                  <div className="space-y-3 p-4 bg-muted/50 rounded-lg">
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="recurring"
                        checked={recurringEnabled}
                        onCheckedChange={setRecurringEnabled}
                      />
                      <Label htmlFor="recurring">Recurring Notification</Label>
                    </div>

                    {recurringEnabled && (
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label>Frequency</Label>
                          <Select
                            value={recurringSettings.frequency}
                            onValueChange={(value: "daily" | "weekly" | "monthly") => 
                              setRecurringSettings(prev => ({ ...prev, frequency: value }))
                            }
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="daily">Daily</SelectItem>
                              <SelectItem value="weekly">Weekly</SelectItem>
                              <SelectItem value="monthly">Monthly</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <Label>End Date</Label>
                          <Input
                            type="date"
                            value={recurringSettings.endDate}
                            onChange={(e) => 
                              setRecurringSettings(prev => ({ ...prev, endDate: e.target.value }))
                            }
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Priority */}
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="schedule-urgent"
                      checked={formData.urgent}
                      onCheckedChange={(checked) => 
                        setFormData(prev => ({ ...prev, urgent: !!checked }))
                      }
                    />
                    <label htmlFor="schedule-urgent" className="text-sm cursor-pointer">
                      Mark as urgent (high priority delivery)
                    </label>
                  </div>

                  {/* Preview Info */}
                  <div className="bg-blue-50 p-3 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Timer className="h-4 w-4 text-blue-500" />
                      <span className="text-sm font-medium text-blue-900">Schedule Preview</span>
                    </div>
                    <div className="text-sm text-blue-800 space-y-1">
                      <p>Target Users: {getTargetUserCount()}</p>
                      <p>Channels: {formData.channels.join(", ")}</p>
                      {formData.scheduledAt && (
                        <p>Scheduled: {formatDateTime(formData.scheduledAt)}</p>
                      )}
                      {recurringEnabled && (
                        <p>Recurring: {recurringSettings.frequency}</p>
                      )}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex justify-end gap-2 pt-4 border-t">
                    <Button variant="outline" onClick={() => setShowScheduleDialog(false)}>
                      Cancel
                    </Button>
                    <Button 
                      onClick={handleScheduleNotification}
                      disabled={!formData.title.trim() || !formData.body.trim() || !formData.scheduledAt}
                    >
                      Schedule Notification
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
      </Card>

      {/* Scheduled Notifications */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Scheduled Notifications</span>
            <Badge variant="outline" className="text-xs">
              {scheduledNotifications.length} scheduled
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {scheduledNotifications.length > 0 ? (
            <div className="table-responsive">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Notification</TableHead>
                    <TableHead className="hidden md:table-cell">Audience</TableHead>
                    <TableHead>Schedule</TableHead>
                    <TableHead className="hidden lg:table-cell">Created</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {scheduledNotifications.map((notification:any) => (
                    <TableRow key={notification._id}>
                      <TableCell className="max-w-0">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <h4 className="font-medium text-sm truncate">
                              {notification.title}
                            </h4>
                            {notification.urgent && (
                              <Badge className="bg-red-500/10 text-red-500 border-red-500/20 text-xs">
                                Urgent
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground line-clamp-1">
                            {notification.body}
                          </p>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs">
                              {notification.type.replace(/_/g, " ")}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              via {notification.channels.join(", ")}
                            </span>
                          </div>
                        </div>
                      </TableCell>

                      <TableCell className="hidden md:table-cell">
                        <div className="space-y-1">
                          <span className="text-sm capitalize">
                            {notification.targetAudience.replace("_", " ")}
                          </span>
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Users className="h-3 w-3" />
                            {notification.recipientCount} users
                          </div>
                        </div>
                      </TableCell>

                      <TableCell>
                        <div className="space-y-1">
                          <div className="flex items-center gap-1 text-sm">
                            <Clock className="h-3 w-3 text-muted-foreground" />
                            {formatDateTime(notification.scheduledAt)}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            in {getTimeUntilScheduled(notification.scheduledAt)}
                          </div>
                        </div>
                      </TableCell>

                      <TableCell className="hidden lg:table-cell">
                        <div className="space-y-1">
                          <div className="text-xs text-muted-foreground">
                            {formatDateTime(notification.createdAt)}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            by {notification.senderName}
                          </div>
                        </div>
                      </TableCell>

                      <TableCell className="text-right">
                        <div className="flex items-center gap-2 justify-end">
                          <Button variant="ghost" size="sm">
                            <Edit className="h-3 w-3" />
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => handleCancelScheduled(notification._id)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-8">
              <CalendarDays className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No Scheduled Notifications</h3>
              <p className="text-muted-foreground mb-4">
                Schedule notifications to be sent at specific times
              </p>
              <Button onClick={() => setShowScheduleDialog(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Schedule Your First Notification
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Schedule Options */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="cursor-pointer hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                <Calendar className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <h4 className="font-medium text-sm">Daily Reminder</h4>
                <p className="text-xs text-muted-foreground">
                  Schedule daily system reminders
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-100 flex items-center justify-center">
                <CheckCircle className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <h4 className="font-medium text-sm">Weekly Update</h4>
                <p className="text-xs text-muted-foreground">
                  Schedule weekly progress updates
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-yellow-100 flex items-center justify-center">
                <AlertCircle className="h-5 w-5 text-yellow-500" />
              </div>
              <div>
                <h4 className="font-medium text-sm">Maintenance Alert</h4>
                <p className="text-xs text-muted-foreground">
                  Schedule maintenance notifications
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}