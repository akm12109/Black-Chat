
"use client";

import React, { useState } from 'react';
import {
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarFooter,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarSeparator,
} from "@/components/ui/sidebar";
import { Logo } from "@/components/common/logo";
import { Button } from "@/components/ui/button";
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  MessageSquare, 
  Users, 
  LayoutDashboard, 
  Share2, 
  CalendarCheck, 
  Settings, 
  UserCircle,
  Phone,
  FileText,
  GitBranch,
  ShieldCheck, 
  Wifi,
  Database,
  Server,
  ClipboardList
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescriptionUI, DialogTrigger, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { useAuth } from '@/hooks/use-auth';

const navItems = [
  { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
  { href: "/messages", label: "Messages", icon: MessageSquare },
  { href: "/planner", label: "Daily Planner", icon: CalendarCheck },
  { href: "/community", label: "Community Feed", icon: Users },
  { href: "/stories", label: "Stories", icon: Share2 },
  { href: "/calls", label: "Calls", icon: Phone },
  { href: "/files", label: "File Share", icon: FileText }, 
  { href: "/team-progress", label: "Team Progress", icon: ClipboardList },
];

const accountItems = [
  { href: "/profile", label: "Profile", icon: UserCircle },
  { href: "/settings", label: "Settings", icon: Settings },
];

function SystemStatusDialogContent() {
    const { isFirebaseConfigured } = useAuth();
    const statusClass = (isOnline: boolean) => isOnline ? "text-green-500 dark:text-green-400" : "text-red-500 dark:text-red-400";

    return (
        <DialogContent className="sm:max-w-md bg-card border-primary/50">
            <DialogHeader>
                <DialogTitle className="text-glow-primary flex items-center"><ShieldCheck className="mr-2 h-5 w-5 text-primary"/>System Status</DialogTitle>
                <DialogDescriptionUI>
                    Current operational status of core services.
                </DialogDescriptionUI>
            </DialogHeader>
            <div className="space-y-3 py-4">
                <div className="flex justify-between items-center">
                    <span className="flex items-center"><Wifi className="mr-2 h-4 w-4 text-muted-foreground"/> Firebase Connection:</span>
                    <span className={statusClass(isFirebaseConfigured)}>
                        {isFirebaseConfigured ? "Connected" : "Not Connected"}
                    </span>
                </div>
                <div className="flex justify-between items-center">
                    <span className="flex items-center"><Server className="mr-2 h-4 w-4 text-muted-foreground"/> Backend API:</span>
                    <span className={statusClass(true)}>Operational</span> {/* Mocked */}
                </div>
                <div className="flex justify-between items-center">
                    <span className="flex items-center"><Database className="mr-2 h-4 w-4 text-muted-foreground"/> Database Service:</span>
                    <span className={statusClass(isFirebaseConfigured)}>
                        {isFirebaseConfigured ? "Operational" : "Unavailable"}
                    </span>
                </div>
                <div className="flex justify-between items-center">
                    <span className="flex items-center"><MessageSquare className="mr-2 h-4 w-4 text-muted-foreground"/> Realtime Messaging:</span>
                     <span className={statusClass(isFirebaseConfigured)}>
                        {isFirebaseConfigured ? "Active" : "Unavailable"}
                    </span>
                </div>
            </div>
            <DialogFooter>
                <DialogClose asChild>
                    <Button type="button" variant="outline" className="border-accent text-accent hover:bg-accent/10">
                        Close
                    </Button>
                </DialogClose>
            </DialogFooter>
        </DialogContent>
    );
}


export function AppSidebar() {
  const pathname = usePathname();
  const [isSystemStatusOpen, setIsSystemStatusOpen] = useState(false);

  return (
    <Sidebar collapsible="icon" className="border-r border-border/50">
      <SidebarHeader className="p-4">
        <Logo />
      </SidebarHeader>
      <SidebarContent className="p-2">
        <SidebarMenu>
          {navItems.map((item) => (
            <SidebarMenuItem key={item.label}>
              <Link href={item.href} passHref legacyBehavior>
                <SidebarMenuButton 
                  isActive={pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href))}
                  className="group"
                  tooltip={item.label}
                >
                  <item.icon className="h-5 w-5 text-primary group-data-[active=true]:text-primary-foreground group-hover:text-glow-primary transition-all" />
                  <span>{item.label}</span>
                </SidebarMenuButton>
              </Link>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>

        <SidebarSeparator className="my-4" />
        
        <SidebarGroup>
          <SidebarGroupLabel className="flex items-center text-muted-foreground">
            <GitBranch className="mr-2 h-4 w-4 text-accent" />
            <span>My Account</span>
          </SidebarGroupLabel>
          <SidebarMenu>
            {accountItems.map((item) => (
               <SidebarMenuItem key={item.label}>
                <Link href={item.href} passHref legacyBehavior>
                  <SidebarMenuButton 
                    isActive={pathname === item.href}
                    className="group"
                    tooltip={item.label}
                  >
                    <item.icon className="h-5 w-5 text-accent group-data-[active=true]:text-accent-foreground group-hover:text-glow-accent transition-all" />
                    <span>{item.label}</span>
                  </SidebarMenuButton>
                </Link>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroup>

      </SidebarContent>
      <SidebarFooter className="p-4">
        <Dialog open={isSystemStatusOpen} onOpenChange={setIsSystemStatusOpen}>
            <DialogTrigger asChild>
                <Button variant="outline" className="w-full border-primary text-primary hover:bg-primary/10">
                    <ShieldCheck className="mr-2 h-4 w-4"/> System Status
                </Button>
            </DialogTrigger>
            <SystemStatusDialogContent />
        </Dialog>
      </SidebarFooter>
    </Sidebar>
  );
}
