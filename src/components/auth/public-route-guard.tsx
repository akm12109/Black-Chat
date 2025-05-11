"use client";

import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import type { ReactNode } from 'react';
import { useEffect } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { Logo } from '@/components/common/logo';

export function PublicRouteGuard({ children }: { children: ReactNode }) {
  const { user, loading, isFirebaseConfigured } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isFirebaseConfigured || loading) {
      // Still loading or Firebase not set up, wait.
      return;
    }
    if (user) {
      // User is logged in, redirect from public auth page to dashboard.
      router.replace('/dashboard');
    }
  }, [user, loading, router, isFirebaseConfigured]);

  if (loading || (user && isFirebaseConfigured)) {
    // Show loading skeleton or if redirecting (user is logged in and will be moved)
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
  
  // If not loading, Firebase is configured, and user is null, show the children (login/signup page)
  // Or if Firebase is not configured (app operates in degraded mode)
  return <>{children}</>;
}
