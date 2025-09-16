import React, { useState } from "react";
import { 
  Settings, 
  Bell, 
  Mail, 
  Smartphone, 
  Globe, 
  Clock, 
  Shield, 
  Zap,
  Save,
  RotateCcw,
  AlertTriangle,
  CheckCircle,
  Info,
  MessageSquare
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

interface NotificationChannel {
  id: string;
  name: string;
  icon: React.ComponentType<any>;
  enabled: boolean;
  config: Record<string, any>;
}

export function NotificationSettings() {
  const [hasChanges, setHasChanges] = useState(false);
  
  // General Settings
  const [generalSettings, setGeneralSettings] = useState({
    maxNotificationsPerHour: 10,
    maxNotificationsPerDay: 50,
    enableRateLimiting: true,
    enableDeliveryTracking: true,
    enableReadReceipts: true,
    defaultRetryAttempts: 3,
    batchSize: 100,
    enableScheduledDelivery: true,
    timeZone: "Asia/Kolkata"
  });

  // Channel Settings
  const [channels, setChannels] = useState<NotificationChannel[]>([
    {
      id: "app",
      name: "Mobile App (Push)",
      icon: Smartphone,
      enabled: true,
      config: {
        enableSound: true,
        enableVibration: true,
        enableBadge: true,
        priority: "high",
        expoProjectId: "e7b433c9-4b7c-4b8e-bbfc-453d36608c00"
      }
    },
    {
      id: "email",
      name: "Email",
      icon: Mail,
      enabled: true,
      config: {
        smtpHost: "smtp.gmail.com",
        smtpPort: 587,
        enableTLS: true,
        fromEmail: "noreply@samadhan.gov.in",
        fromName: "Samadhan System",
        enableTemplates: true,
        enableUnsubscribe: true
      }
    },
    {
      id: "sms",
      name: "SMS",
      icon: MessageSquare,
      enabled: false,
      config: {
        provider: "twilio",
        fromNumber: "+919876543210",
        enableDeliveryReports: true,
        maxLength: 160
      }
    },
    {
      id: "web",
      name: "Web Portal",
      icon: Globe,
      enabled: true,
      config: {
        enableInAppNotifications: true,
        enableBrowserNotifications: true,
        enableDesktopNotifications: false,
        retentionDays: 30
      }
    }
  ]);

  // Template Settings
  const [templateSettings, setTemplateSettings] = useState({
    enableCustomTemplates: true,
    enableVariableSubstitution: true,
    defaultLanguage: "en",
    enableMultiLanguage: false,
    supportedLanguages: ["en", "hi", "mr"],
    enableRichText: true
  });

  // Security Settings
  const [securitySettings, setSecuritySettings] = useState({
    requireApprovalForBulk: true,
    bulkNotificationThreshold: 100,
    enableNotificationAudit: true,
    enableIPWhitelist: false,
    allowedIPs: [],
    enableEncryption: true,
    enableTwoFactorForBulk: false
  });

  // Performance Settings
  const [performanceSettings, setPerformanceSettings] = useState({
    enableCaching: true,
    cacheExpiryMinutes: 60,
    enableCompression: true,
    enableBatching: true,
    queueProcessingInterval: 30,
    maxConcurrentSends: 50,
    enableFailureRetry: true,
    retryDelaySeconds: 60
  });

  // Handle setting updates
  const updateGeneralSettings = (key: string, value: any) => {
    setGeneralSettings(prev => ({ ...prev, [key]: value }));
    setHasChanges(true);
  };

  const updateChannelConfig = (channelId: string, key: string, value: any) => {
    setChannels(prev => prev.map(channel => 
      channel.id === channelId 
        ? { ...channel, config: { ...channel.config, [key]: value } }
        : channel
    ));
    setHasChanges(true);
  };

  const toggleChannel = (channelId: string) => {
    setChannels(prev => prev.map(channel => 
      channel.id === channelId 
        ? { ...channel, enabled: !channel.enabled }
        : channel
    ));
    setHasChanges(true);
  };

  // Save settings
  const handleSaveSettings = async () => {
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      toast.success("Settings saved successfully");
      setHasChanges(false);
    } catch (error) {
      toast.error("Failed to save settings");
    }
  };

  // Reset settings
  const handleResetSettings = () => {
    // Reset to defaults
    toast.success("Settings reset to defaults");
    setHasChanges(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Notification Settings
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Configure notification channels, templates, and system behavior
              </p>
            </div>
            
            <div className="flex items-center gap-2">
              {hasChanges && (
                <Badge variant="outline" className="text-orange-500 border-orange-500">
                  Unsaved Changes
                </Badge>
              )}
              <Button variant="outline" onClick={handleResetSettings}>
                <RotateCcw className="h-4 w-4 mr-2" />
                Reset
              </Button>
              <Button onClick={handleSaveSettings} disabled={!hasChanges}>
                <Save className="h-4 w-4 mr-2" />
                Save Changes
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      <Tabs defaultValue="general" className="w-full">
        <TabsList className="grid w-full grid-cols-2 lg:grid-cols-5">
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="channels">Channels</TabsTrigger>
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="performance">Performance</TabsTrigger>
        </TabsList>

        {/* General Settings */}
        <TabsContent value="general" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Rate Limiting</CardTitle>
              <p className="text-sm text-muted-foreground">
                Control notification frequency to prevent spam
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="max-hourly">Max Notifications per Hour</Label>
                  <Input
                    id="max-hourly"
                    type="number"
                    value={generalSettings.maxNotificationsPerHour}
                    onChange={(e) => updateGeneralSettings('maxNotificationsPerHour', parseInt(e.target.value))}
                  />
                </div>
                <div>
                  <Label htmlFor="max-daily">Max Notifications per Day</Label>
                  <Input
                    id="max-daily"
                    type="number"
                    value={generalSettings.maxNotificationsPerDay}
                    onChange={(e) => updateGeneralSettings('maxNotificationsPerDay', parseInt(e.target.value))}
                  />
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                <Switch
                  id="enable-rate-limiting"
                  checked={generalSettings.enableRateLimiting}
                  onCheckedChange={(checked) => updateGeneralSettings('enableRateLimiting', checked)}
                />
                <Label htmlFor="enable-rate-limiting">Enable rate limiting</Label>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Delivery & Tracking</CardTitle>
              <p className="text-sm text-muted-foreground">
                Configure delivery behavior and tracking options
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="retry-attempts">Default Retry Attempts</Label>
                  <Input
                    id="retry-attempts"
                    type="number"
                    min="0"
                    max="5"
                    value={generalSettings.defaultRetryAttempts}
                    onChange={(e) => updateGeneralSettings('defaultRetryAttempts', parseInt(e.target.value))}
                  />
                </div>
                <div>
                  <Label htmlFor="batch-size">Batch Size</Label>
                  <Input
                    id="batch-size"
                    type="number"
                    min="10"
                    max="1000"
                    value={generalSettings.batchSize}
                    onChange={(e) => updateGeneralSettings('batchSize', parseInt(e.target.value))}
                  />
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="enable-tracking"
                    checked={generalSettings.enableDeliveryTracking}
                    onCheckedChange={(checked) => updateGeneralSettings('enableDeliveryTracking', checked)}
                  />
                  <Label htmlFor="enable-tracking">Enable delivery tracking</Label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Switch
                    id="enable-read-receipts"
                    checked={generalSettings.enableReadReceipts}
                    onCheckedChange={(checked) => updateGeneralSettings('enableReadReceipts', checked)}
                  />
                  <Label htmlFor="enable-read-receipts">Enable read receipts</Label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Switch
                    id="enable-scheduled"
                    checked={generalSettings.enableScheduledDelivery}
                    onCheckedChange={(checked) => updateGeneralSettings('enableScheduledDelivery', checked)}
                  />
                  <Label htmlFor="enable-scheduled">Enable scheduled delivery</Label>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">System Configuration</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="timezone">Default Time Zone</Label>
                <Select value={generalSettings.timeZone} onValueChange={(value) => updateGeneralSettings('timeZone', value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Asia/Kolkata">Asia/Kolkata (IST)</SelectItem>
                    <SelectItem value="UTC">UTC</SelectItem>
                    <SelectItem value="America/New_York">America/New_York</SelectItem>
                    <SelectItem value="Europe/London">Europe/London</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Channel Settings */}
        <TabsContent value="channels" className="space-y-6">
          {channels.map((channel) => {
            const Icon = channel.icon;
            return (
              <Card key={channel.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Icon className="h-5 w-5" />
                      <div>
                        <CardTitle className="text-lg">{channel.name}</CardTitle>
                        <p className="text-sm text-muted-foreground">
                          Configure {channel.name.toLowerCase()} delivery settings
                        </p>
                      </div>
                    </div>
                    <Switch
                      checked={channel.enabled}
                      onCheckedChange={() => toggleChannel(channel.id)}
                    />
                  </div>
                </CardHeader>
                
                {channel.enabled && (
                  <CardContent className="space-y-4">
                    {/* App Channel Settings */}
                    {channel.id === "app" && (
                      <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <Label>Priority</Label>
                            <Select 
                              value={channel.config.priority} 
                              onValueChange={(value) => updateChannelConfig(channel.id, 'priority', value)}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="low">Low</SelectItem>
                                <SelectItem value="normal">Normal</SelectItem>
                                <SelectItem value="high">High</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label>Expo Project ID</Label>
                            <Input
                              value={channel.config.expoProjectId}
                              onChange={(e) => updateChannelConfig(channel.id, 'expoProjectId', e.target.value)}
                            />
                          </div>
                        </div>
                        
                        <div className="space-y-3">
                          <div className="flex items-center space-x-2">
                            <Switch
                              checked={channel.config.enableSound}
                              onCheckedChange={(checked) => updateChannelConfig(channel.id, 'enableSound', checked)}
                            />
                            <Label>Enable sound</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Switch
                              checked={channel.config.enableVibration}
                              onCheckedChange={(checked) => updateChannelConfig(channel.id, 'enableVibration', checked)}
                            />
                            <Label>Enable vibration</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Switch
                              checked={channel.config.enableBadge}
                              onCheckedChange={(checked) => updateChannelConfig(channel.id, 'enableBadge', checked)}
                            />
                            <Label>Enable badge count</Label>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Email Channel Settings */}
                    {channel.id === "email" && (
                      <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <Label>SMTP Host</Label>
                            <Input
                              value={channel.config.smtpHost}
                              onChange={(e) => updateChannelConfig(channel.id, 'smtpHost', e.target.value)}
                            />
                          </div>
                          <div>
                            <Label>SMTP Port</Label>
                            <Input
                              type="number"
                              value={channel.config.smtpPort}
                              onChange={(e) => updateChannelConfig(channel.id, 'smtpPort', parseInt(e.target.value))}
                            />
                          </div>
                          <div>
                            <Label>From Email</Label>
                            <Input
                              value={channel.config.fromEmail}
                              onChange={(e) => updateChannelConfig(channel.id, 'fromEmail', e.target.value)}
                            />
                          </div>
                          <div>
                            <Label>From Name</Label>
                            <Input
                              value={channel.config.fromName}
                              onChange={(e) => updateChannelConfig(channel.id, 'fromName', e.target.value)}
                            />
                          </div>
                        </div>
                        
                        <div className="space-y-3">
                          <div className="flex items-center space-x-2">
                            <Switch
                              checked={channel.config.enableTLS}
                              onCheckedChange={(checked) => updateChannelConfig(channel.id, 'enableTLS', checked)}
                            />
                            <Label>Enable TLS encryption</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Switch
                              checked={channel.config.enableTemplates}
                              onCheckedChange={(checked) => updateChannelConfig(channel.id, 'enableTemplates', checked)}
                            />
                            <Label>Enable HTML templates</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Switch
                              checked={channel.config.enableUnsubscribe}
                              onCheckedChange={(checked) => updateChannelConfig(channel.id, 'enableUnsubscribe', checked)}
                            />
                            <Label>Include unsubscribe links</Label>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* SMS Channel Settings */}
                    {channel.id === "sms" && (
                      <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <Label>SMS Provider</Label>
                            <Select 
                              value={channel.config.provider} 
                              onValueChange={(value) => updateChannelConfig(channel.id, 'provider', value)}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="twilio">Twilio</SelectItem>
                                <SelectItem value="aws-sns">AWS SNS</SelectItem>
                                <SelectItem value="textlocal">TextLocal</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label>From Number</Label>
                            <Input
                              value={channel.config.fromNumber}
                              onChange={(e) => updateChannelConfig(channel.id, 'fromNumber', e.target.value)}
                            />
                          </div>
                          <div>
                            <Label>Max Message Length</Label>
                            <Input
                              type="number"
                              value={channel.config.maxLength}
                              onChange={(e) => updateChannelConfig(channel.id, 'maxLength', parseInt(e.target.value))}
                            />
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <Switch
                            checked={channel.config.enableDeliveryReports}
                            onCheckedChange={(checked) => updateChannelConfig(channel.id, 'enableDeliveryReports', checked)}
                          />
                          <Label>Enable delivery reports</Label>
                        </div>
                      </div>
                    )}

                    {/* Web Channel Settings */}
                    {channel.id === "web" && (
                      <div className="space-y-4">
                        <div>
                          <Label>Notification Retention (Days)</Label>
                          <Input
                            type="number"
                            value={channel.config.retentionDays}
                            onChange={(e) => updateChannelConfig(channel.id, 'retentionDays', parseInt(e.target.value))}
                          />
                        </div>
                        
                        <div className="space-y-3">
                          <div className="flex items-center space-x-2">
                            <Switch
                              checked={channel.config.enableInAppNotifications}
                              onCheckedChange={(checked) => updateChannelConfig(channel.id, 'enableInAppNotifications', checked)}
                            />
                            <Label>Enable in-app notifications</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Switch
                              checked={channel.config.enableBrowserNotifications}
                              onCheckedChange={(checked) => updateChannelConfig(channel.id, 'enableBrowserNotifications', checked)}
                            />
                            <Label>Enable browser notifications</Label>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Switch
                              checked={channel.config.enableDesktopNotifications}
                              onCheckedChange={(checked) => updateChannelConfig(channel.id, 'enableDesktopNotifications', checked)}
                            />
                            <Label>Enable desktop notifications</Label>
                          </div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                )}
              </Card>
            );
          })}
        </TabsContent>

        {/* Template Settings */}
        <TabsContent value="templates" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Template Configuration</CardTitle>
              <p className="text-sm text-muted-foreground">
                Configure notification templates and customization options
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={templateSettings.enableCustomTemplates}
                    onCheckedChange={(checked) => setTemplateSettings(prev => ({ ...prev, enableCustomTemplates: checked }))}
                  />
                  <Label>Enable custom templates</Label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={templateSettings.enableVariableSubstitution}
                    onCheckedChange={(checked) => setTemplateSettings(prev => ({ ...prev, enableVariableSubstitution: checked }))}
                  />
                  <Label>Enable variable substitution</Label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={templateSettings.enableRichText}
                    onCheckedChange={(checked) => setTemplateSettings(prev => ({ ...prev, enableRichText: checked }))}
                  />
                  <Label>Enable rich text formatting</Label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={templateSettings.enableMultiLanguage}
                    onCheckedChange={(checked) => setTemplateSettings(prev => ({ ...prev, enableMultiLanguage: checked }))}
                  />
                  <Label>Enable multi-language support</Label>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Default Language</Label>
                  <Select 
                    value={templateSettings.defaultLanguage} 
                    onValueChange={(value) => setTemplateSettings(prev => ({ ...prev, defaultLanguage: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="en">English</SelectItem>
                      <SelectItem value="hi">Hindi</SelectItem>
                      <SelectItem value="mr">Marathi</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Default Templates</CardTitle>
              <p className="text-sm text-muted-foreground">
                Configure system default notification templates
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Email Header Template</Label>
                <Textarea
                  placeholder="Email header HTML..."
                  className="min-h-[100px] font-mono text-sm"
                  defaultValue={`<div style="background: #16a34a; padding: 20px; text-align: center;">
  <h1 style="color: white; margin: 0;">Samadhan</h1>
  <p style="color: white; margin: 5px 0 0 0;">Civic Issue Management System</p>
</div>`}
                />
              </div>
              
              <div>
                <Label>Email Footer Template</Label>
                <Textarea
                  placeholder="Email footer HTML..."
                  className="min-h-[80px] font-mono text-sm"
                  defaultValue={`<div style="background: #f3f4f6; padding: 15px; text-align: center; border-top: 1px solid #e5e7eb;">
  <p style="color: #6b7280; font-size: 12px; margin: 0;">
    This email was sent from Samadhan - Civic Issue Management System
  </p>
</div>`}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security Settings */}
        <TabsContent value="security" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Access Control
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Configure security and access control for notifications
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={securitySettings.requireApprovalForBulk}
                    onCheckedChange={(checked) => setSecuritySettings(prev => ({ ...prev, requireApprovalForBulk: checked }))}
                  />
                  <Label>Require approval for bulk notifications</Label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={securitySettings.enableNotificationAudit}
                    onCheckedChange={(checked) => setSecuritySettings(prev => ({ ...prev, enableNotificationAudit: checked }))}
                  />
                  <Label>Enable notification audit logging</Label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={securitySettings.enableTwoFactorForBulk}
                    onCheckedChange={(checked) => setSecuritySettings(prev => ({ ...prev, enableTwoFactorForBulk: checked }))}
                  />
                  <Label>Require 2FA for bulk notifications</Label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={securitySettings.enableEncryption}
                    onCheckedChange={(checked) => setSecuritySettings(prev => ({ ...prev, enableEncryption: checked }))}
                  />
                  <Label>Enable notification content encryption</Label>
                </div>
              </div>

              <div>
                <Label>Bulk Notification Threshold</Label>
                <Input
                  type="number"
                  value={securitySettings.bulkNotificationThreshold}
                  onChange={(e) => setSecuritySettings(prev => ({ ...prev, bulkNotificationThreshold: parseInt(e.target.value) }))}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Notifications above this count require approval
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">IP Restrictions</CardTitle>
              <p className="text-sm text-muted-foreground">
                Restrict notification access to specific IP addresses
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-2">
                <Switch
                  checked={securitySettings.enableIPWhitelist}
                  onCheckedChange={(checked) => setSecuritySettings(prev => ({ ...prev, enableIPWhitelist: checked }))}
                />
                <Label>Enable IP whitelist</Label>
              </div>

              {securitySettings.enableIPWhitelist && (
                <div>
                  <Label>Allowed IP Addresses</Label>
                  <Textarea
                    placeholder="Enter IP addresses, one per line..."
                    className="min-h-[100px]"
                    defaultValue="192.168.1.0/24&#10;10.0.0.0/8"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Supports individual IPs (192.168.1.1) and CIDR notation (192.168.1.0/24)
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Performance Settings */}
        <TabsContent value="performance" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Zap className="h-5 w-5" />
                Performance Optimization
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Configure performance and reliability settings
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Queue Processing Interval (seconds)</Label>
                  <Input
                    type="number"
                    value={performanceSettings.queueProcessingInterval}
                    onChange={(e) => setPerformanceSettings(prev => ({ ...prev, queueProcessingInterval: parseInt(e.target.value) }))}
                  />
                </div>
                <div>
                  <Label>Max Concurrent Sends</Label>
                  <Input
                    type="number"
                    value={performanceSettings.maxConcurrentSends}
                    onChange={(e) => setPerformanceSettings(prev => ({ ...prev, maxConcurrentSends: parseInt(e.target.value) }))}
                  />
                </div>
                <div>
                  <Label>Cache Expiry (minutes)</Label>
                  <Input
                    type="number"
                    value={performanceSettings.cacheExpiryMinutes}
                    onChange={(e) => setPerformanceSettings(prev => ({ ...prev, cacheExpiryMinutes: parseInt(e.target.value) }))}
                  />
                </div>
                <div>
                  <Label>Retry Delay (seconds)</Label>
                  <Input
                    type="number"
                    value={performanceSettings.retryDelaySeconds}
                    onChange={(e) => setPerformanceSettings(prev => ({ ...prev, retryDelaySeconds: parseInt(e.target.value) }))}
                  />
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={performanceSettings.enableCaching}
                    onCheckedChange={(checked) => setPerformanceSettings(prev => ({ ...prev, enableCaching: checked }))}
                  />
                  <Label>Enable notification caching</Label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={performanceSettings.enableCompression}
                    onCheckedChange={(checked) => setPerformanceSettings(prev => ({ ...prev, enableCompression: checked }))}
                  />
                  <Label>Enable content compression</Label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={performanceSettings.enableBatching}
                    onCheckedChange={(checked) => setPerformanceSettings(prev => ({ ...prev, enableBatching: checked }))}
                  />
                  <Label>Enable batch processing</Label>
                </div>
                
                <div className="flex items-center space-x-2">
                  <Switch
                    checked={performanceSettings.enableFailureRetry}
                    onCheckedChange={(checked) => setPerformanceSettings(prev => ({ ...prev, enableFailureRetry: checked }))}
                  />
                  <Label>Enable automatic retry on failure</Label>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Health Monitoring</CardTitle>
              <p className="text-sm text-muted-foreground">
                Monitor system health and performance metrics
              </p>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span className="text-sm font-medium text-green-900">Queue Status</span>
                  </div>
                  <p className="text-2xl font-bold text-green-900">Healthy</p>
                  <p className="text-xs text-green-700">Processing normally</p>
                </div>

                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                  <div className="flex items-center gap-2 mb-2">
                    <Info className="h-4 w-4 text-blue-500" />
                    <span className="text-sm font-medium text-blue-900">Queue Size</span>
                  </div>
                  <p className="text-2xl font-bold text-blue-900">23</p>
                  <p className="text-xs text-blue-700">Pending notifications</p>
                </div>

                <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                  <div className="flex items-center gap-2 mb-2">
                    <Clock className="h-4 w-4 text-yellow-500" />
                    <span className="text-sm font-medium text-yellow-900">Avg Processing</span>
                  </div>
                  <p className="text-2xl font-bold text-yellow-900">1.2s</p>
                  <p className="text-xs text-yellow-700">Per notification</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}