import { useState } from "react";
import {
    Clock,
    Eye,
    Users,
    TrendingUp,
    Search, Download,
    Trash2,
    MoreHorizontal,
    CheckCircle,
    XCircle,
    AlertTriangle,
    RefreshCw
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Progress } from "@/components/ui/progress";

interface NotificationHistoryItem {
  _id: string;
  title: string;
  body: string;
  type: string;
  channels: string[];
  targetAudience: string;
  urgent: boolean;
  senderId: string;
  senderName: string;
  scheduledAt?: number;
  sentAt?: number;
  recipientCount: number;
  deliveredCount: number;
  readCount: number;
  status: "scheduled" | "sent" | "delivered" | "failed";
  createdAt: number;
}

interface NotificationHistoryProps {
  notifications: NotificationHistoryItem[];
  onRefresh: () => void;
}

export function NotificationHistory({ notifications, onRefresh }: NotificationHistoryProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("newest");

  // Filter and sort notifications
  const filteredNotifications = notifications
    .filter(notification => {
      const matchesSearch = notification.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           notification.body.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           notification.senderName.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesStatus = statusFilter === "all" || notification.status === statusFilter;
      const matchesType = typeFilter === "all" || notification.type === typeFilter;
      
      return matchesSearch && matchesStatus && matchesType;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case "newest":
          return b.createdAt - a.createdAt;
        case "oldest":
          return a.createdAt - b.createdAt;
        case "most_recipients":
          return b.recipientCount - a.recipientCount;
        case "highest_engagement":
          return (b.readCount / b.deliveredCount || 0) - (a.readCount / a.deliveredCount || 0);
        default:
          return b.createdAt - a.createdAt;
      }
    });

  // Get status icon and color
  const getStatusConfig = (status: string) => {
    const configs = {
      scheduled: { icon: Clock, color: "bg-blue-500/10 text-blue-500 border-blue-500/20" },
      sent: { icon: CheckCircle, color: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20" },
      delivered: { icon: CheckCircle, color: "bg-green-500/10 text-green-500 border-green-500/20" },
      failed: { icon: XCircle, color: "bg-red-500/10 text-red-500 border-red-500/20" }
    };
    return configs[status as keyof typeof configs] || configs.sent;
  };

  // Get type color
  const getTypeColor = (type: string) => {
    const colors = {
      system: "bg-blue-500/10 text-blue-500",
      announcement: "bg-green-500/10 text-green-500",
      emergency: "bg-red-500/10 text-red-500",
      maintenance: "bg-yellow-500/10 text-yellow-500",
      issue_update: "bg-purple-500/10 text-purple-500",
    };
    return colors[type as keyof typeof colors] || "bg-gray-500/10 text-gray-500";
  };

  // Calculate engagement rate
  const getEngagementRate = (notification: NotificationHistoryItem) => {
    if (notification.deliveredCount === 0) return 0;
    return Math.round((notification.readCount / notification.deliveredCount) * 100);
  };

  // Calculate delivery rate
  const getDeliveryRate = (notification: NotificationHistoryItem) => {
    if (notification.recipientCount === 0) return 0;
    return Math.round((notification.deliveredCount / notification.recipientCount) * 100);
  };

  // Format date
  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  // Get unique types for filter
  const uniqueTypes = [...new Set(notifications.map(n => n.type))];

  return (
    <div className="space-y-6">
      {/* Header and Controls */}
      <Card>
        <CardHeader>
          <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Notification History
              </CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Track sent notifications and their performance
              </p>
            </div>
            
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={onRefresh}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
              <Button variant="outline" size="sm">
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search notifications..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
            
            <div className="flex gap-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="scheduled">Scheduled</SelectItem>
                  <SelectItem value="sent">Sent</SelectItem>
                  <SelectItem value="delivered">Delivered</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                </SelectContent>
              </Select>

              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  {uniqueTypes.map(type => (
                    <SelectItem key={type} value={type}>
                      {type.replace(/_/g, " ")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest">Newest First</SelectItem>
                  <SelectItem value="oldest">Oldest First</SelectItem>
                  <SelectItem value="most_recipients">Most Recipients</SelectItem>
                  <SelectItem value="highest_engagement">Highest Engagement</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Results Summary */}
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-muted-foreground">
              Showing {filteredNotifications.length} of {notifications.length} notifications
            </p>
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-green-500"></div>
                <span>Delivered</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
                <span>Sent</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                <span>Scheduled</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-red-500"></div>
                <span>Failed</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notifications Table */}
      <Card>
        <CardContent className="p-0">
          <div className="table-responsive">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Notification</TableHead>
                  <TableHead className="hidden md:table-cell">Type</TableHead>
                  <TableHead className="hidden sm:table-cell">Audience</TableHead>
                  <TableHead>Performance</TableHead>
                  <TableHead className="hidden lg:table-cell">Sent</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredNotifications.map((notification) => {
                  const statusConfig = getStatusConfig(notification.status);
                  const StatusIcon = statusConfig.icon;
                  const deliveryRate = getDeliveryRate(notification);
                  const engagementRate = getEngagementRate(notification);

                  return (
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
                            <Badge variant="outline" className={statusConfig.color}>
                              <StatusIcon className="h-3 w-3 mr-1" />
                              {notification.status}
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              by {notification.senderName}
                            </span>
                          </div>
                        </div>
                      </TableCell>

                      <TableCell className="hidden md:table-cell">
                        <Badge variant="outline" className={getTypeColor(notification.type)}>
                          {notification.type.replace(/_/g, " ")}
                        </Badge>
                      </TableCell>

                      <TableCell className="hidden sm:table-cell">
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
                        <div className="space-y-2">
                          <div className="space-y-1">
                            <div className="flex justify-between text-xs">
                              <span>Delivery</span>
                              <span>{deliveryRate}%</span>
                            </div>
                            <Progress value={deliveryRate} className="h-1" />
                          </div>
                          <div className="space-y-1">
                            <div className="flex justify-between text-xs">
                              <span>Engagement</span>
                              <span>{engagementRate}%</span>
                            </div>
                            <Progress value={engagementRate} className="h-1" />
                          </div>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground">
                            <div className="flex items-center gap-1">
                              <Users className="h-3 w-3" />
                              {notification.deliveredCount}
                            </div>
                            <div className="flex items-center gap-1">
                              <Eye className="h-3 w-3" />
                              {notification.readCount}
                            </div>
                          </div>
                        </div>
                      </TableCell>

                      <TableCell className="hidden lg:table-cell">
                        <div className="space-y-1">
                          <div className="flex items-center gap-1 text-xs">
                            <Clock className="h-3 w-3 text-muted-foreground" />
                            {notification.sentAt ? 
                              formatDate(notification.sentAt) : 
                              (notification.scheduledAt ? 
                                `Scheduled: ${formatDate(notification.scheduledAt)}` : 
                                formatDate(notification.createdAt)
                              )
                            }
                          </div>
                          <div className="flex items-center gap-1">
                            {notification.channels.map(channel => (
                              <Badge key={channel} variant="outline" className="text-xs">
                                {channel}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </TableCell>

                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem>
                              <Eye className="h-4 w-4 mr-2" />
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <TrendingUp className="h-4 w-4 mr-2" />
                              Analytics
                            </DropdownMenuItem>
                            {notification.status === "scheduled" && (
                              <DropdownMenuItem>
                                <AlertTriangle className="h-4 w-4 mr-2" />
                                Cancel Schedule
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem className="text-destructive">
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          {filteredNotifications.length === 0 && (
            <div className="p-8 text-center">
              <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">No notifications found</h3>
              <p className="text-muted-foreground">
                {searchTerm || statusFilter !== "all" || typeFilter !== "all" 
                  ? "Try adjusting your filters" 
                  : "No notifications have been sent yet"
                }
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}