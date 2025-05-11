
"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { PageWrapper } from "@/components/layout/page-wrapper";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { CalendarCheck, PlusSquare, Users, ListFilter, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useAuth } from '@/hooks/use-auth';
import { firestore } from '@/lib/firebase';
import { collection, query, where, orderBy, onSnapshot, addDoc, doc, updateDoc, deleteDoc, serverTimestamp, Timestamp, deleteField } from 'firebase/firestore';
import { TaskForm, TaskFormData, priorities, Priority } from '@/components/planner/task-form';
import { Dialog, DialogTrigger } from '@/components/ui/dialog'; 
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';

interface Task {
  id: string;
  text: string;
  completed: boolean;
  priority: Priority;
  team?: string;
  userId: string; // UID of the user who created the task
  createdAt: Timestamp;
  completedByUid?: string | null; 
  completedByHandle?: string | null;
}

export default function PlannerPage() {
  const { user, loading: authLoading, isFirebaseConfigured } = useAuth();
  const { toast } = useToast();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loadingTasks, setLoadingTasks] = useState(true);
  const [isFormDialogOpen, setIsFormDialogOpen] = useState(false);

  useEffect(() => {
    if (typeof document !== 'undefined') {
        document.title = 'Daily Planner - Black HAT Commit';
    }
  }, []);

  useEffect(() => {
    if (!user || !firestore || !isFirebaseConfigured) {
      setLoadingTasks(false);
      setTasks([]);
      return;
    }

    setLoadingTasks(true);
    const tasksCollectionRef = collection(firestore, "tasks");
    // For now, shows tasks created by the user OR tasks assigned to a team they might be part of (conceptual for team field)
    // For simplicity, we'll primarily focus on tasks where userId matches user.uid for deletion.
    // A more complex query would be needed for "team tasks view".
    // This query fetches tasks created by ANYONE if team functionality were fully implemented and user was part of team.
    // For now, we filter client-side or adjust if strict "my created tasks only" is required.
    // To show all tasks:
    // const q = query(tasksCollectionRef, orderBy("createdAt", "desc"));
    // To show only user's created tasks:
    const q = query(
      tasksCollectionRef,
      where("userId", "==", user.uid), 
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedTasks: Task[] = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Task));
      setTasks(fetchedTasks);
      setLoadingTasks(false);
    }, (error) => {
      console.error("Error fetching tasks:", error);
      toast({ variant: "destructive", title: "Error", description: "Could not fetch tasks." });
      setLoadingTasks(false);
      setTasks([]);
    });

    return () => unsubscribe();
  }, [user, isFirebaseConfigured, toast]);

  const completedTasksCount = useMemo(() => tasks.filter(t => t.completed).length, [tasks]);
  const totalTasks = tasks.length;
  const progressPercentage = totalTasks > 0 ? (completedTasksCount / totalTasks) * 100 : 0;

  const handleCreateTask = async (data: TaskFormData) => {
    if (!user || !firestore) {
      toast({ variant: "destructive", title: "Error", description: "Authentication or database error." });
      return;
    }
    if (!user.permissions?.canAddTasks) {
      toast({ variant: "destructive", title: "Permission Denied", description: "You do not have permission to add tasks." });
      setIsFormDialogOpen(false);
      return;
    }
    try {
      await addDoc(collection(firestore, "tasks"), {
        ...data,
        userId: user.uid, 
        completed: false,
        createdAt: serverTimestamp(),
        completedByUid: null,
        completedByHandle: null,
      });
      setIsFormDialogOpen(false);
      toast({ title: "Success", description: "Task created successfully." });
    } catch (error) {
      console.error("Error creating task:", error);
      toast({ variant: "destructive", title: "Error", description: "Failed to create task." });
    }
  };

  const handleToggleComplete = async (taskId: string, currentStatus: boolean) => {
    if (!firestore || !user) {
      toast({ variant: "destructive", title: "Error", description: "Authentication or database error." });
      return;
    }
     if (!user.permissions?.canCompleteTasks) {
      toast({ variant: "destructive", title: "Permission Denied", description: "You do not have permission to complete tasks." });
      return;
    }
    const taskDocRef = doc(firestore, "tasks", taskId);
    try {
      const updateData: { 
        completed: boolean; 
        completedByUid?: string | null | ReturnType<typeof deleteField>; 
        completedByHandle?: string | null | ReturnType<typeof deleteField>;
      } = {
        completed: !currentStatus,
      };

      const userHandle = user.handle || user.displayName || user.email?.split('@')[0] || "Operative";
      if (!currentStatus) { 
        updateData.completedByUid = user.uid;
        updateData.completedByHandle = userHandle;
      } else { 
        updateData.completedByUid = deleteField(); 
        updateData.completedByHandle = deleteField();
      }
      await updateDoc(taskDocRef, updateData);
      toast({ title: "Status Updated", description: `Task marked as ${updateData.completed ? 'complete' : 'incomplete'}.` });
    } catch (error) {
      console.error("Error updating task status:", error);
      toast({ variant: "destructive", title: "Error", description: "Failed to update task status." });
    }
  };

  const handleDeleteTask = async (taskId: string, taskCreatorId: string) => {
    if (!firestore || !user) {
      toast({ variant: "destructive", title: "Error", description: "Authentication or database error." });
      return;
    }
    // Only creator can delete, or an admin (admin check not implemented here yet for deletion)
    if (user.uid !== taskCreatorId && !user.isAdmin) {
      toast({ variant: "destructive", title: "Unauthorized", description: "You can only delete tasks you created." });
      return;
    }
    const taskDocRef = doc(firestore, "tasks", taskId);
    try {
      await deleteDoc(taskDocRef);
      toast({ title: "Task Deleted", description: "Task removed successfully." });
    } catch (error)      
    {
      console.error("Error deleting task:", error);
      toast({ variant: "destructive", title: "Error", description: "Failed to delete task." });
    }
  };
  
  if (authLoading) {
    return <PageWrapper title="Mission Control: Daily Ops" titleIcon={<CalendarCheck />} description="Loading planner...">
        <Skeleton className="h-24 w-full mb-6" />
        <Skeleton className="h-64 w-full" />
      </PageWrapper>;
  }

  if (!isFirebaseConfigured) {
    return (
      <PageWrapper title="Mission Control: Daily Ops" titleIcon={<CalendarCheck />}>
        <Card><CardContent className="p-4 text-destructive">Firebase is not configured. Planner is unavailable.</CardContent></Card>
      </PageWrapper>
    );
  }
  
  if (!user) {
    return (
      <PageWrapper title="Mission Control: Daily Ops" titleIcon={<CalendarCheck />}>
        <Card><CardContent className="p-4 text-muted-foreground">Please log in to access the planner.</CardContent></Card>
      </PageWrapper>
    );
  }


  return (
    <PageWrapper title="Mission Control: Daily Ops" titleIcon={<CalendarCheck />} description="Coordinate tasks, track progress, and manage team objectives.">
      <Dialog open={isFormDialogOpen} onOpenChange={setIsFormDialogOpen}>
        <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="border-primary/30">
            <CardHeader><CardTitle className="text-lg text-accent">Overall Progress</CardTitle></CardHeader>
            <CardContent className="pt-6">
              <Progress value={progressPercentage} className="w-full h-3 [&>div]:bg-primary" />
              <div className="text-sm text-muted-foreground mt-2">
                {loadingTasks ? <Skeleton className="h-4 w-2/3" /> : `${completedTasksCount} of ${totalTasks} tasks completed.`}
              </div>
            </CardContent>
          </Card>
          <DialogTrigger asChild>
            <Button variant="default" className="md:col-span-1 h-full text-lg" disabled={!user.permissions?.canAddTasks}>
              <PlusSquare className="mr-2 h-6 w-6" /> New Task / Objective
            </Button>
          </DialogTrigger>
          <div className="md:col-span-1 flex items-center justify-end gap-2">
            <Button variant="outline" className="border-accent text-accent hover:bg-accent/10" disabled>
                <Users className="mr-2 h-4 w-4" /> Team View
              </Button>
              <Button variant="outline" className="border-accent text-accent hover:bg-accent/10" disabled>
                <ListFilter className="mr-2 h-4 w-4" /> Filters
              </Button>
          </div>
        </div>
        <TaskForm onSubmit={handleCreateTask} onCancel={() => setIsFormDialogOpen(false)} />
      </Dialog>

      <Card className="border-primary/30">
        <CardHeader>
          <CardTitle className="text-xl text-glow-primary">Your Directives</CardTitle>
          <CardDescription>Tasks you have created. Others with permission can mark them complete.</CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          {loadingTasks ? (
            <div className="space-y-3">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : tasks.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No tasks assigned by you. {user.permissions?.canAddTasks ? "Add your first objective!" : "You do not have permission to add tasks."}</p>
          ) : (
            <ul className="space-y-3">
              {tasks.map(task => (
                <li key={task.id} className={`flex items-center space-x-3 p-3 rounded-md border ${task.completed ? 'border-green-500/30 bg-green-500/10' : 'border-border hover:bg-card/80'}`}>
                  <Checkbox 
                    id={`task-${task.id}`}
                    checked={task.completed} 
                    onCheckedChange={() => handleToggleComplete(task.id, task.completed)}
                    className="border-primary data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground" 
                    disabled={!user.permissions?.canCompleteTasks}
                  />
                  <label htmlFor={`task-${task.id}`} className={`flex-1 text-sm ${task.completed ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                    {task.text}
                  </label>
                  <Badge variant={task.priority === "Critical" ? "destructive" : task.priority === "High" ? "secondary" : "outline"}
                    className={
                      task.priority === "Critical" ? "bg-red-500/80 text-white" : 
                      task.priority === "High" ? "bg-yellow-500/80 text-black" : 
                      task.priority === "Medium" ? "bg-blue-500/80 text-white" : 
                      "border-primary text-primary" 
                    }
                  >
                    {task.priority}
                  </Badge>
                  {task.team && <Badge variant="outline" className="text-xs text-muted-foreground border-accent/50">{task.team}</Badge>}
                  {task.completed && task.completedByHandle && (
                    <Badge variant="outline" className="text-xs text-green-400 border-green-400/50">
                      By: {task.completedByHandle === (user.handle || user.displayName || user.email?.split('@')[0]) ? "You" : task.completedByHandle}
                    </Badge>
                  )}
                  {(user.uid === task.userId || user.isAdmin ) && ( // Creator or Admin can delete
                    <Button variant="ghost" size="icon" onClick={() => handleDeleteTask(task.id, task.userId)} className="text-destructive hover:text-destructive/80 h-8 w-8">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
      <Card className="mt-8 border-primary/30">
        <CardHeader>
          <CardTitle className="text-xl text-glow-primary">Team Activity Stream (Concept)</CardTitle>
          <CardDescription>Real-time updates on team member task progression (requires different task fetching logic and team membership system).</CardDescription>
        </CardHeader>
        <CardContent className="pt-6 text-muted-foreground">
          <p>This section would display tasks from all users or specific teams if team functionality were implemented. Currently, the main list above shows tasks you created.</p>
        </CardContent>
      </Card>
    </PageWrapper>
  );
}
