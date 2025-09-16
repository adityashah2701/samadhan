import { useState } from "react";
import {
    BookTemplate,
    Plus,
    Edit, Copy, TrendingUp,
    Search, Smartphone,
    Mail,
    MessageSquare,
    Globe,
    Settings,
    Info,
    AlertTriangle,
    CheckCircle
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";

import { NotificationTemplate } from "../page";

interface NotificationTemplatesProps {
  templates: any;
  onUseTemplate: (template: NotificationTemplate) => void;
}

export function NotificationTemplates({ templates, onUseTemplate }: NotificationTemplatesProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [audienceFilter, setAudienceFilter] = useState<string>("all");
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<NotificationTemplate | null>(null);

  // Template form state
  const [templateForm, setTemplateForm] = useState({
    title: "",
    body: "",
    type: "system" as NotificationTemplate["type"],
    channels: ["app"] as NotificationTemplate["channels"],
    targetAudience: "all_users" as NotificationTemplate["targetAudience"],
    variables: [] as string[],
    isActive: true
  });

  // Filter templates
  const filteredTemplates = templates.filter((template:any) => {
    const matchesSearch = template.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         template.body.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = typeFilter === "all" || template.type === typeFilter;
    const matchesAudience = audienceFilter === "all" || template.targetAudience === audienceFilter;
    
    return matchesSearch && matchesType && matchesAudience;
  });

  // Get unique types and audiences for filters
  const uniqueTypes = [...new Set(templates.map((t:any) => t.type))];
  const uniqueAudiences = [...new Set(templates.map((t:any) => t.targetAudience))];

  // Get type configuration
  const getTypeConfig = (type: string) => {
    const configs = {
      system: { icon: Settings, color: "bg-blue-500/10 text-blue-500 border-blue-500/20" },
      announcement: { icon: Info, color: "bg-green-500/10 text-green-500 border-green-500/20" },
      emergency: { icon: AlertTriangle, color: "bg-red-500/10 text-red-500 border-red-500/20" },
      maintenance: { icon: Settings, color: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20" },
      issue_update: { icon: CheckCircle, color: "bg-purple-500/10 text-purple-500 border-purple-500/20" }
    };
    return configs[type as keyof typeof configs] || configs.system;
  };

  // Get channel icon
  const getChannelIcon = (channel: string) => {
    const icons = {
      app: Smartphone,
      email: Mail,
      sms: MessageSquare,
      web: Globe
    };
    return icons[channel as keyof typeof icons] || MessageSquare;
  };

  // Handle template creation/editing
  const handleSaveTemplate = () => {
    if (!templateForm.title.trim() || !templateForm.body.trim()) {
      toast.error("Please fill in title and body");
      return;
    }

    // In a real app, this would call an API
    const newTemplate: NotificationTemplate = {
      id: editingTemplate?.id || Date.now().toString(),
      ...templateForm,
      createdAt: editingTemplate?.createdAt || Date.now(),
      usageCount: editingTemplate?.usageCount || 0
    };

    toast.success(editingTemplate ? "Template updated" : "Template created");
    
    // Reset form
    setTemplateForm({
      title: "",
      body: "",
      type: "system",
      channels: ["app"],
      targetAudience: "all_users",
      variables: [],
      isActive: true
    });
    
    setShowCreateDialog(false);
    setEditingTemplate(null);
  };

  // Handle template editing
  const handleEditTemplate = (template: NotificationTemplate) => {
    setTemplateForm({
      title: template.title,
      body: template.body,
      type: template.type,
      channels: template.channels,
      targetAudience: template.targetAudience,
      variables: template.variables,
      isActive: template.isActive
    });
    setEditingTemplate(template);
    setShowCreateDialog(true);
  };

  // Handle template duplication
  const handleDuplicateTemplate = (template: NotificationTemplate) => {
    setTemplateForm({
      title: `${template.title} (Copy)`,
      body: template.body,
      type: template.type,
      channels: template.channels,
      targetAudience: template.targetAudience,
      variables: template.variables,
      isActive: template.isActive
    });
    setEditingTemplate(null);
    setShowCreateDialog(true);
  };

  // Extract variables from template body
  const extractVariables = (text: string) => {
    const matches = text.match(/\{([^}]+)\}/g);
    return matches ? matches.map(match => match.slice(1, -1)) : [];
  };

  // Update variables when body changes
  const handleBodyChange = (body: string) => {
    const variables = extractVariables(body);
    setTemplateForm(prev => ({ ...prev, body, variables }));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <BookTemplate className="h-5 w-5" />
                Notification Templates
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Create and manage reusable notification templates
              </p>
            </div>
            
            <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
              <DialogTrigger asChild>
                <Button onClick={() => {
                  setEditingTemplate(null);
                  setTemplateForm({
                    title: "",
                    body: "",
                    type: "system",
                    channels: ["app"],
                    targetAudience: "all_users",
                    variables: [],
                    isActive: true
                  });
                }}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Template
                </Button>
              </DialogTrigger>
              
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>
                    {editingTemplate ? "Edit Template" : "Create New Template"}
                  </DialogTitle>
                </DialogHeader>
                
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="template-title">Title *</Label>
                    <Input
                      id="template-title"
                      placeholder="Template title..."
                      value={templateForm.title}
                      onChange={(e) => setTemplateForm(prev => ({ ...prev, title: e.target.value }))}
                    />
                  </div>

                  <div>
                    <Label htmlFor="template-body">Message Body *</Label>
                    <Textarea
                      id="template-body"
                      placeholder="Template message... Use {variable_name} for dynamic content"
                      value={templateForm.body}
                      onChange={(e) => handleBodyChange(e.target.value)}
                      className="min-h-[120px]"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Use curly braces for variables: {"{user_name}"}, {"{issue_title}"}, etc.
                    </p>
                  </div>

                  {templateForm.variables.length > 0 && (
                    <div>
                      <Label>Detected Variables</Label>
                      <div className="flex flex-wrap gap-2 mt-1">
                        {templateForm.variables.map(variable => (
                          <Badge key={variable} variant="secondary" className="text-xs">
                            {variable}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="template-type">Type</Label>
                      <Select
                        value={templateForm.type}
                        onValueChange={(value: NotificationTemplate["type"]) => 
                          setTemplateForm(prev => ({ ...prev, type: value }))
                        }
                      >
                        <SelectTrigger>
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
                      <Label htmlFor="template-audience">Default Audience</Label>
                      <Select
                        value={templateForm.targetAudience}
                        onValueChange={(value: NotificationTemplate["targetAudience"]) => 
                          setTemplateForm(prev => ({ ...prev, targetAudience: value }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all_users">All Users</SelectItem>
                          <SelectItem value="citizens">Citizens</SelectItem>
                          <SelectItem value="departments">Departments</SelectItem>
                          <SelectItem value="admins">Admins</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div>
                    <Label>Default Channels</Label>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-2">
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
                              id={`template-${channel.key}`}
                              checked={templateForm.channels.includes(channel.key as any)}
                              onCheckedChange={(checked) => {
                                if (checked) {
                                  setTemplateForm(prev => ({
                                    ...prev,
                                    channels: [...prev.channels, channel.key as any]
                                  }));
                                } else {
                                  setTemplateForm(prev => ({
                                    ...prev,
                                    channels: prev.channels.filter(c => c !== channel.key)
                                  }));
                                }
                              }}
                            />
                            <label htmlFor={`template-${channel.key}`} className="flex items-center space-x-2 text-sm cursor-pointer">
                              <Icon className="h-4 w-4" />
                              <span>{channel.label}</span>
                            </label>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Switch
                      id="template-active"
                      checked={templateForm.isActive}
                      onCheckedChange={(checked) => 
                        setTemplateForm(prev => ({ ...prev, isActive: checked }))
                      }
                    />
                    <Label htmlFor="template-active">Template is active</Label>
                  </div>

                  <Separator />

                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleSaveTemplate}>
                      {editingTemplate ? "Update Template" : "Create Template"}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        
        <CardContent>
          {/* Filters */}
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search templates..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
            
            <div className="flex gap-2">
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  {uniqueTypes.map((type:any) => (
                    <SelectItem key={type} value={type}>
                      {type.replace(/_/g, " ")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={audienceFilter} onValueChange={setAudienceFilter}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Audience" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Audiences</SelectItem>
                  {uniqueAudiences.map((audience:any) => (
                    <SelectItem key={audience!} value={audience!}>
                      {audience.replace(/_/g, " ")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Templates Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredTemplates.map((template:any) => {
              const typeConfig = getTypeConfig(template.type);
              const TypeIcon = typeConfig.icon;

              return (
                <Card key={template.id} className="border-border/50 hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="space-y-3">
                      {/* Header */}
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-sm truncate mb-1">{template.title}</h4>
                          <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                            {template.body}
                          </p>
                        </div>
                        <Badge 
                          variant={template.isActive ? "default" : "secondary"}
                          className="ml-2 text-xs"
                        >
                          {template.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </div>

                      {/* Metadata */}
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className={typeConfig.color}>
                            <TypeIcon className="h-3 w-3 mr-1" />
                            {template.type.replace(/_/g, " ")}
                          </Badge>
                          <span className="text-xs text-muted-foreground capitalize">
                            {template.targetAudience.replace("_", " ")}
                          </span>
                        </div>

                        <div className="flex items-center gap-2 flex-wrap">
                          {template.channels.map((channel:any) => {
                            const Icon = getChannelIcon(channel);
                            return (
                              <div key={channel} className="flex items-center gap-1 text-xs text-muted-foreground">
                                <Icon className="h-3 w-3" />
                                <span className="capitalize">{channel}</span>
                              </div>
                            );
                          })}
                        </div>

                        {template.variables.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {template.variables.slice(0, 3).map((variable:any) => (
                              <Badge key={variable} variant="outline" className="text-xs">
                                {variable}
                              </Badge>
                            ))}
                            {template.variables.length > 3 && (
                              <Badge variant="outline" className="text-xs">
                                +{template.variables.length - 3} more
                              </Badge>
                            )}
                          </div>
                        )}

                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <TrendingUp className="h-3 w-3" />
                            Used {template.usageCount} times
                          </div>
                          <span>
                            {new Date(template.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2 pt-2 border-t">
                        <Button 
                          size="sm" 
                          className="flex-1"
                          onClick={() => {
                            onUseTemplate(template);
                            toast.success("Template applied to composer");
                          }}
                        >
                          Use Template
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => handleEditTemplate(template)}
                        >
                          <Edit className="h-3 w-3" />
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline"
                          onClick={() => handleDuplicateTemplate(template)}
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {filteredTemplates.length === 0 && (
            <div className="text-center py-8">
              <BookTemplate className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No templates found</h3>
              <p className="text-muted-foreground mb-4">
                {searchTerm || typeFilter !== "all" || audienceFilter !== "all" 
                  ? "Try adjusting your filters" 
                  : "Create your first notification template to get started"
                }
              </p>
              {!searchTerm && typeFilter === "all" && audienceFilter === "all" && (
                <Button onClick={() => setShowCreateDialog(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Template
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}