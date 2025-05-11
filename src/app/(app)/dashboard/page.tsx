
"use client";

import React, { useState, useEffect } from 'react';
import { PageWrapper } from "@/components/layout/page-wrapper";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LayoutDashboard, ListChecks, CalendarCheck, Users, Activity, MessageSquare as MessageSquareIcon } from "lucide-react";
import { useAuth } from '@/hooks/use-auth';
import { firestore } from '@/lib/firebase';
import { collection, query, where, orderBy, limit, onSnapshot, Timestamp, getCountFromServer, getDocs } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { formatDistanceToNowStrict } from 'date-fns';
import type { Priority } from '@/components/planner/task-form'; 
import { Badge } from '@/components/ui/badge'; 
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useRouter } from 'next/navigation';

interface Task {
  id: string;
  text: string;
  completed: boolean;
  priority: Priority; 
  createdAt: Timestamp;
  completedByUid?: string | null;
  completedByHandle?: string | null;
}

interface UserProfile {
  uid: string;
  handle: string;
  email?: string;
  photoURL?: string | null;
  // isOnline and lastSeen removed
}

interface DashboardStats {
  incompleteTasks: number;
  tasksToday: number;
  totalUsersCount: number; // Changed from onlineUsersCount
}

// FIVE_MINUTES_IN_MS removed

export default function DashboardPage() {
  const { user, loading: authLoading, isFirebaseConfigured } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats>({ incompleteTasks: 0, tasksToday: 0, totalUsersCount: 0 });
  const [recentTasks, setRecentTasks] = useState<Task[]>([]);
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]); // Changed from onlineUsers
  const [loadingDashboard, setLoadingDashboard] = useState(true);

  useEffect(() => {
    if (typeof document !== 'undefined') {
        document.title = 'Dashboard - Black HAT Commit';
    }
  }, []);

  useEffect(() => {
    if (!user || !firestore || !isFirebaseConfigured) {
      setLoadingDashboard(false);
      setStats({ incompleteTasks: 0, tasksToday: 0, totalUsersCount: 0 });
      setRecentTasks([]);
      setAllUsers([]);
      return;
    }

    setLoadingDashboard(true);
    const tasksCollectionRef = collection(firestore, "tasks");

    const fetchStatsAndTasks = async () => {
      try {
        const incompleteTasksQuery = query(tasksCollectionRef, where("userId", "==", user.uid), where("completed", "==", false));
        const incompleteTasksSnapshot = await getCountFromServer(incompleteTasksQuery);
        const incompleteCount = incompleteTasksSnapshot.data().count;

        const today = new Date();
        const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        const endOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);
        
        const tasksTodayQuery = query(tasksCollectionRef, 
          where("userId", "==", user.uid), 
          where("createdAt", ">=", Timestamp.fromDate(startOfToday)),
          where("createdAt", "<", Timestamp.fromDate(endOfToday))
        );
        const tasksTodaySnapshot = await getCountFromServer(tasksTodayQuery);
        const todayCount = tasksTodaySnapshot.data().count;

        setStats(prevStats => ({ ...prevStats, incompleteTasks: incompleteCount, tasksToday: todayCount }));

        const recentTasksQuery = query(
          tasksCollectionRef,
          where("userId", "==", user.uid),
          orderBy("createdAt", "desc"),
          limit(3)
        );
        const unsubscribeRecentTasks = onSnapshot(recentTasksQuery, (snapshot) => {
          const fetchedTasks: Task[] = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          } as Task));
          setRecentTasks(fetchedTasks);
          if (!allUsers.length) setLoadingDashboard(false); 
        }, (error) => {
          console.error("Error fetching recent tasks:", error);
          setRecentTasks([]);
          if (!allUsers.length) setLoadingDashboard(false);
        });
        
        return () => unsubscribeRecentTasks();

      } catch (error) {
        console.error("Error fetching dashboard stats/tasks:", error);
        setStats(prevStats => ({ ...prevStats, incompleteTasks: 0, tasksToday: 0 }));
        setRecentTasks([]);
      }
    };

    fetchStatsAndTasks();
    
  }, [user, isFirebaseConfigured, firestore]); 

  useEffect(() => {
    if (!user || !firestore || !isFirebaseConfigured) {
        setAllUsers([]);
        setStats(prev => ({ ...prev, totalUsersCount: 0 }));
        setLoadingDashboard(false);
        return;
    }
    setLoadingDashboard(true);
    const usersCollectionRef = collection(firestore, "users");
    const qUsers = query(usersCollectionRef, where("uid", "!=", user.uid)); 

    const fetchAllUsers = async () => {
        try {
            const snapshot = await getDocs(qUsers);
            const fetchedUsers = snapshot.docs
                .map(doc => doc.data() as UserProfile)
                .sort((a,b) => (a.handle > b.handle) ? 1 : -1); 

            setAllUsers(fetchedUsers);
            setStats(prevStats => ({ ...prevStats, totalUsersCount: fetchedUsers.length }));
            setLoadingDashboard(false); 
        } catch (error) {
            console.error("Error fetching all users:", error);
            setAllUsers([]);
            setStats(prevStats => ({ ...prevStats, totalUsersCount: 0 }));
            setLoadingDashboard(false);
        }
    };
    fetchAllUsers();
    // No onSnapshot here to reduce reads for this list unless frequent updates are critical
  }, [user, isFirebaseConfigured, firestore]);

  const handleUserClick = (targetUser: UserProfile) => {
    router.push(`/messages?dm=${targetUser.uid}`);
  };
  
  const dashboardCards = [
    { title: "Pending Directives", value: stats.incompleteTasks, icon: <ListChecks className="h-6 w-6 text-primary" />, dataAiHint: "checklist tasks" },
    { title: "Ops Initiated Today", value: stats.tasksToday, icon: <CalendarCheck className="h-6 w-6 text-primary" />, dataAiHint: "calendar task" },
    { title: "Total Operatives", value: stats.totalUsersCount, icon: <Users className="h-6 w-6 text-primary" />, dataAiHint: "people group" },
  ];
  
  if (authLoading && !isFirebaseConfigured) {
     return <PageWrapper title="System Overview" titleIcon={<LayoutDashboard />} description="Initializing command center...">
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-32 w-full" />)}
        </div>
        <Skeleton className="h-64 w-full mt-8" />
        <Skeleton className="h-48 w-full mt-8" />
      </PageWrapper>;
  }

  if (!isFirebaseConfigured) {
    return (
      <PageWrapper title="System Overview" titleIcon={<LayoutDashboard />}>
        <Card><CardContent className="p-4 text-destructive">Firebase is not configured. Dashboard is unavailable.</CardContent></Card>
      </PageWrapper>
    );
  }

  if (!user && !authLoading) { 
     return (
      <PageWrapper title="System Overview" titleIcon={<LayoutDashboard />}>
        <Card><CardContent className="p-4 text-muted-foreground">Please log in to view the dashboard.</CardContent></Card>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper title="System Overview" titleIcon={<LayoutDashboard />} description={`Welcome, ${user?.displayName || user?.email?.split('@')[0] || 'Operative'}. Command center online.`}>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {(loadingDashboard && authLoading) || (loadingDashboard && !authLoading && user) ? (
          [...Array(3)].map((_, i) => (
            <Card key={i} className="shadow-lg border-primary/30">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <Skeleton className="h-5 w-3/5" />
                <Skeleton className="h-6 w-6 rounded-full" />
              </CardHeader>
              <CardContent className="pt-6"> 
                <Skeleton className="h-8 w-1/3 mb-1" />
                <Skeleton className="h-3 w-2/5" />
              </CardContent>
            </Card>
          ))
        ) : (
          dashboardCards.map((stat) => (
            <Card key={stat.title} className="shadow-lg border-primary/30 hover:shadow-primary/20 transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-accent">{stat.title}</CardTitle>
                <div className="icon-glow-primary">{stat.icon}</div>
              </CardHeader>
              <CardContent className="pt-6"> 
                <div className="text-3xl font-bold text-glow-primary">{stat.value}</div>
                <p className="text-xs text-muted-foreground">Current status</p>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-8">
        <Card className="lg:col-span-2 shadow-lg border-primary/30">
          <CardHeader>
            <CardTitle className="text-xl text-glow-primary">Recent Activity Feed</CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            {loadingDashboard && recentTasks.length === 0 ? ( // Show skeleton only if tasks aren't loaded yet
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
              </div>
            ) : recentTasks.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Activity className="h-12 w-12 mx-auto mb-4 text-primary/50" />
                <p>No recent activity in your log.</p>
                <p className="text-sm">Start by adding a new task in the planner.</p>
                <Button asChild variant="link" className="mt-2 text-primary hover:text-glow-primary">
                  <Link href="/planner">Go to Planner</Link>
                </Button>
              </div>
            ) : (
              <ul className="space-y-3">
                {recentTasks.map(task => (
                  <li key={task.id} className={`flex items-center justify-between p-3 rounded-md border ${task.completed ? "border-green-500/20 bg-green-500/5" : "border-border/70"}`}>
                    <div>
                      <p className={`text-sm font-medium ${task.completed ? "line-through text-muted-foreground" : "text-foreground"}`}>{task.text}</p>
                      <div className="flex items-center text-xs text-muted-foreground">
                        <span>{task.completed ? "Completed" : "Added"} {task.createdAt ? formatDistanceToNowStrict(task.createdAt.toDate(), { addSuffix: true }) : ''}</span>
                        <Badge 
                          variant={task.priority === "Critical" ? "destructive" : task.priority === "High" ? "secondary" : task.priority === "Medium" ? "default" : "outline"} 
                          className={`ml-2 scale-75 origin-left ${
                            task.priority === "Critical" ? "bg-red-500/80 text-white" :
                            task.priority === "High" ? "bg-yellow-500/80 text-black" : 
                            task.priority === "Medium" ? "bg-blue-500/80 text-white" :
                            "border-primary text-primary" 
                          }`}
                        >
                          {task.priority}
                        </Badge>
                         {task.completed && task.completedByHandle && (
                          <span className="ml-2 text-green-400">(By: {task.completedByHandle === (user?.displayName || user?.email?.split('@')[0]) ? "You" : task.completedByHandle})</span>
                        )}
                      </div>
                    </div>
                    <Link href="/planner">
                      <Button variant="ghost" size="sm" className="text-xs text-primary hover:text-glow-primary">View</Button>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
            {recentTasks.length > 0 && (
               <div className="mt-4 text-right">
                  <Button asChild variant="outline" className="border-accent text-accent hover:bg-accent/10">
                    <Link href="/planner">View All Tasks</Link>
                  </Button>
               </div>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-1 shadow-lg border-primary/30">
          <CardHeader>
            <CardTitle className="text-xl text-glow-primary">All Operatives</CardTitle>
          </CardHeader>
          <CardContent className="pt-6 max-h-96 overflow-y-auto">
            {loadingDashboard && allUsers.length === 0 ? ( // Show skeleton only if users aren't loaded
              <div className="space-y-2">
                {[...Array(3)].map((_, i) => (
                    <div key={i} className="flex items-center space-x-3 p-2">
                        <Skeleton className="h-10 w-10 rounded-full" />
                        <div className="space-y-1">
                            <Skeleton className="h-4 w-24" />
                            <Skeleton className="h-3 w-16" />
                        </div>
                    </div>
                ))}
              </div>
            ) : allUsers.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">No other operatives found.</p>
            ) : (
              <ul className="space-y-2">
                {allUsers.map(opUser => (
                  <li key={opUser.uid} className="p-2 rounded-md hover:bg-accent/10">
                    <button onClick={() => handleUserClick(opUser)} className="flex items-center space-x-3 w-full text-left group">
                      <Avatar className="h-10 w-10 border-2 border-accent group-hover:border-primary transition-colors">
                        <AvatarImage src={opUser.photoURL || `https://picsum.photos/seed/${opUser.uid}/40/40`} alt={opUser.handle} data-ai-hint="hacker avatar small" />
                        <AvatarFallback className="bg-accent text-accent-foreground group-hover:bg-primary group-hover:text-primary-foreground">
                          {opUser.handle[0].toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium text-foreground group-hover:text-glow-primary">{opUser.handle}</p>
                        {/* Online status / last seen removed */}
                      </div>
                      <MessageSquareIcon className="ml-auto h-5 w-5 text-primary opacity-0 group-hover:opacity-100 transition-opacity" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </PageWrapper>
  );
}
