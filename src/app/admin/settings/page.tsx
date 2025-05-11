
"use client";
import React, { useState } from 'react';
import { PageWrapper } from "@/components/layout/page-wrapper";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { KeyRound, Lock, ShieldCheck } from "lucide-react";
import { useAuth } from "@/components/providers/auth-provider";
import { auth as firebaseAuth } from '@/lib/firebase';
import { EmailAuthProvider, reauthenticateWithCredential, updatePassword } from 'firebase/auth';
import { useToast } from '@/hooks/use-toast';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useForm } from 'react-hook-form';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, { message: "Current password is required." }),
  newPassword: z.string().min(6, { message: "New password must be at least 6 characters." }),
  confirmNewPassword: z.string(),
}).refine(data => data.newPassword === data.confirmNewPassword, {
  message: "New passwords don't match.",
  path: ["confirmNewPassword"],
});
type ChangePasswordFormData = z.infer<typeof changePasswordSchema>;

export default function AdminSettingsPage() {
  const { user, isFirebaseConfigured } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<ChangePasswordFormData>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: { currentPassword: "", newPassword: "", confirmNewPassword: "" },
  });

  const handleChangePassword = async (data: ChangePasswordFormData) => {
    if (!firebaseAuth?.currentUser || !user?.email) {
      toast({ variant: "destructive", title: "Error", description: "User not authenticated or email missing." });
      return;
    }
    setIsLoading(true);
    try {
      const credential = EmailAuthProvider.credential(user.email, data.currentPassword);
      await reauthenticateWithCredential(firebaseAuth.currentUser, credential);
      await updatePassword(firebaseAuth.currentUser, data.newPassword);
      toast({ title: "Success", description: "Admin password updated successfully." });
      form.reset();
    } catch (error: any) {
      console.error("Error changing password:", error);
      let errorMessage = "Failed to change password.";
      if (error.code === 'auth/wrong-password') {
        errorMessage = "Incorrect current password.";
      } else if (error.code === 'auth/weak-password') {
        errorMessage = "The new password is too weak.";
      }
      toast({ variant: "destructive", title: "Error", description: errorMessage });
    } finally {
      setIsLoading(false);
    }
  };

  if (!user?.isAdmin) {
      return (
        <PageWrapper title="Access Denied" titleIcon={<ShieldCheck />}>
            <Card><CardContent className="p-6"><p className="text-destructive">You do not have permission to view this page.</p></CardContent></Card>
        </PageWrapper>
      )
  }

  return (
    <PageWrapper title="Admin Account Settings" titleIcon={<KeyRound />} description="Manage your administrator credentials.">
      <Card className="max-w-2xl mx-auto border-primary/30">
        <CardHeader>
          <CardTitle className="text-xl text-glow-accent">Change Admin Password</CardTitle>
          <CardDescription>
            Ensure your administrative account remains secure by regularly updating your password.
          </CardDescription>
        </CardHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleChangePassword)}>
            <CardContent className="space-y-6">
              <FormField
                control={form.control}
                name="currentPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-accent">Current Password</FormLabel>
                    <FormControl>
                      <div className="relative flex items-center">
                        <Lock className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                        <Input type="password" placeholder="Enter current password" {...field} className="pl-10 bg-input border-border focus:border-primary" />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="newPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-accent">New Password</FormLabel>
                    <FormControl>
                      <div className="relative flex items-center">
                        <Lock className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                        <Input type="password" placeholder="Enter new password (min. 6 characters)" {...field} className="pl-10 bg-input border-border focus:border-primary" />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="confirmNewPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-accent">Confirm New Password</FormLabel>
                    <FormControl>
                      <div className="relative flex items-center">
                        <Lock className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                        <Input type="password" placeholder="Confirm new password" {...field} className="pl-10 bg-input border-border focus:border-primary" />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
            <CardFooter>
              <Button type="submit" variant="default" disabled={isLoading || !isFirebaseConfigured}>
                {isLoading ? "Updating Password..." : "Update Password"}
              </Button>
            </CardFooter>
          </form>
        </Form>
      </Card>
    </PageWrapper>
  );
}

