"use client";
import { UserButton, useUser } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { redirect } from "next/navigation";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  AlertCircle,
  Users,
  Building,
  BarChart3,
  Settings,
  Plus,
  Bell,
  FileText,
} from "lucide-react";
import React from "react";

interface SidebarItemProps {
  href: string;
  icon: React.ReactNode;
  label: string;
  badge?: string;
  isActive?: boolean;
}

function SidebarItem({ href, icon, label, badge, isActive }: SidebarItemProps) {
  return (
    <Link href={href}>
      <Button
        variant={isActive ? "secondary" : "ghost"}
        className={cn(
          "w-full justify-start gap-3 h-12",
          isActive ? "bg-primary/10 text-primary hover:bg-primary/15" : "hover:bg-accent"
        )}
      >
        {icon}
        <span>{label}</span>
        {badge && (
          <Badge variant="secondary" className="ml-auto">
            {badge}
          </Badge>
        )}
      </Button>
    </Link>
  );
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isLoaded } = useUser();
  const pathname = usePathname();

  // Get user data from Convex to check role
  const convexUser = useQuery(
    api.users.getUserByClerkId,
    user?.id ? { clerkId: user.id } : "skip"
  );

  // Get stats for badges
  const issues = useQuery(api.civicIssues.getIssues, { limit: 1000 });
  const departments = useQuery(api.departments.getDepartments, {});
  const pendingCount = issues?.filter(issue => issue.status === 'pending').length || 0;
  const totalUsers = useQuery(api.users.getAllUsers, {})?.length || 0;
  const totalDepartments = departments?.length || 0;

  // Show loading state while checking authentication
  if (!isLoaded || (user && convexUser === undefined)) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Redirect non-authenticated users
  if (!user) {
    redirect("/");
  }

  // Redirect non-admin users
  if (convexUser && convexUser.role !== "admin") {
    redirect("/");
  }

  const sidebarItems = [
    {
      href: "/admin",
      icon: <LayoutDashboard className="h-5 w-5" />,
      label: "Dashboard",
      isActive: pathname === "/admin"
    },
    {
      href: "/admin/issues",
      icon: <AlertCircle className="h-5 w-5" />,
      label: "Issues",
      badge: pendingCount > 0 ? pendingCount.toString() : undefined,
      isActive: pathname.startsWith("/admin/issues")
    },
    {
      href: "/admin/users",
      icon: <Users className="h-5 w-5" />,
      label: "Users",
      badge: totalUsers > 0 ? totalUsers.toString() : undefined,
      isActive: pathname.startsWith("/admin/users")
    },
    {
      href: "/admin/departments",
      icon: <Building className="h-5 w-5" />,
      label: "Departments",
      badge: totalDepartments > 0 ? totalDepartments.toString() : undefined,
      isActive: pathname.startsWith("/admin/departments")
    },
    {
      href: "/admin/analytics",
      icon: <BarChart3 className="h-5 w-5" />,
      label: "Analytics",
      isActive: pathname.startsWith("/admin/analytics")
    },
    {
      href: "/admin/reports",
      icon: <FileText className="h-5 w-5" />,
      label: "Reports",
      isActive: pathname.startsWith("/admin/reports")
    }
  ];

  const quickActions = [
    {
      href: "/admin/issues/new",
      icon: <Plus className="h-4 w-4" />,
      label: "New Issue"
    },
    {
      href: "/admin/departments/new",
      icon: <Building className="h-4 w-4" />,
      label: "Add Department"
    },
    {
      href: "/admin/notifications",
      icon: <Bell className="h-4 w-4" />,
      label: "Send Notification"
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/95 backdrop-blur sticky top-0 z-50">
        <div className="flex h-16 items-center justify-between px-6">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
                <span className="text-primary-foreground font-bold text-sm">S</span>
              </div>
              <div>
                <h1 className="text-lg font-bold">Samadhan Admin</h1>
              </div>
            </div>
            <div className="hidden md:flex items-center gap-2 text-sm text-muted-foreground">
              <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse"></div>
              <span>Live System</span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden md:block text-right">
              <p className="text-sm font-medium">{user?.firstName} {user?.lastName}</p>
              <p className="text-xs text-muted-foreground">System Administrator</p>
            </div>
            <UserButton
              appearance={{
                elements: {
                  avatarBox: "h-8 w-8"
                }
              }}
              afterSignOutUrl="/"
            />
          </div>
        </div>
      </header>
      <div className="flex">
        {/* Sidebar */}
        <nav className="w-64 border-r border-border bg-card/50 min-h-[calc(100vh-4rem)] p-4">
          <div className="space-y-2">
            {sidebarItems.map((item) => (
              <SidebarItem key={item.href} {...item} />
            ))}
          </div>

          {/* Quick Actions */}
          <div className="mt-8 pt-4 border-t border-border">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3">
              Quick Actions
            </h3>
            <div className="space-y-1">
              {quickActions.map((action) => (
                <Link key={action.href} href={action.href}>
                  <Button variant="ghost" size="sm" className="w-full justify-start gap-2 h-9">
                    {action.icon}
                    <span className="text-sm">{action.label}</span>
                  </Button>
                </Link>
              ))}
            </div>
          </div>
          {/* Settings */}
          <div className="mt-8 pt-4 border-t border-border">
            <Link href="/admin/settings">
              <Button
                variant={pathname === "/admin/settings" ? "secondary" : "ghost"}
                className="w-full justify-start gap-3 h-12"
              >
                <Settings className="h-5 w-5" />
                <span>Settings</span>
              </Button>
            </Link>
          </div>
        </nav>
        {/* Main Content */}
        <main className="flex-1 p-6">
          {children}
        </main>
      </div>
    </div>
  );
}