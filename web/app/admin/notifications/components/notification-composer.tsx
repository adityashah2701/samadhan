import { useState, useEffect } from "react";
import { Send, MessageSquare, Mail, Smartphone, Globe, Bell } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";

import { NotificationFormData, NotificationTemplate } from "../page";

interface User {
  _id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  role: "citizen" | "admin" | "department";
}

interface NotificationComposerProps {
  users: User[];
  templates: any;
  onSendNotification: (data: NotificationFormData) => Promise<boolean>;
  initialData?: Partial<NotificationFormData>;
}

export function NotificationComposer({ 
  users, 
  templates, 
  onSendNotification,
  initialData 
}: NotificationComposerProps) {
  const [formData, setFormData] = useState<NotificationFormData>({
    title: "",
    body: "",
    type: "system",
    channels: ["app"],
    targetAudience: "all_users",
    customUserIds: [],
    urgent: false,
    scheduledAt: undefined,
    ...initialData
  });

  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [isSending, setIsSending] = useState(false);

  // Update form when initial data changes
  useEffect(() => {
    if (initialData) {
      setFormData(prev => ({ ...prev, ...initialData }));
    }
  }, [initialData]);

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
  const handleSubmit = async () => {
    if (!formData.title.trim() || !formData.body.trim()) {
      toast.error("Please fill in title and message");
      return;
    }

    if (formData.channels.length === 0) {
      toast.error("Please select at least one delivery channel");
      return;
    }

    if (formData.targetAudience === "custom" && selectedUsers.length === 0) {
      toast.error("Please select users for custom targeting");
      return;
    }

    setIsSending(true);

    try {
      const success = await onSendNotification({
        ...formData,
        customUserIds: formData.targetAudience === "custom" ? selectedUsers : undefined
      });

      if (success) {
        // Reset form
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
        setShowAdvanced(false);
      }
    } finally {
      setIsSending(false);
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
    toast.success("Template applied");
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Main Composer Form */}
      <div className="lg:col-span-2 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Send className="h-5 w-5" />
              Compose Notification
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Quick Templates */}
            {templates.length > 0 && (
              <div>
                <Label className="text-sm font-medium">Quick Templates</Label>
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
            <div className="space-y-4">
              <div>
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  placeholder="Notification title..."
                  value={formData.title}
                  onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="body">Message *</Label>
                <Textarea
                  id="body"
                  placeholder="Notification message..."
                  value={formData.body}
                  onChange={(e) => setFormData(prev => ({ ...prev, body: e.target.value }))}
                  className="mt-1 min-h-[120px]"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  {formData.body.length}/500 characters
                </p>
              </div>
            </div>

            {/* Type and Audience */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="type">Notification Type</Label>
                <Select
                  value={formData.type}
                  onValueChange={(value: NotificationFormData["type"]) => 
                    setFormData(prev => ({ ...prev, type: value }))
                  }
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="system">System</SelectItem>
                    <SelectItem value="announcement">Announcement</SelectItem>
                    <SelectItem value="emergency">Emergency</SelectItem>
                    <SelectItem value="maintenance">Maintenance</SelectItem>
                    <SelectItem value="issue_update">Issue Update</SelectItem>
                    <SelectItem value="new_comment">New Comment</SelectItem>
                    <SelectItem value="department_update">Department Update</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="audience">Target Audience</Label>
                <Select
                  value={formData.targetAudience}
                  onValueChange={(value: NotificationFormData["targetAudience"]) => 
                    setFormData(prev => ({ ...prev, targetAudience: value }))
                  }
                >
                  <SelectTrigger className="mt-1">
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

            {/* Delivery Channels */}
            <div>
              <Label>Delivery Channels</Label>
              <div className="mt-2 grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { key: "app", label: "Mobile App", icon: Smartphone },
                  { key: "email", label: "Email", icon: Mail },
                  { key: "sms", label: "SMS", icon: MessageSquare },
                  { key: "web", label: "Web Portal", icon: Globe }
                ].map((channel) => {
                  const Icon = channel.icon;
                  return (
                    <div key={channel.key} className="flex items-center space-x-2">
                      <Checkbox
                        id={channel.key}
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
                      <label htmlFor={channel.key} className="flex items-center space-x-2 text-sm cursor-pointer">
                        <Icon className="h-4 w-4" />
                        <span>{channel.label}</span>
                      </label>
                    </div>
                  );
                })}
              </div>
            </div>

            <Separator />

            {/* Action Buttons */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="urgent"
                  checked={formData.urgent}
                  onCheckedChange={(checked) => 
                    setFormData(prev => ({ ...prev, urgent: !!checked }))
                  }
                />
                <label htmlFor="urgent" className="text-sm cursor-pointer">
                  Mark as urgent
                </label>
              </div>

              <Button
                onClick={handleSubmit}
                disabled={isSending || !formData.title.trim() || !formData.body.trim()}
                className="min-w-[120px]"
              >
                {isSending ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Send Now
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Sidebar - Preview and Stats */}
      <div className="space-y-6">
        {/* Preview Card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-sm flex items-center justify-between">
              <span>Preview</span>
              {formData.urgent && (
                <Badge className="bg-red-500/10 text-red-500 border-red-500/20">
                  Urgent
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {/* Mobile App Preview */}
              <div className="p-3 rounded-lg border bg-card">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center">
                    <Bell className="h-4 w-4 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-sm mb-1">
                      {formData.title || "Notification Title"}
                    </h4>
                    <p className="text-xs text-muted-foreground line-clamp-3">
                      {formData.body || "Notification message will appear here..."}
                    </p>
                    <div className="flex items-center gap-1 mt-2">
                      {formData.channels.map((channel) => {
                        const icons = {
                          app: Smartphone,
                          email: Mail,
                          sms: MessageSquare,
                          web: Globe
                        };
                        const Icon = icons[channel];
                        return Icon ? <Icon key={channel} className="h-3 w-3 text-muted-foreground" /> : null;
                      })}
                    </div>
                  </div>
                </div>
              </div>

              {/* Delivery Info */}
              <div className="space-y-2 pt-2 border-t">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">Target Users:</span>
                  <span className="font-medium">{getTargetUserCount()}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">Channels:</span>
                  <span className="font-medium">{formData.channels.length}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-muted-foreground">Priority:</span>
                  <span className={`font-medium ${formData.urgent ? "text-red-500" : "text-green-500"}`}>
                    {formData.urgent ? "High" : "Normal"}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
