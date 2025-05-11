
"use client";

import React, { useState, useEffect, useMemo } from 'react';
import { PageWrapper } from "@/components/layout/page-wrapper";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { CalendarCheck, PlusSquare, Users, ListFilter, Trash2, ShieldAlert } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useAuth } from '@/hooks/use-auth';
import { firestore } from '@/lib/firebase';
import { collection, query, orderBy, onSnapshot, addDoc, doc, updateDoc, deleteDoc, serverTimestamp, Timestamp, deleteField } from 'firebase/firestore';
import { TaskForm, TaskFormData, priorities, Priority } from '@/components/planner/task-form';
import { Dialog, DialogTrigger, DialogClose } from '@/components/ui/dialog'; 
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription as AlertDialogDescriptionUI, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger as AlertDialogPrimitiveTrigger } from "@/components/ui/alert-dialog"; // Note: DialogDescription imported as AlertDialogDescriptionUI
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input'; // For confirmation input
import { Label } from '@/components/ui/label'; // For confirmation input

interface Task {
  id: string;
  text: string;
  completed: boolean;
  priority: Priority;
  team?: string;
  userId: string; 
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

  // State for task completion confirmation
  const [isConfirmCompleteDialogOpen, setIsConfirmCompleteDialogOpen] = useState(false);
  const [taskToComplete, setTaskToComplete] = useState<Task | null>(null);
  const [confirmationInput, setConfirmationInput] = useState("");


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
    // Show all tasks, ordered by creation date
    const q = query(tasksCollectionRef, orderBy("createdAt", "desc"));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedTasks: Task[] = snapshot.docs.map(docSnap => ({
        id: docSnap.id,
        ...docSnap.data()
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
  }, [user, isFirebaseConfigured, firestore, toast]);

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

  const openCompleteConfirmationDialog = (task: Task) => {
    if (task.completed) return; // Don't open if already completed
    if (!user?.permissions?.canCompleteTasks) {
      toast({ variant: "destructive", title: "Permission Denied", description: "You do not have permission to complete tasks." });
      return;
    }
    setTaskToComplete(task);
    setConfirmationInput(""); // Reset input
    setIsConfirmCompleteDialogOpen(true);
  };

  const handleConfirmCompleteTask = async () => {
    if (!firestore || !user || !taskToComplete || confirmationInput.toLowerCase() !== "yes") {
      if(confirmationInput.toLowerCase() !== "yes") {
        toast({ variant: "destructive", title: "Confirmation Failed", description: "Please type 'yes' to confirm."})
      }
      return;
    }

    const taskDocRef = doc(firestore, "tasks", taskToComplete.id);
    try {
      const userHandle = user.handle || user.displayName || user.email?.split('@')[0] || "Operative";
      await updateDoc(taskDocRef, {
        completed: true,
        completedByUid: user.uid,
        completedByHandle: userHandle,
      });
      toast({ title: "Task Completed", description: `Task "${taskToComplete.text}" marked as complete.` });
    } catch (error) {
      console.error("Error updating task status:", error);
      toast({ variant: "destructive", title: "Error", description: "Failed to update task status." });
    } finally {
      setIsConfirmCompleteDialogOpen(false);
      setTaskToComplete(null);
      setConfirmationInput("");
    }
  };


  const handleDeleteTask = async (taskId: string, taskCreatorId: string) => {
    if (!firestore || !user) {
      toast({ variant: "destructive", title: "Error", description: "Authentication or database error." });
      return;
    }
    if (user.uid !== taskCreatorId && !user.isAdmin) {
      toast({ variant: "destructive", title: "Unauthorized", description: "You can only delete tasks you created (or if you are an Admin)." });
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
    <PageWrapper title="Mission Control: Daily Ops" titleIcon={<CalendarCheck />} description="Coordinate tasks, track progress, and manage team objectives. All operatives' tasks are visible here.">
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
                <Users className="mr-2 h-4 w-4" /> Team View (Concept)
              </Button>
              <Button variant="outline" className="border-accent text-accent hover:bg-accent/10" disabled>
                <ListFilter className="mr-2 h-4 w-4" /> Filters (Concept)
              </Button>
          </div>
        </div>
        <TaskForm onSubmit={handleCreateTask} onCancel={() => setIsFormDialogOpen(false)} />
      </Dialog>

      <AlertDialog open={isConfirmCompleteDialogOpen} onOpenChange={setIsConfirmCompleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center"><ShieldAlert className="mr-2 h-5 w-5 text-destructive"/>Confirm Task Completion</AlertDialogTitle>
            <AlertDialogDescriptionUI>
              You are about to mark the task "<strong>{taskToComplete?.text}</strong>" as complete. This action cannot be undone.
              Please type "<strong>yes</strong>" in the box below to confirm.
            </AlertDialogDescriptionUI>
          </AlertDialogHeader>
          <div className="py-2">
            <Label htmlFor="confirmationText" className="text-accent">Confirmation</Label>
            <Input 
              id="confirmationText"
              type="text"
              value={confirmationInput}
              onChange={(e) => setConfirmationInput(e.target.value)}
              placeholder='Type "yes" to confirm'
              className="mt-1 bg-input border-border focus:border-primary"
            />
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {setTaskToComplete(null); setConfirmationInput("");}}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmCompleteTask} disabled={confirmationInput.toLowerCase() !== "yes"}>
              Confirm Completion
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>


      <Card className="border-primary/30">
        <CardHeader>
          <CardTitle className="text-xl text-glow-primary">All Operatives' Directives</CardTitle>
          <CardDescription>Tasks from all users. You can mark tasks complete if you have permission. Only task creators or admins can delete.</CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          {loadingTasks ? (
            <div className="space-y-3">
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
              <Skeleton className="h-12 w-full" />
            </div>
          ) : tasks.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">No tasks found. {user.permissions?.canAddTasks ? "Add the first objective!" : "No objectives assigned yet."}</p>
          ) : (
            <ul className="space-y-3">
              {tasks.map(task => (
                <li key={task.id} className={`flex items-center space-x-3 p-3 rounded-md border ${task.completed ? 'border-green-500/30 bg-green-500/10 opacity-70' : 'border-border hover:bg-card/80'}`}>
                  <Checkbox 
                    id={`task-${task.id}`}
                    checked={task.completed} 
                    onCheckedChange={() => !task.completed && openCompleteConfirmationDialog(task)}
                    className="border-primary data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground" 
                    disabled={!user.permissions?.canCompleteTasks || task.completed}
                    aria-label={task.completed ? "Task completed" : "Mark task as complete"}
                  />
                  <label htmlFor={`task-${task.id}`} className={`flex-1 text-sm ${task.completed ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                    {task.text}
                    {task.userId && !task.completed && <span className="text-xs text-muted-foreground/70 ml-1">(Added by: {task.userId === user.uid ? 'You' : 'Other'})</span>}
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
                  {(user.uid === task.userId || user.isAdmin ) && ( 
                    <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => handleDeleteTask(task.id, task.userId)} 
                        className="text-destructive hover:text-destructive/80 h-8 w-8"
                        title="Delete Task"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </PageWrapper>
  );
}
