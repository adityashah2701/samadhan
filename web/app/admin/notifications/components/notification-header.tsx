import React from "react";
import { Bell, Users, TrendingUp, Clock, RefreshCw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface NotificationHeaderProps {
  stats?: {
    totalAdminNotifications: number;
    totalUserNotifications: number;
    totalSent: number;
    totalDelivered: number;
    totalRead: number;
    deliveryRate: number;
    readRate: number;
    byType: Record<string, number>;
    byStatus: Record<string, number>;
  };
  totalUsers: number;
  onRefresh: () => void;
  isRefreshing: boolean;
}

export function NotificationHeader({ 
  stats, 
  totalUsers, 
  onRefresh, 
  isRefreshing 
}: NotificationHeaderProps) {
  return (
    <>
      {/* Page Header */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            <Bell className="h-8 w-8 text-green-500" />
            Notification Center
          </h1>
          <p className="text-muted-foreground">
            Send notifications, manage templates, and track delivery analytics
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Users className="h-4 w-4" />
            <span>{totalUsers} total users</span>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={onRefresh}
            disabled={isRefreshing}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isRefreshing ? "animate-spin" : ""}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Sent</CardTitle>
            <Bell className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalSent || 0}</div>
            <p className="text-xs text-muted-foreground">
              Last 30 days
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Delivery Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.deliveryRate || 0}%</div>
            <p className="text-xs text-muted-foreground">
              Successfully delivered
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Read Rate</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.readRate || 0}%</div>
            <p className="text-xs text-muted-foreground">
              Users engaged
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats?.byStatus?.scheduled || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Scheduled notifications
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Quick Status Overview */}
      {stats && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Quick Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Notification Types */}
              <div>
                <h4 className="text-sm font-medium mb-3">By Type</h4>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(stats.byType).map(([type, count]) => (
                    <Badge key={type} variant="secondary" className="text-xs">
                      {type.replace(/_/g, " ")}: {count}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Status Distribution */}
              <div>
                <h4 className="text-sm font-medium mb-3">By Status</h4>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(stats.byStatus).map(([status, count]) => (
                    <Badge 
                      key={status} 
                      variant={status === "delivered" ? "default" : "outline"}
                      className="text-xs"
                    >
                      {status}: {count}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </>
  );
}
