import { useState } from "react";
import {
    TrendingUp,
    Users,
    Bell,
    Eye,
    Calendar,
    BarChart3, Download, Target,
    Clock,
    CheckCircle,
    XCircle,
    AlertTriangle
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";

interface NotificationStats {
  totalAdminNotifications: number;
  totalUserNotifications: number;
  totalSent: number;
  totalDelivered: number;
  totalRead: number;
  deliveryRate: number;
  readRate: number;
  byType: Record<string, number>;
  byStatus: Record<string, number>;
}

interface NotificationHistoryItem {
  _id: string;
  title: string;
  type: string;
  channels: string[];
  targetAudience: string;
  recipientCount: number;
  deliveredCount: number;
  readCount: number;
  status: string;
  createdAt: number;
  sentAt?: number;
}

interface NotificationAnalyticsProps {
  stats?: NotificationStats;
  history: NotificationHistoryItem[];
}

export function NotificationAnalytics({ stats, history }: NotificationAnalyticsProps) {
  const [timeRange, setTimeRange] = useState("30d");
  const [metricView, setMetricView] = useState("overview");

  // Calculate analytics from history data
  const calculateChannelPerformance = () => {
    const channelStats: Record<string, { sent: number; delivered: number; read: number }> = {};
    
    history.forEach(notification => {
      notification.channels.forEach(channel => {
        if (!channelStats[channel]) {
          channelStats[channel] = { sent: 0, delivered: 0, read: 0 };
        }
        channelStats[channel].sent += notification.recipientCount;
        channelStats[channel].delivered += notification.deliveredCount;
        channelStats[channel].read += notification.readCount;
      });
    });

    return Object.entries(channelStats).map(([channel, data]) => ({
      channel,
      ...data,
      deliveryRate: data.sent > 0 ? Math.round((data.delivered / data.sent) * 100) : 0,
      readRate: data.delivered > 0 ? Math.round((data.read / data.delivered) * 100) : 0
    }));
  };

  // Calculate audience performance
  const calculateAudiencePerformance = () => {
    const audienceStats: Record<string, { sent: number; delivered: number; read: number }> = {};
    
    history.forEach(notification => {
      const audience = notification.targetAudience;
      if (!audienceStats[audience]) {
        audienceStats[audience] = { sent: 0, delivered: 0, read: 0 };
      }
      audienceStats[audience].sent += notification.recipientCount;
      audienceStats[audience].delivered += notification.deliveredCount;
      audienceStats[audience].read += notification.readCount;
    });

    return Object.entries(audienceStats).map(([audience, data]) => ({
      audience: audience.replace(/_/g, " "),
      ...data,
      deliveryRate: data.sent > 0 ? Math.round((data.delivered / data.sent) * 100) : 0,
      readRate: data.delivered > 0 ? Math.round((data.read / data.delivered) * 100) : 0
    }));
  };

  // Calculate time-based trends
  const calculateTrends = () => {
    const now = new Date();
    const days = timeRange === "7d" ? 7 : timeRange === "30d" ? 30 : 90;
    const trends: Record<string, { sent: number; delivered: number; read: number }> = {};
    
    // Initialize all days
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const key = date.toISOString().split('T')[0];
      trends[key] = { sent: 0, delivered: 0, read: 0 };
    }

    // Populate with actual data
    history.forEach(notification => {
      if (notification.sentAt) {
        const date = new Date(notification.sentAt).toISOString().split('T')[0];
        if (trends[date]) {
          trends[date].sent += notification.recipientCount;
          trends[date].delivered += notification.deliveredCount;
          trends[date].read += notification.readCount;
        }
      }
    });

    return Object.entries(trends).map(([date, data]) => ({
      date,
      ...data
    }));
  };

  // Get status color
  const getStatusColor = (status: string) => {
    const colors = {
      delivered: "text-green-500",
      sent: "text-yellow-500",
      scheduled: "text-blue-500",
      failed: "text-red-500"
    };
    return colors[status as keyof typeof colors] || "text-gray-500";
  };

  // Get type color
  const getTypeColor = (type: string) => {
    const colors = {
      system: "bg-blue-500/10 text-blue-500",
      announcement: "bg-green-500/10 text-green-500",
      emergency: "bg-red-500/10 text-red-500",
      maintenance: "bg-yellow-500/10 text-yellow-500",
      issue_update: "bg-purple-500/10 text-purple-500"
    };
    return colors[type as keyof typeof colors] || "bg-gray-500/10 text-gray-500";
  };

  const channelPerformance = calculateChannelPerformance();
  const audiencePerformance = calculateAudiencePerformance();
  const trends = calculateTrends();

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Notification Analytics
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Track performance and engagement metrics
              </p>
            </div>
            
            <div className="flex items-center gap-2">
              <Select value={timeRange} onValueChange={setTimeRange}>
                <SelectTrigger className="w-[120px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7d">Last 7 days</SelectItem>
                  <SelectItem value="30d">Last 30 days</SelectItem>
                  <SelectItem value="90d">Last 90 days</SelectItem>
                </SelectContent>
              </Select>
              
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Sent</CardTitle>
            <Bell className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalSent || 0}</div>
            <p className="text-xs text-muted-foreground">
              {stats?.totalAdminNotifications || 0} admin notifications
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Delivery Rate</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.deliveryRate || 0}%</div>
            <p className="text-xs text-muted-foreground">
              {stats?.totalDelivered || 0} delivered
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Engagement Rate</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.readRate || 0}%</div>
            <p className="text-xs text-muted-foreground">
              {stats?.totalRead || 0} read
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {Math.round((stats?.totalRead || 0) / Math.max(history.length, 1))}
            </div>
            <p className="text-xs text-muted-foreground">
              Average per notification
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Performance Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Channel Performance */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Channel Performance</CardTitle>
            <p className="text-sm text-muted-foreground">
              Delivery and engagement rates by channel
            </p>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {channelPerformance.map((channel) => (
                <div key={channel.channel} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium capitalize">
                        {channel.channel}
                      </span>
                      <Badge variant="outline" className="text-xs">
                        {channel.sent} sent
                      </Badge>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {channel.deliveryRate}% delivery, {channel.readRate}% read
                    </div>
                  </div>
                  
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span>Delivery</span>
                      <span>{channel.deliveryRate}%</span>
                    </div>
                    <Progress value={channel.deliveryRate} className="h-2" />
                  </div>
                  
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span>Engagement</span>
                      <span>{channel.readRate}%</span>
                    </div>
                    <Progress value={channel.readRate} className="h-2" />
                  </div>
                </div>
              ))}
              
              {channelPerformance.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  No channel data available
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Audience Performance */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Audience Performance</CardTitle>
            <p className="text-sm text-muted-foreground">
              Engagement rates by target audience
            </p>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {audiencePerformance.map((audience) => (
                <div key={audience.audience} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium capitalize">
                        {audience.audience}
                      </span>
                      <Badge variant="outline" className="text-xs">
                        {audience.sent} sent
                      </Badge>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {audience.readRate}% engagement
                    </div>
                  </div>
                  
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span>Engagement</span>
                      <span>{audience.readRate}%</span>
                    </div>
                    <Progress value={audience.readRate} className="h-2" />
                  </div>
                </div>
              ))}
              
              {audiencePerformance.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  No audience data available
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Notification Types Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Type Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Notification Types</CardTitle>
            <p className="text-sm text-muted-foreground">
              Distribution by notification type
            </p>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats && Object.entries(stats.byType).map(([type, count]) => {
                const percentage = Math.round((count / (stats.totalAdminNotifications || 1)) * 100);
                return (
                  <div key={type} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className={getTypeColor(type)}>
                        {type.replace(/_/g, " ")}
                      </Badge>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {count} ({percentage}%)
                    </div>
                  </div>
                );
              })}
              
              {(!stats || Object.keys(stats.byType).length === 0) && (
                <div className="text-center py-4 text-muted-foreground">
                  No type data available
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Status Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Status Distribution</CardTitle>
            <p className="text-sm text-muted-foreground">
              Current notification statuses
            </p>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats && Object.entries(stats.byStatus).map(([status, count]) => {
                const percentage = Math.round((count / (stats.totalAdminNotifications || 1)) * 100);
                const statusIcons = {
                  delivered: CheckCircle,
                  sent: Clock,
                  scheduled: Calendar,
                  failed: XCircle
                };
                const StatusIcon = statusIcons[status as keyof typeof statusIcons] || Clock;
                
                return (
                  <div key={status} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <StatusIcon className={`h-4 w-4 ${getStatusColor(status)}`} />
                      <span className="text-sm capitalize">{status}</span>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {count} ({percentage}%)
                    </div>
                  </div>
                );
              })}
              
              {(!stats || Object.keys(stats.byStatus).length === 0) && (
                <div className="text-center py-4 text-muted-foreground">
                  No status data available
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Recent Activity</CardTitle>
            <p className="text-sm text-muted-foreground">
              Latest notification trends
            </p>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {history.slice(0, 5).map((notification) => (
                <div key={notification._id} className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-green-500"></div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">
                      {notification.title}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {notification.recipientCount} users • {
                        Math.round((notification.readCount / Math.max(notification.deliveredCount, 1)) * 100)
                      }% engagement
                    </p>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {new Date(notification.createdAt).toLocaleDateString()}
                  </div>
                </div>
              ))}
              
              {history.length === 0 && (
                <div className="text-center py-4 text-muted-foreground">
                  No recent activity
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Performance Insights */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Performance Insights</CardTitle>
          <p className="text-sm text-muted-foreground">
            AI-powered recommendations to improve notification performance
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Best Performing Channel */}
            {channelPerformance.length > 0 && (
              <div className="p-4 rounded-lg bg-green-50 border border-green-200">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle className="h-4 w-4 text-green-500" />
                  <span className="text-sm font-medium text-green-900">Best Channel</span>
                </div>
                <p className="text-sm text-green-800">
                  {channelPerformance.reduce((best, current) => 
                    current.readRate > best.readRate ? current : best
                  ).channel.toUpperCase()} has the highest engagement rate at{" "}
                  {channelPerformance.reduce((best, current) => 
                    current.readRate > best.readRate ? current : best
                  ).readRate}%
                </p>
              </div>
            )}

            {/* Improvement Opportunity */}
            {stats && stats.deliveryRate < 95 && (
              <div className="p-4 rounded-lg bg-yellow-50 border border-yellow-200">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="h-4 w-4 text-yellow-500" />
                  <span className="text-sm font-medium text-yellow-900">Delivery Rate</span>
                </div>
                <p className="text-sm text-yellow-800">
                  Consider reviewing failed deliveries. Current rate is {stats.deliveryRate}%, 
                  aim for 95%+ for optimal performance.
                </p>
              </div>
            )}

            {/* Engagement Tip */}
            {stats && stats.readRate < 60 && (
              <div className="p-4 rounded-lg bg-blue-50 border border-blue-200">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="h-4 w-4 text-blue-500" />
                  <span className="text-sm font-medium text-blue-900">Engagement</span>
                </div>
                <p className="text-sm text-blue-800">
                  Try shorter, more actionable messages and test different send times 
                  to improve your {stats.readRate}% read rate.
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}