
"use client";

import { Logo } from '@/components/common/logo';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useSidebar } from '@/components/ui/sidebar';
import { LogOut, Settings, UserCircle, Moon, Sun, PanelLeft, ShieldAlert } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/components/providers/auth-provider';
import { auth } from '@/lib/firebase';
import { signOut } from 'firebase/auth';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import React, { useEffect, useState } from 'react';


export function AppHeader() {
  const { toggleSidebar, isMobile: sidebarIsMobileHook, openMobile } = useSidebar(); 
  const { user, loading, isFirebaseConfigured } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [currentTheme, setCurrentTheme] = useState('dark'); // Initialize to dark

  const userHandle = user?.handle || user?.displayName || user?.email?.split('@')[0] || 'User';
  const userInitial = userHandle?.[0]?.toUpperCase() || 'U';

  useEffect(() => {
    // Set initial theme
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
      setCurrentTheme(savedTheme);
      if (savedTheme === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    } else {
      // No saved theme, default to dark
      setCurrentTheme('dark');
      document.documentElement.classList.add('dark');
    }
  }, []);

  const toggleTheme = () => {
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    setCurrentTheme(newTheme);
    if (newTheme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('theme', newTheme);
    toast({title: "Theme Toggle", description: `Switched to ${newTheme === 'dark' ? 'Dark' : 'Light'} Theme.`});
  };

  const handleLogout = async () => {
    if (!auth || !isFirebaseConfigured) {
      toast({ variant: "destructive", title: "Error", description: "Firebase not configured for logout." });
      return;
    }
    try {
      await signOut(auth);
      toast({ title: "Logged Out", description: "You have been successfully logged out." });
      router.push('/login');
    } catch (error: any) {
      toast({ variant: "destructive", title: "Logout Failed", description: error.message });
    }
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-background/80 px-4 shadow-sm backdrop-blur-md md:px-6">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="icon" onClick={toggleSidebar} aria-label="Toggle sidebar" className="text-primary hover:text-glow-primary">
          <PanelLeft className="h-5 w-5" />
        </Button>
        <div className="hidden md:block">
         <Logo iconSize={24} textSize="text-xl" />
        </div>
      </div>
      
      <div className="md:hidden"> 
        {!(sidebarIsMobileHook && openMobile) && <Logo iconSize={24} textSize="text-xl" />}
      </div>

      <div className="flex items-center gap-2 sm:gap-4">
        {user?.isAdmin && (
          <Button variant="outline" size="sm" asChild className="border-destructive text-destructive hover:bg-destructive/10 hover:text-destructive">
            <Link href="/admin/dashboard">
              <ShieldAlert className="mr-1.5 h-4 w-4" /> Admin Panel
            </Link>
          </Button>
        )}
        <Button variant="ghost" size="icon" onClick={toggleTheme} aria-label="Toggle theme" className="text-accent hover:text-glow-accent">
          {/* Conditionally render based on currentTheme state, not just CSS classes for initial render correctness */}
          {currentTheme === 'light' ? (
            <Sun className="h-5 w-5 transition-all" />
          ) : (
            <Moon className="h-5 w-5 transition-all" />
          )}
        </Button>

        {loading ? (
          <Avatar className="h-9 w-9">
            <AvatarFallback className="bg-muted animate-pulse"></AvatarFallback>
          </Avatar>
        ) : user && isFirebaseConfigured ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative h-9 w-9 rounded-full">
                <Avatar className="h-9 w-9 border-2 border-primary">
                  <AvatarImage 
                    src={user.photoURL || `https://picsum.photos/seed/${user.uid}/40/40`} 
                    alt={userHandle} 
                    data-ai-hint="hacker avatar" />
                  <AvatarFallback className="bg-primary text-primary-foreground">{userInitial}</AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
              <DropdownMenuLabel className="font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium leading-none">{userHandle}</p>
                  <p className="text-xs leading-none text-muted-foreground">
                    {user.email}
                  </p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/profile"><UserCircle className="mr-2 h-4 w-4" /> Profile</Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/settings"><Settings className="mr-2 h-4 w-4" /> Settings</Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:bg-destructive/20 focus:text-destructive">
                <LogOut className="mr-2 h-4 w-4" />
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
           <Button asChild variant="outline" className="border-primary text-primary hover:bg-primary/10">
             <Link href="/login">Login</Link>
           </Button>
        )}
      </div>
    </header>
  );
}
