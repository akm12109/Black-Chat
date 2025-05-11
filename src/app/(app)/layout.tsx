"use client"; 
import { AppHeader } from '@/components/navigation/app-header';
import { AppSidebar } from '@/components/navigation/app-sidebar';
import { SidebarProvider } from '@/components/ui/sidebar';
import { AuthGuard } from '@/components/auth/auth-guard';
import { useEffect } from 'react';
import { initializeForegroundNotifications, requestNotificationPermission } from '@/lib/fcm';
import { useAuth } from '@/hooks/use-auth';

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isFirebaseConfigured } = useAuth();

  useEffect(() => {
    if (typeof window !== 'undefined' && isFirebaseConfigured && user) {
      initializeForegroundNotifications();
      // Optionally, request permission here if not done elsewhere (e.g., on a button click in settings)
      // For a better UX, it's often preferred to ask for permission upon a user action.
      // Example: requestNotificationPermission(); 
    }
  }, [isFirebaseConfigured, user]);

  return (
    <AuthGuard>
      <SidebarProvider defaultOpen={true}>
        <div className="flex min-h-screen flex-col bg-background">
          <AppHeader />
          <div className="flex flex-1">
            <AppSidebar />
            <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8">
              {children}
            </main>
          </div>
        </div>
      </SidebarProvider>
    </AuthGuard>
  );
}
