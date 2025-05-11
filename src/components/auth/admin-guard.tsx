
"use client";

import { useAuth, type AppUser } from '@/components/providers/auth-provider';
import { useRouter } from 'next/navigation';
import type { ReactNode } from 'react';
import { useEffect } from 'react';
import { Skeleton } from '@/components/ui/skeleton'; 
import { Logo } from '@/components/common/logo';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import Link from 'next/link';

export function AdminGuard({ children }: { children: ReactNode }) {
  const { user, loading, isFirebaseConfigured } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isFirebaseConfigured || loading) {
      return; // Wait for auth state to load or Firebase config
    }

    if (!user) {
      router.replace('/login?redirect=/admin/dashboard'); // Redirect to login if not authenticated
      return;
    }

    if (user && !user.isAdmin) {
      router.replace('/dashboard'); // Redirect to regular dashboard if not admin
    }
  }, [user, loading, router, isFirebaseConfigured]);

  if (loading || !isFirebaseConfigured || !user ) {
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
          </div>
          <Skeleton className="h-10 w-full mt-6 bg-primary/50" />
        </div>
      </div>
    );
  }
  
  if (user && !user.isAdmin) {
     return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-background">
        <Card className="w-full max-w-md border-destructive">
            <CardHeader>
                <CardTitle className="text-destructive">Access Denied</CardTitle>
            </CardHeader>
            <CardContent>
                <p className="text-muted-foreground">You do not have permission to access this area.</p>
                <Button asChild className="mt-4">
                    <Link href="/dashboard">Go to Dashboard</Link>
                </Button>
            </CardContent>
        </Card>
      </div>
     )
  }


  return <>{children}</>;
}

