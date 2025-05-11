
"use client";

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { uploadToCloudinary } from '@/lib/cloudinary';
import { useToast } from '@/hooks/use-toast';
import { Progress } from '@/components/ui/progress';


// This is the data structure the PARENT PAGE (StoriesPage) expects for creating a story.
export interface StoryFormData {
  imageUrl: string;
  caption?: string;
  dataAiHint?: string;
}

// Internal form schema for react-hook-form within this component
const internalStoryFormSchema = z.object({
  storyFile: z.custom<FileList>()
    .refine((files) => files && files.length > 0, "An image file is required.")
    .refine((files) => files?.[0]?.size <= 10 * 1024 * 1024, `Max file size is 10MB.`) // Max 10MB
    .refine(
      (files) => files && files[0] && ["image/jpeg", "image/png", "image/gif", "image/webp"].includes(files[0].type),
      "Only .jpg, .png, .gif, .webp formats are supported."
    ),
  caption: z.string().max(280, "Caption must be 280 characters or less.").optional(),
  dataAiHint: z.string().max(50, "AI hint must be 50 characters or less.").optional(),
});
type InternalStoryFormData = z.infer<typeof internalStoryFormSchema>;

interface StoryFormProps {
  onSubmit: (data: StoryFormData) => Promise<void>; // onSubmit in parent now receives Cloudinary URL
  onCancel: () => void;
}

export function StoryForm({ onSubmit, onCancel }: StoryFormProps) {
  const { toast } = useToast();
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0); // Basic progress simulation

  const form = useForm<InternalStoryFormData>({
    resolver: zodResolver(internalStoryFormSchema),
    defaultValues: {
      caption: "",
      dataAiHint: "user story",
    },
  });

  const handleSubmit = async (data: InternalStoryFormData) => {
    if (!data.storyFile || data.storyFile.length === 0) {
      toast({ variant: 'destructive', title: 'No file selected', description: 'Please select an image file to upload.' });
      return;
    }
    const fileToUpload = data.storyFile[0];

    setIsUploading(true);
    setUploadProgress(30); // Simulate progress

    try {
      const cloudinaryResponse = await uploadToCloudinary(fileToUpload);
      setUploadProgress(70); 
      
      await onSubmit({ 
        imageUrl: cloudinaryResponse.secure_url, 
        caption: data.caption,
        dataAiHint: data.dataAiHint || "user story"
      });
      
      setUploadProgress(100);
      toast({ title: 'Story Uploaded', description: 'Your story is now live!' });
      form.reset();
      onCancel(); // Close dialog on success
    } catch (error) {
      console.error("Story upload error:", error);
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
      toast({ variant: 'destructive', title: 'Upload Failed', description: errorMessage });
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  return (
    <DialogContent className="sm:max-w-[480px] bg-card border-primary/50">
      <DialogHeader>
        <DialogTitle className="text-glow-primary">Share Ephemeral Intel</DialogTitle>
        <DialogDescription>
          Post a temporary visual update. It will vanish after 24 hours. Max 10MB.
        </DialogDescription>
      </DialogHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4 py-4">
          <FormField
            control={form.control}
            name="storyFile"
            render={({ field: { onChange, value, ...rest } }) => ( // Manually handle onChange for FileList
              <FormItem>
                <FormLabel className="text-accent">Image File</FormLabel>
                <FormControl>
                  <Input 
                    type="file"
                    accept="image/jpeg,image/png,image/gif,image/webp"
                    onChange={(e) => onChange(e.target.files)} // Pass FileList to RHF
                    {...rest}
                    className="bg-input border-border focus:border-primary file:text-primary file:font-semibold file:mr-2 file:border-0 file:bg-primary/10 file:px-2 file:py-1 file:rounded-sm" 
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="caption"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-accent">Caption (Optional)</FormLabel>
                <FormControl>
                  <Textarea 
                    placeholder="Add a brief description or context..." 
                    {...field} 
                    className="bg-input border-border focus:border-primary min-h-[80px]"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
           <FormField
            control={form.control}
            name="dataAiHint"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-accent">AI Image Hint (Optional)</FormLabel>
                <FormControl>
                  <Input 
                    placeholder="e.g., abstract tech, cityscape night" 
                    {...field} 
                    className="bg-input border-border focus:border-primary"
                  />
                </FormControl>
                 <FormDescription className="text-xs">One or two keywords for image search if using placeholder.</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          {isUploading && (
            <div className="space-y-1">
              <Label className="text-sm text-muted-foreground">Uploading...</Label>
              <Progress value={uploadProgress} className="w-full h-2 [&>div]:bg-primary" />
            </div>
          )}
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline" onClick={onCancel} className="border-accent text-accent hover:bg-accent/10" disabled={isUploading}>
                Cancel
              </Button>
            </DialogClose>
            <Button type="submit" variant="default" disabled={isUploading}>
              {isUploading ? 'Posting...' : 'Post Story'}
            </Button>
          </DialogFooter>
        </form>
      </Form>
    </DialogContent>
  );
}
