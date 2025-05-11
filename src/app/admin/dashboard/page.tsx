
"use client";
import { PageWrapper } from "@/components/layout/page-wrapper";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ShieldAlert, Users, Settings } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/components/providers/auth-provider";
import { useEffect } from "react";

export default function AdminDashboardPage() {
  const { user } = useAuth();

  useEffect(() => {
    document.title = 'Admin Dashboard - Black HAT Commit';
  }, []);

  return (
    <PageWrapper title="Admin Command Center" titleIcon={<ShieldAlert />} description={`Welcome, Admin ${user?.displayName || user?.email}. Manage system operations.`}>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Link href="/admin/users" passHref>
          <Card className="hover:shadow-primary/20 transition-shadow cursor-pointer border-primary/30">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-accent">Manage Users</CardTitle>
              <Users className="h-5 w-5 text-primary" />
            </CardHeader>
            <CardContent className="pt-6">
              <p className="text-2xl font-bold text-glow-primary">User Control</p>
              <p className="text-xs text-muted-foreground">Add, edit, and manage user permissions.</p>
            </CardContent>
          </Card>
        </Link>
        <Link href="/admin/settings" passHref>
         <Card className="hover:shadow-primary/20 transition-shadow cursor-pointer border-primary/30">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-accent">Admin Settings</CardTitle>
              <Settings className="h-5 w-5 text-primary" />
            </CardHeader>
            <CardContent className="pt-6">
              <p className="text-2xl font-bold text-glow-primary">Configuration</p>
              <p className="text-xs text-muted-foreground">Manage admin account settings.</p>
            </CardContent>
          </Card>
        </Link>
        {/* Add more admin cards/links here */}
      </div>
       <Card className="mt-8 border-dashed border-primary/50">
          <CardHeader>
            <CardTitle>Developer Notes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>Drag-and-drop page editing for general content is a complex feature and has been deferred for this iteration.</p>
            <p>Backend-triggered push notifications for all user actions (stories, community posts, tasks) require Firebase Functions setup and are beyond the current client-side scope. Basic client-side notification permission requests are handled.</p>
            <p>Advanced live interaction features (real-time typing indicators, precise online status for all users) are minimized to keep the application lightweight on Firebase resources. The dashboard shows a list of all operatives, and clicking them navigates to DMs.</p>
          </CardContent>
        </Card>
    </PageWrapper>
  );
}

