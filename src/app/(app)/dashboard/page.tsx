
"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { PageWrapper } from "@/components/layout/page-wrapper";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { LayoutDashboard, ListChecks, CalendarCheck, Users as UsersIcon, Activity, MessageSquare as MessageSquareIcon, CheckSquare, Newspaper } from "lucide-react";
import { useAuth } from '@/hooks/use-auth';
import { firestore } from '@/lib/firebase';
import { collection, query, where, orderBy, limit, onSnapshot, Timestamp, getCountFromServer, getDocs, doc } from 'firebase/firestore';
import { Skeleton } from '@/components/ui/skeleton';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { formatDistanceToNowStrict } from 'date-fns';
import type { Priority } from '@/components/planner/task-form'; 
import { Badge } from '@/components/ui/badge'; 
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import Image from "next/image";
import { useRouter } from 'next/navigation';

interface Task {
  id: string;
  text: string;
  completed: boolean;
  priority: Priority; 
  createdAt: Timestamp;
  completedAt?: Timestamp;
  completedByUid?: string | null;
  completedByHandle?: string | null;
  userId: string; // Creator of the task
}

interface UserProfile {
  uid: string;
  handle: string;
  email?: string;
  photoURL?: string | null;
}

interface CommunityPost {
  id: string;
  authorId: string;
  authorHandle: string;
  authorAvatarSeed?: string;
  authorPhotoURL?: string | null;
  content: string;
  imageUrl?: string | null;
  imageHint?: string;
  createdAt: Timestamp;
  likes: number; 
  comments: number; 
}

interface DashboardStats {
  incompleteTasks: number; // Current user's incomplete tasks
  tasksToday: number; // Current user's tasks initiated today
  totalUsersCount: number;
}

export default function DashboardPage() {
  const { user, loading: authLoading, isFirebaseConfigured } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState<DashboardStats>({ incompleteTasks: 0, tasksToday: 0, totalUsersCount: 0 });
  const [recentTasks, setRecentTasks] = useState<Task[]>([]); // Will show all users' pending tasks
  const [completedTasks, setCompletedTasks] = useState<Task[]>([]);
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [userHandlesMap, setUserHandlesMap] = useState<Record<string, string>>({});

  const [latestCommunityPost, setLatestCommunityPost] = useState<CommunityPost | null>(null);
  const [loadingLatestCommunityPost, setLoadingLatestCommunityPost] = useState(true);

  const [loadingDashboardData, setLoadingDashboardData] = useState(true); // Combined loading for tasks and users
  const [loadingCompletedTasksData, setLoadingCompletedTasksData] = useState(true);


  useEffect(() => {
    if (typeof document !== 'undefined') {
        document.title = 'Dashboard - Black HAT Commit';
    }
  }, []);
  
  useEffect(() => {
    if (allUsers.length > 0) {
      const map: Record<string, string> = {};
      allUsers.forEach(u => {
        if (u.handle) map[u.uid] = u.handle;
      });
      setUserHandlesMap(map);
    }
  }, [allUsers]);

  // Fetch stats (user-specific) and recent tasks (all users)
  useEffect(() => {
    if (!user || !firestore || !isFirebaseConfigured) {
      setLoadingDashboardData(false);
      setStats({ incompleteTasks: 0, tasksToday: 0, totalUsersCount: 0 });
      setRecentTasks([]);
      return;
    }

    setLoadingDashboardData(true);
    const tasksCollectionRef = collection(firestore, "tasks");

    // Fetch user-specific stats
    const fetchUserStats = async () => {
      try {
        const incompleteUserTasksQuery = query(tasksCollectionRef, where("userId", "==", user.uid), where("completed", "==", false));
        const incompleteTasksSnapshot = await getCountFromServer(incompleteUserTasksQuery);
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
      } catch (error) {
        console.error("Error fetching user stats:", error);
        setStats(prevStats => ({ ...prevStats, incompleteTasks: 0, tasksToday: 0 }));
      }
    };

    fetchUserStats();

    // Fetch recent incomplete tasks from ALL users for the feed
    const recentAllTasksQuery = query(
      tasksCollectionRef,
      where("completed", "==", false), 
      orderBy("createdAt", "desc"),
      limit(5) // Show 5 most recent pending tasks from anyone
    );
    const unsubscribeRecentTasks = onSnapshot(recentAllTasksQuery, (snapshot) => {
      const fetchedTasks: Task[] = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Task));
      setRecentTasks(fetchedTasks);
      // Consider this part of dashboard data loading
      if (allUsers.length > 0) setLoadingDashboardData(false); // If users also loaded
    }, (error) => {
      console.error("Error fetching recent all tasks:", error);
      setRecentTasks([]);
      if (allUsers.length > 0) setLoadingDashboardData(false);
    });
    
    return () => {
      unsubscribeRecentTasks();
    };
    
  }, [user, isFirebaseConfigured, firestore, allUsers.length]); // Rerun if allUsers changes to potentially set loading false

  // Fetch completed tasks (all users)
  useEffect(() => { 
    if (!user || !firestore || !isFirebaseConfigured) {
        setCompletedTasks([]);
        setLoadingCompletedTasksData(false);
        return;
    }
    setLoadingCompletedTasksData(true);
    const tasksCollectionRef = collection(firestore, "tasks");
    const completedTasksQuery = query(
        tasksCollectionRef,
        where("completed", "==", true),
        orderBy("completedAt", "desc"), // Order by completion time
        limit(5) 
    );
    const unsubscribeCompletedTasks = onSnapshot(completedTasksQuery, (snapshot) => {
        const fetchedCompletedTasks: Task[] = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        } as Task));
        setCompletedTasks(fetchedCompletedTasks);
        setLoadingCompletedTasksData(false);
    }, (error) => {
        console.error("Error fetching completed tasks:", error);
        setCompletedTasks([]);
        setLoadingCompletedTasksData(false);
    });
    return () => unsubscribeCompletedTasks();
  }, [user, isFirebaseConfigured, firestore]);

  // Fetch all users (for DMs list and resolving handles)
  useEffect(() => { 
    if (!user || !firestore || !isFirebaseConfigured) {
        setAllUsers([]);
        setStats(prev => ({ ...prev, totalUsersCount: 0 }));
        if (!loadingCompletedTasksData) setLoadingDashboardData(false);
        return;
    }
    // Ensure this loading state is also part of the overall dashboard loading
    const usersCollectionRef = collection(firestore, "users");
    const qUsers = query(usersCollectionRef); // Fetch all users to count and for handles

    const fetchAllUsers = async () => {
        try {
            const snapshot = await getDocs(qUsers);
            const fetchedUsers = snapshot.docs
                .map(docData => docData.data() as UserProfile)
                .sort((a,b) => (a.handle > b.handle) ? 1 : -1); 

            setAllUsers(fetchedUsers.filter(u => u.uid !== user.uid)); // For DM list, exclude self
            setStats(prevStats => ({ ...prevStats, totalUsersCount: snapshot.docs.length -1 })); // Count all others
        } catch (error) {
            console.error("Error fetching all users:", error);
            setAllUsers([]);
            setStats(prevStats => ({ ...prevStats, totalUsersCount: 0 }));
        } finally {
           // If recent tasks are already loaded or failed to load, set dashboard loading to false
           if (recentTasks.length > 0 || !loadingDashboardData) setLoadingDashboardData(false);
        }
    };
    fetchAllUsers();
  }, [user, isFirebaseConfigured, firestore, loadingCompletedTasksData, recentTasks.length, loadingDashboardData]);

  // Fetch latest community post
  useEffect(() => {
    if (!firestore || !isFirebaseConfigured) {
      setLoadingLatestCommunityPost(false);
      setLatestCommunityPost(null);
      return;
    }
    setLoadingLatestCommunityPost(true);
    const postsCollectionRef = collection(firestore, "communityPosts");
    const q = query(postsCollectionRef, orderBy("createdAt", "desc"), limit(1));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        const postDoc = snapshot.docs[0];
        setLatestCommunityPost({ id: postDoc.id, ...postDoc.data() } as CommunityPost);
      } else {
        setLatestCommunityPost(null);
      }
      setLoadingLatestCommunityPost(false);
    }, (error) => {
      console.error("Error fetching latest community post:", error);
      setLatestCommunityPost(null);
      setLoadingLatestCommunityPost(false);
    });
    return () => unsubscribe();
  }, [isFirebaseConfigured, firestore]);


  const handleUserClick = (targetUser: UserProfile) => {
    router.push(`/messages?dm=${targetUser.uid}`);
  };
  
  const dashboardCards = [
    { title: "Pending Directives (Yours)", value: stats.incompleteTasks, icon: <ListChecks className="h-6 w-6 text-primary" />, dataAiHint: "checklist tasks" },
    { title: "Ops Initiated Today (Yours)", value: stats.tasksToday, icon: <CalendarCheck className="h-6 w-6 text-primary" />, dataAiHint: "calendar task" },
    { title: "Total Operatives", value: stats.totalUsersCount, icon: <UsersIcon className="h-6 w-6 text-primary" />, dataAiHint: "people group" },
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

  const overallLoading = loadingDashboardData || authLoading || loadingCompletedTasksData || loadingLatestCommunityPost;

  return (
    <PageWrapper title="System Overview" titleIcon={<LayoutDashboard />} description={`Welcome, ${user?.handle || user?.displayName || user?.email?.split('@')[0] || 'Operative'}. Command center online.`}>
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {overallLoading && stats.incompleteTasks === 0 && stats.tasksToday === 0 && stats.totalUsersCount === 0 ? (
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
            <CardTitle className="text-xl text-glow-primary">Recent Activity Feed (All Pending Tasks)</CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            {loadingDashboardData && recentTasks.length === 0 ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
              </div>
            ) : recentTasks.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Activity className="h-12 w-12 mx-auto mb-4 text-primary/50" />
                <p>No pending tasks in the global log.</p>
                <p className="text-sm">Start by adding a new task in the planner.</p>
                <Button asChild variant="link" className="mt-2 text-primary hover:text-glow-primary">
                  <Link href="/planner">Go to Planner</Link>
                </Button>
              </div>
            ) : (
              <ul className="space-y-3">
                {recentTasks.map(task => {
                  const creatorHandle = task.userId === user.uid ? "You" : (userHandlesMap[task.userId] || "Another Operative");
                  return (
                  <li key={task.id} className={`flex items-center justify-between p-3 rounded-md border ${task.completed ? "border-green-500/20 bg-green-500/5" : "border-border/70"}`}>
                    <div>
                      <p className={`text-sm font-medium ${task.completed ? "line-through text-muted-foreground" : "text-foreground"}`}>{task.text}</p>
                      <div className="flex items-center text-xs text-muted-foreground">
                        <span>Added by: {creatorHandle}</span>
                        <span className='mx-1'>·</span>
                        <span>{task.createdAt ? formatDistanceToNowStrict(task.createdAt.toDate(), { addSuffix: true }) : ''}</span>
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
                          <span className="ml-2 text-green-400">(Completed By: {task.completedByHandle === (user?.handle || user?.displayName || user?.email?.split('@')[0]) ? "You" : task.completedByHandle})</span>
                        )}
                      </div>
                    </div>
                    <Link href="/planner">
                      <Button variant="ghost" size="sm" className="text-xs text-primary hover:text-glow-primary">View</Button>
                    </Link>
                  </li>
                )})}
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
            {loadingDashboardData && allUsers.length === 0 ? ( 
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
                          {opUser.handle?.[0]?.toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium text-foreground group-hover:text-glow-primary">{opUser.handle}</p>
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

      <Card className="mt-8 shadow-lg border-primary/30">
        <CardHeader>
          <CardTitle className="text-xl text-glow-primary flex items-center"><Newspaper className="mr-2 h-5 w-5"/> Latest Community Dispatch</CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          {loadingLatestCommunityPost ? (
            <Skeleton className="h-40 w-full" />
          ) : latestCommunityPost ? (
            <div>
              <div className="flex items-center space-x-3 mb-3">
                  <Avatar className="h-10 w-10 border-2 border-accent">
                    <AvatarImage src={latestCommunityPost.authorPhotoURL || `https://picsum.photos/seed/${latestCommunityPost.authorAvatarSeed || latestCommunityPost.authorId}/40/40`} alt={latestCommunityPost.authorHandle} data-ai-hint="hacker avatar"/>
                    <AvatarFallback>{latestCommunityPost.authorHandle[0].toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium text-glow-accent">{latestCommunityPost.authorHandle}</p>
                    <p className="text-xs text-muted-foreground">
                      Posted {latestCommunityPost.createdAt ? formatDistanceToNowStrict(latestCommunityPost.createdAt.toDate(), { addSuffix: true }) : 'just now'}
                    </p>
                  </div>
              </div>
              <p className="text-foreground/90 mb-3 whitespace-pre-wrap text-sm">{latestCommunityPost.content.substring(0,200)}{latestCommunityPost.content.length > 200 ? "..." : ""}</p>
              {latestCommunityPost.imageUrl && (
                  <div className="rounded-md overflow-hidden border border-border aspect-video relative mb-3 max-h-64">
                    <Image src={latestCommunityPost.imageUrl} alt="Post image" layout="fill" objectFit="cover" data-ai-hint={latestCommunityPost.imageHint || "community image"} />
                  </div>
              )}
              <div className="mt-4 text-right">
                <Button asChild variant="outline" className="border-accent text-accent hover:bg-accent/10">
                  <Link href="/community">View in Community</Link>
                </Button>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <Newspaper className="h-12 w-12 mx-auto mb-4 text-primary/50" />
              <p>No community dispatches found recently.</p>
            </div>
          )}
        </CardContent>
      </Card>


      <Card className="mt-8 shadow-lg border-primary/30">
        <CardHeader>
          <CardTitle className="text-xl text-glow-primary flex items-center"><CheckSquare className="mr-2 h-5 w-5"/> Recently Completed Ops (All Users)</CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
            {loadingCompletedTasksData ? (
                <div className="space-y-3">
                    {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
                </div>
            ) : completedTasks.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                    <CheckSquare className="h-12 w-12 mx-auto mb-4 text-primary/50" />
                    <p>No operations marked as complete recently.</p>
                </div>
            ) : (
                <ul className="space-y-3">
                    {completedTasks.map(task => (
                        <li key={task.id} className="flex items-center justify-between p-3 rounded-md border border-green-500/30 bg-green-500/10">
                            <div>
                                <p className="text-sm font-medium line-through text-muted-foreground">{task.text}</p>
                                <div className="flex items-center text-xs text-muted-foreground">
                                    <span>Completed by: {task.completedByHandle || 'Unknown'}</span>
                                    <span className="mx-1">·</span>
                                    <span>{task.completedAt ? formatDistanceToNowStrict(task.completedAt.toDate(), { addSuffix: true }) : (task.createdAt ? `(Created: ${formatDistanceToNowStrict(task.createdAt.toDate(), { addSuffix: true })})` : '')}</span>
                                     <Badge 
                                        variant={task.priority === "Critical" ? "destructive" : task.priority === "High" ? "secondary" : task.priority === "Medium" ? "default" : "outline"} 
                                        className="ml-2 scale-75 origin-left opacity-70"
                                        >
                                        {task.priority}
                                    </Badge>
                                </div>
                            </div>
                            <Link href="/planner">
                                <Button variant="ghost" size="sm" className="text-xs text-primary hover:text-glow-primary">Details</Button>
                            </Link>
                        </li>
                    ))}
                </ul>
            )}
             {completedTasks.length > 0 && (
               <div className="mt-4 text-right">
                  <Button asChild variant="outline" className="border-accent text-accent hover:bg-accent/10">
                    <Link href="/planner">View All Tasks in Planner</Link>
                  </Button>
               </div>
            )}
        </CardContent>
      </Card>
    </PageWrapper>
  );
}

