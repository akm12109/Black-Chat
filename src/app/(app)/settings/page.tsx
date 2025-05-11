"use client";
import { PageWrapper } from "@/components/layout/page-wrapper";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Settings, Bell, Shield, Palette, KeyRound, BellRing } from "lucide-react";
// import type { Metadata } from 'next'; // Cannot be used in client component due to 'use client'
import { requestNotificationPermission } from "@/lib/fcm";
import { useToast } from "@/hooks/use-toast";
import { useEffect } from "react";

// export const metadata: Metadata = { // Cannot be used with 'use client'
//   title: 'Settings - Black HAT Commit',
//   description: 'Configure your application settings.',
// };

export default function SettingsPage() {
  const { toast } = useToast();

  useEffect(() => {
    if (typeof document !== 'undefined') {
        document.title = 'Settings - Black HAT Commit';
    }
  }, []);

  const handleRequestNotification = async () => {
    try {
      const token = await requestNotificationPermission();
      if (token) {
        // Already handled by toast in requestNotificationPermission
        // toast({ title: "Success", description: "Notification permissions granted."});
      } else {
        // toast({ title: "Info", description: "Notification permission status unchanged or denied."});
      }
    } catch (error) {
      console.error("Error requesting notification permission:", error);
      toast({ variant: "destructive", title: "Error", description: "Could not request notification permissions."});
    }
  };
  
  return (
    <PageWrapper title="System Configuration" titleIcon={<Settings />} description="Adjust application preferences and security settings.">
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Notifications Card */}
        <Card className="border-primary/30">
          <CardHeader>
            <CardTitle className="text-lg text-accent flex items-center"><Bell className="mr-2 h-5 w-5"/>Notifications</CardTitle>
            <CardDescription>Manage how you receive alerts.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button variant="outline" className="w-full border-accent text-accent hover:bg-accent/10" onClick={handleRequestNotification}>
                <BellRing className="mr-2 h-4 w-4"/> Enable Push Notifications
            </Button>
            <div className="flex items-center justify-between">
              <Label htmlFor="email-notifications" className="flex-1">Email Notifications</Label>
              <Switch id="email-notifications" defaultChecked className="data-[state=checked]:bg-primary" />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="sound-notifications" className="flex-1">Sound Alerts</Label>
              <Switch id="sound-notifications" defaultChecked className="data-[state=checked]:bg-primary"/>
            </div>
          </CardContent>
        </Card>

        {/* Security Card */}
        <Card className="border-primary/30">
          <CardHeader>
            <CardTitle className="text-lg text-accent flex items-center"><Shield className="mr-2 h-5 w-5"/>Security</CardTitle>
            <CardDescription>Enhance your account protection.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button variant="outline" className="w-full border-accent text-accent hover:bg-accent/10">
                <KeyRound className="mr-2 h-4 w-4"/> Change Password
            </Button>
            <div className="flex items-center justify-between">
              <Label htmlFor="two-factor-auth" className="flex-1">Two-Factor Authentication</Label>
              <Switch id="two-factor-auth" disabled className="data-[state=checked]:bg-primary"/>
            </div>
             <p className="text-xs text-muted-foreground">2FA currently disabled (placeholder).</p>
          </CardContent>
        </Card>

        {/* Appearance Card */}
        <Card className="border-primary/30">
          <CardHeader>
            <CardTitle className="text-lg text-accent flex items-center"><Palette className="mr-2 h-5 w-5"/>Appearance</CardTitle>
            <CardDescription>Customize the look and feel.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="theme" className="flex-1">Theme</Label>
              <Button variant="outline" disabled className="border-accent text-accent">Dark Mode (Default)</Button>
            </div>
             <div className="flex items-center justify-between">
              <Label htmlFor="font-size" className="flex-1">Terminal Font Size</Label>
              <select id="font-size" className="bg-input border border-border rounded-md p-2 text-sm text-foreground focus:ring-primary focus:border-primary">
                <option>Small</option>
                <option>Medium</option>
                <option>Large</option>
              </select>
            </div>
          </CardContent>
        </Card>
      </div>
      <div className="mt-8 text-center">
        <Button variant="default" size="lg" disabled>Save Configuration (Disabled)</Button>
      </div>
    </PageWrapper>
  );
}
