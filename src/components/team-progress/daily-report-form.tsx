
"use client";

import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { DialogContent, DialogHeader, DialogTitle, DialogDescriptionUI, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { CalendarIcon } from 'lucide-react';

const dailyReportFormSchema = z.object({
  teamName: z.string().min(1, { message: "Team name is required." }).max(50, { message: "Team name must be 50 characters or less." }),
  reportDate: z.date({ required_error: "Report date is required." }),
  accomplishments: z.string().min(10, { message: "Accomplishments must be at least 10 characters." }),
  blockers: z.string().optional(),
});

export type DailyReportFormData = z.infer<typeof dailyReportFormSchema>;

interface DailyReportFormProps {
  onSubmit: (data: DailyReportFormData) => Promise<void>;
  onCancel: () => void;
  initialData?: Partial<DailyReportFormData>;
}

export function DailyReportForm({ onSubmit, onCancel, initialData }: DailyReportFormProps) {
  const form = useForm<DailyReportFormData>({
    resolver: zodResolver(dailyReportFormSchema),
    defaultValues: {
      teamName: initialData?.teamName || "",
      reportDate: initialData?.reportDate || new Date(),
      accomplishments: initialData?.accomplishments || "",
      blockers: initialData?.blockers || "",
    },
  });

  const handleSubmit = async (data: DailyReportFormData) => {
    await onSubmit(data);
    form.reset({ reportDate: new Date(), teamName: data.teamName, accomplishments: "", blockers: "" }); // Keep team name, reset others
  };

  return (
    <DialogContent className="sm:max-w-lg bg-card border-primary/50">
      <DialogHeader>
        <DialogTitle className="text-glow-primary">{initialData ? "Edit Daily Report" : "Submit Daily Report"}</DialogTitle>
        <DialogDescriptionUI>
          {initialData ? "Update the details of this daily progress report." : "Log your team's progress for the selected date."}
        </DialogDescriptionUI>
      </DialogHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4 py-4">
          <FormField
            control={form.control}
            name="teamName"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-accent">Team Name</FormLabel>
                <FormControl>
                  <Input placeholder="e.g., Alpha Squad, Research Unit" {...field} className="bg-input border-border focus:border-primary" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="reportDate"
            render={({ field }) => (
              <FormItem className="flex flex-col">
                <FormLabel className="text-accent">Report Date</FormLabel>
                <Popover>
                  <PopoverTrigger asChild>
                    <FormControl>
                      <Button
                        variant={"outline"}
                        className={cn(
                          "w-full pl-3 text-left font-normal bg-input border-border hover:bg-input/80 focus:border-primary",
                          !field.value && "text-muted-foreground"
                        )}
                      >
                        {field.value ? (
                          format(field.value, "PPP")
                        ) : (
                          <span>Pick a date</span>
                        )}
                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                      </Button>
                    </FormControl>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0 bg-card border-primary/30" align="start">
                    <Calendar
                      mode="single"
                      selected={field.value}
                      onSelect={field.onChange}
                      disabled={(date) =>
                        date > new Date() || date < new Date("2000-01-01")
                      }
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="accomplishments"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-accent">Accomplishments</FormLabel>
                <FormControl>
                  <Textarea 
                    placeholder="Detail what was achieved today..." 
                    {...field} 
                    className="bg-input border-border focus:border-primary min-h-[120px]" 
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="blockers"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-accent">Blockers/Issues (Optional)</FormLabel>
                <FormControl>
                  <Textarea 
                    placeholder="Describe any challenges or impediments..." 
                    {...field} 
                    className="bg-input border-border focus:border-primary min-h-[80px]" 
                  />
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
            <Button type="submit" variant="default" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? "Submitting..." : (initialData ? "Save Changes" : "Submit Report")}
            </Button>
          </DialogFooter>
        </form>
      </Form>
    </DialogContent>
  );
}
