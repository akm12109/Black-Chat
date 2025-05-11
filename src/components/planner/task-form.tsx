
"use client";

import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DialogContent, DialogHeader, DialogTitle, DialogDescriptionUI, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";

export const priorities = ["Low", "Medium", "High", "Critical"] as const;
export type Priority = typeof priorities[number];

const taskFormSchema = z.object({
  text: z.string().min(3, { message: "Task description must be at least 3 characters." }),
  priority: z.enum(priorities, { message: "Invalid priority level." }),
  team: z.string().optional(),
});

export type TaskFormData = z.infer<typeof taskFormSchema>;

interface TaskFormProps {
  onSubmit: (data: TaskFormData) => void;
  onCancel: () => void;
  initialData?: Partial<TaskFormData>;
}

export function TaskForm({ onSubmit, onCancel, initialData }: TaskFormProps) {
  const form = useForm<TaskFormData>({
    resolver: zodResolver(taskFormSchema),
    defaultValues: {
      text: initialData?.text || "",
      priority: initialData?.priority || "Medium",
      team: initialData?.team || "",
    },
  });

  const handleSubmit = (data: TaskFormData) => {
    onSubmit(data);
    form.reset(); 
  };

  return (
    <DialogContent className="sm:max-w-[425px] bg-card border-primary/50">
      <DialogHeader>
        <DialogTitle className="text-glow-primary">{initialData ? "Edit Objective" : "New Objective"}</DialogTitle>
        <DialogDescriptionUI>
          {initialData ? "Update the details of this operational task." : "Define a new task or objective for the mission."}
        </DialogDescriptionUI>
      </DialogHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4 py-4">
          <FormField
            control={form.control}
            name="text"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-accent">Task Description</FormLabel>
                <FormControl>
                  <Textarea placeholder="e.g., Infiltrate target network segment B" {...field} className="bg-input border-border focus:border-primary" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="priority"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-accent">Priority Level</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger className="bg-input border-border focus:border-primary">
                      <SelectValue placeholder="Select priority" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent className="bg-popover border-border">
                    {priorities.map(p => (
                      <SelectItem key={p} value={p} className="focus:bg-accent/50">
                        {p}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="team"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-accent">Assigned Team (Optional)</FormLabel>
                <FormControl>
                  <Input placeholder="e.g., Red Team, Alpha Squad" {...field} className="bg-input border-border focus:border-primary" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline" onClick={onCancel} className="border-accent text-accent hover:bg-accent/10">
                Cancel
              </Button>
            </DialogClose>
            <Button type="submit" variant="default">
              {initialData ? "Save Changes" : "Add Task"}
            </Button>
          </DialogFooter>
        </form>
      </Form>
    </DialogContent>
  );
}

    
