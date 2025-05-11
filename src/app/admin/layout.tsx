
"use client"; 
import { AppHeader } from '@/components/navigation/app-header';
import { AppSidebar } from '@/components/navigation/app-sidebar';
import { SidebarProvider } from '@/components/ui/sidebar';
import { AdminGuard } from '@/components/auth/admin-guard'; // Import AdminGuard

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AdminGuard> {/* Wrap with AdminGuard */}
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
    </AdminGuard>
  );
}

