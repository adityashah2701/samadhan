"use client";

import { SignIn, useUser } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const Page = () => {
  const { user, isLoaded } = useUser();
  const router = useRouter();
  const [showSignIn, setShowSignIn] = useState(false);

  // Get user data from Convex to check role
  const convexUser = useQuery(
    api.users.getUserByClerkId,
    user?.id ? { clerkId: user.id } : "skip"
  );

  // Redirect admin users to dashboard
  useEffect(() => {
    if (isLoaded && user && convexUser) {
      if (convexUser.role === "admin") {
        router.push("/admin");
      } else {
        // Non-admin users are redirected away
        setShowSignIn(false);
      }
    }
  }, [isLoaded, user, convexUser, router]);

  // Show loading state
  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // Show sign-in modal
  if (showSignIn) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <SignIn 
            appearance={{
              elements: {
                rootBox: "mx-auto",
                card: "bg-card border border-border shadow-lg"
              }
            }}
            signUpUrl={undefined} // Disable sign up
            afterSignInUrl="/admin"
            redirectUrl="/admin"
          />
        </div>
      </div>
    );
  }

  // Main landing page
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto text-center space-y-8">
          {/* Header */}
          <div className="space-y-4">
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight">
              Samadhan
              <span className="text-primary block text-2xl md:text-3xl font-normal mt-2">
                समाधान
              </span>
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              Advanced Civic Issues Management System
            </p>
            <p className="text-muted-foreground max-w-3xl mx-auto">
              Streamlining municipal governance through intelligent issue tracking, 
              department coordination, and citizen engagement.
            </p>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
            <Card className="border-border/50 bg-card/50 backdrop-blur">
              <CardHeader className="pb-3">
                <CardTitle className="text-2xl font-bold text-primary">24/7</CardTitle>
                <CardDescription>Real-time Issue Monitoring</CardDescription>
              </CardHeader>
            </Card>
            <Card className="border-border/50 bg-card/50 backdrop-blur">
              <CardHeader className="pb-3">
                <CardTitle className="text-2xl font-bold text-primary">Smart</CardTitle>
                <CardDescription>Automated Department Assignment</CardDescription>
              </CardHeader>
            </Card>
            <Card className="border-border/50 bg-card/50 backdrop-blur">
              <CardHeader className="pb-3">
                <CardTitle className="text-2xl font-bold text-primary">Efficient</CardTitle>
                <CardDescription>Streamlined Resolution Process</CardDescription>
              </CardHeader>
            </Card>
          </div>

          {/* Sign In Section */}
          <div className="mt-16 space-y-6">
            <Card className="max-w-md mx-auto border-border bg-card/80 backdrop-blur">
              <CardHeader className="space-y-3">
                <CardTitle className="text-xl">Admin Access Portal</CardTitle>
                <CardDescription>
                  Secure access for authorized municipal administrators
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button 
                  onClick={() => setShowSignIn(true)}
                  className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
                  size="lg"
                >
                  Sign In to Dashboard
                </Button>
                
                {user && convexUser && convexUser.role !== "admin" && (
                  <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-md">
                    <p className="text-sm text-destructive">
                      Access denied. Admin privileges required.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
            
            <p className="text-xs text-muted-foreground">
              This system is restricted to authorized municipal staff only.
              <br />
              Unauthorized access attempts are logged and monitored.
            </p>
          </div>

          {/* Features */}
          <div className="mt-16 grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="text-left space-y-3">
              <h3 className="text-lg font-semibold">Issue Management</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>• Real-time issue tracking and monitoring</li>
                <li>• Automated priority classification</li>
                <li>• Geographic clustering and analysis</li>
                <li>• Status progression workflows</li>
              </ul>
            </div>
            <div className="text-left space-y-3">
              <h3 className="text-lg font-semibold">Department Coordination</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>• Smart department assignment</li>
                <li>• Resource allocation tracking</li>
                <li>• Performance analytics</li>
                <li>• Cross-department collaboration</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Page;
