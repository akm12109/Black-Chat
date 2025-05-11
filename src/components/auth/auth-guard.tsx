"use client";

import { useAuth } from '@/hooks/use-auth';
import { useRouter, usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import { useEffect } from 'react';
import { Skeleton } from '@/components/ui/skeleton'; 
import { Logo } from '@/components/common/logo';

export function AuthGuard({ children }: { children: ReactNode }) {
  const { user, loading, isFirebaseConfigured } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!isFirebaseConfigured) {
      // If Firebase isn't set up, auth features are disabled.
      // The AuthProvider will show warnings/guidance.
      // We don't redirect here as it might interfere with viewing non-auth parts or setup pages if any.
      return;
    }
    if (!loading && !user) {
      // Store the current path to redirect back after login, if desired
      // For this app, simple redirect to login is fine.
      // sessionStorage.setItem('redirectAfterLogin', pathname);
      router.replace('/login');
    }
  }, [user, loading, router, isFirebaseConfigured, pathname]);

  if (loading || (!user && isFirebaseConfigured)) {
    // Show a loading skeleton or a full-page loader while checking auth or redirecting
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-background">
        <div className="mb-12">
         <Logo textSize="text-4xl" iconSize={40} />
        </div>
        <div className="w-full max-w-md space-y-6 p-8 rounded-lg shadow-xl bg-card border border-primary/30">
          <Skeleton className="h-8 w-3/4 mx-auto bg-muted" />
          <Skeleton className="h-6 w-1/2 mx-auto bg-muted" />
          <div className="space-y-4 mt-6">
            <Skeleton className="h-10 w-full bg-muted" />
            <Skeleton className="h-10 w-full bg-muted" />
          </div>
          <Skeleton className="h-10 w-full mt-6 bg-primary/50" />
           <Skeleton className="h-4 w-1/2 mx-auto mt-4 bg-muted" />
        </div>
      </div>
    );
  }
  
  if (!isFirebaseConfigured && !loading) {
    // Optional: Show a message if Firebase is not configured and not loading
    // This case should ideally be handled by a more global error boundary or message system
    // For now, children will render, but might fail if they depend on Firebase.
  }


  return <>{children}</>;
}
