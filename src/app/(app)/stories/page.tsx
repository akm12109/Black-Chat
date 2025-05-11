
"use client";

import React, { useState, useEffect } from 'react';
import { PageWrapper } from "@/components/layout/page-wrapper";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Share2, PlusCircle } from "lucide-react";
import Image from "next/image";
import { useAuth } from '@/hooks/use-auth';
import { firestore } from '@/lib/firebase';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, Timestamp, where, doc, deleteDoc } from 'firebase/firestore';
import { StoryForm, type StoryFormData } from '@/components/stories/story-form';
import { Dialog, DialogTrigger, DialogContent as StoryDialogContent } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDistanceToNowStrict, isPast } from 'date-fns';
import { useToast } from '@/hooks/use-toast';

interface Story {
  id: string;
  userId: string;
  userHandle: string;
  userAvatarUrl?: string | null;
  imageUrl: string; 
  caption?: string;
  createdAt: Timestamp;
  expiresAt: Timestamp;
  dataAiHint?: string;
}


export default function StoriesPage() {
  const { user, loading: authLoading, isFirebaseConfigured } = useAuth();
  const { toast } = useToast();
  const [stories, setStories] = useState<Story[]>([]);
  const [loadingStories, setLoadingStories] = useState(true);
  const [isFormDialogOpen, setIsFormDialogOpen] = useState(false);
  const [selectedStory, setSelectedStory] = useState<Story | null>(null);


  useEffect(() => {
    if (typeof document !== 'undefined') {
        document.title = 'Stories - Black HAT Commit';
    }
  }, []);

  useEffect(() => {
    if (!firestore || !isFirebaseConfigured) {
      setLoadingStories(false);
      setStories([]);
      return;
    }

    setLoadingStories(true);
    const storiesCollectionRef = collection(firestore, "stories");
    const now = Timestamp.now();
    
    const q = query(
      storiesCollectionRef,
      where("expiresAt", ">", now), 
      orderBy("expiresAt", "asc"),
      orderBy("createdAt", "desc") 
    );

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const fetchedStories: Story[] = snapshot.docs
        .map(docSnap => ({ id: docSnap.id, ...docSnap.data() } as Story));
      
      const validStories: Story[] = [];
      const storiesToDelete: string[] = [];

      for (const story of fetchedStories) {
        if (story.expiresAt && isPast(story.expiresAt.toDate())) {
          storiesToDelete.push(story.id);
        } else {
          validStories.push(story);
        }
      }
      
      setStories(validStories);
      setLoadingStories(false);

      if (storiesToDelete.length > 0) {
        console.log(`Attempting to delete ${storiesToDelete.length} expired stories from client-side check.`);
        for (const storyId of storiesToDelete) {
          try {
            await deleteDoc(doc(firestore, "stories", storyId));
            console.log(`Successfully deleted expired story ${storyId}`);
          } catch (error) {
            console.error(`Failed to delete expired story ${storyId}:`, error);
          }
        }
      }

    }, (error) => {
      console.error("Error fetching stories:", error);
      toast({ variant: "destructive", title: "Error", description: "Could not fetch stories." });
      setLoadingStories(false);
      setStories([]);
    });

    return () => unsubscribe();
  }, [isFirebaseConfigured, firestore, toast]);

  const handleCreateStory = async (data: StoryFormData) => { 
    if (!user || !firestore) {
      toast({ variant: "destructive", title: "Error", description: "Authentication or database error." });
      return;
    }
    if (!user.permissions?.canCreateStories) {
        toast({ variant: "destructive", title: "Permission Denied", description: "You do not have permission to create stories." });
        setIsFormDialogOpen(false);
        return;
    }
    try {
      const createdAt = serverTimestamp() as Timestamp; 
      const expiresDate = new Date();
      expiresDate.setHours(expiresDate.getHours() + 24); 

      const userHandle = user.handle || user.displayName || user.email?.split('@')[0] || 'Anonymous';
      await addDoc(collection(firestore, "stories"), {
        imageUrl: data.imageUrl, 
        caption: data.caption || "",
        dataAiHint: data.dataAiHint || "user story",
        userId: user.uid,
        userHandle: userHandle,
        userAvatarUrl: user.photoURL,
        createdAt: createdAt, 
        expiresAt: Timestamp.fromDate(expiresDate),
      });
      setIsFormDialogOpen(false);
    } catch (error) {
      console.error("Error creating story in Firestore:", error);
      toast({ variant: "destructive", title: "Error", description: "Failed to save story details." });
    }
  };

  const getExpiryText = (expiresAtTimestamp: Timestamp | null | undefined) => {
    if (!expiresAtTimestamp) return "Expired";
    const expiresAtDate = expiresAtTimestamp.toDate();
    const now = new Date();
    if (expiresAtDate < now) return "Expired";
    
    const distance = formatDistanceToNowStrict(expiresAtDate, { addSuffix: true });
    if (distance.startsWith("in -")) return "Expired"; 
    return `Expires ${distance}`;
  };


  if (authLoading) {
    return <PageWrapper title="Ephemeral Intel" titleIcon={<Share2 />} description="Loading stories...">
        <Skeleton className="h-10 w-1/3 mb-6" />
        <div className="flex space-x-4 overflow-x-auto pb-4">
            {[...Array(4)].map((_, i) => <Skeleton key={i} className="min-w-[180px] w-[180px] h-[280px] rounded-md" />)}
        </div>
      </PageWrapper>;
  }

  if (!isFirebaseConfigured) {
    return (
      <PageWrapper title="Ephemeral Intel" titleIcon={<Share2 />}>
        <Card><CardContent className="p-6 text-destructive">Firebase is not configured. Stories are unavailable.</CardContent></Card>
      </PageWrapper>
    );
  }
  
  if (!user) {
     return (
      <PageWrapper title="Ephemeral Intel" titleIcon={<Share2 />}>
        <Card><CardContent className="p-6 text-muted-foreground">Please log in to view or add stories.</CardContent></Card>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper title="Ephemeral Intel" titleIcon={<Share2 />} description="Quick updates and visuals. Stories vanish after 24 hours.">
      <Dialog open={isFormDialogOpen} onOpenChange={setIsFormDialogOpen}>
        <div className="mb-6 flex justify-between items-center">
          <h2 className="text-xl font-semibold text-accent">Active Stories</h2>
          <DialogTrigger asChild>
            <Button variant="default" onClick={() => setIsFormDialogOpen(true)} disabled={!user.permissions?.canCreateStories}>
              <PlusCircle className="mr-2 h-5 w-5" /> Add Your Story
            </Button>
          </DialogTrigger>
        </div>
        {!user.permissions?.canCreateStories && isFormDialogOpen && setIsFormDialogOpen(false) /* Auto-close if permission lost while open */}
        {user.permissions?.canCreateStories && <StoryForm onSubmit={handleCreateStory} onCancel={() => setIsFormDialogOpen(false)} />}
      </Dialog>

      <div className="relative">
        {loadingStories ? (
          <div className="flex space-x-4 overflow-x-auto pb-4 scrollbar-thin scrollbar-thumb-primary/50 scrollbar-track-transparent">
            {[...Array(4)].map((_, i) => <Skeleton key={i} className="min-w-[180px] w-[180px] h-[280px] rounded-md" />)}
          </div>
        ) : stories.length === 0 ? (
          <Card className="border-primary/30">
            <CardContent className="p-6 text-center text-muted-foreground">
              <p>No active stories from the void yet.</p>
              {user.permissions?.canCreateStories && <p className="text-sm">Be the first to share ephemeral intel!</p>}
            </CardContent>
          </Card>
        ) : (
          <div className="flex space-x-4 overflow-x-auto pb-4 scrollbar-thin scrollbar-thumb-primary/50 scrollbar-track-transparent">
            {stories.map((story) => (
              <Card 
                key={story.id} 
                className="min-w-[180px] w-[180px] h-[280px] border-primary/30 hover:shadow-primary/20 transition-shadow overflow-hidden relative group cursor-pointer"
                onClick={() => setSelectedStory(story)}
              >
                <Image 
                  src={story.imageUrl} 
                  alt={story.caption || `${story.userHandle}'s story`} 
                  layout="fill" 
                  objectFit="cover"
                  className="group-hover:scale-105 transition-transform duration-300"
                  data-ai-hint={story.dataAiHint || "user story"}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent p-3 flex flex-col justify-end">
                  <div className="flex items-center space-x-2">
                    <Image 
                      src={story.userAvatarUrl || `https://picsum.photos/seed/${story.userId}/32/32`} 
                      alt={story.userHandle} 
                      width={32} height={32} 
                      className="rounded-full border-2 border-accent" 
                      data-ai-hint="hacker avatar small" 
                    />
                    <p className="text-sm font-medium text-glow-accent drop-shadow-md">{story.userHandle}</p>
                  </div>
                </div>
                {story.expiresAt && (
                    <div className="absolute top-2 right-2 text-xs bg-background/70 text-foreground px-1.5 py-0.5 rounded-sm">
                        {getExpiryText(story.expiresAt)}
                    </div>
                )}
              </Card>
            ))}
          </div>
        )}
      </div>
      
      {selectedStory && (
         <Dialog open={!!selectedStory} onOpenChange={(open) => !open && setSelectedStory(null)}>
            <StoryDialogContent className="max-w-3xl p-0 bg-card border-primary/50 overflow-hidden">
                <div className="relative aspect-[9/16] w-full">
                     <Image 
                        src={selectedStory.imageUrl}
                        alt={selectedStory.caption || `${selectedStory.userHandle}'s story`}
                        layout="fill"
                        objectFit="contain"
                        data-ai-hint={selectedStory.dataAiHint || "user story large"}
                     />
                </div>
                <div className="p-4 absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent">
                    <div className="flex items-center space-x-2 mb-2">
                        <Image 
                          src={selectedStory.userAvatarUrl || `https://picsum.photos/seed/${selectedStory.userId}/40/40`} 
                          alt={selectedStory.userHandle} 
                          width={40} height={40} 
                          className="rounded-full border-2 border-accent" 
                          data-ai-hint="hacker avatar" />
                        <p className="text-md font-semibold text-glow-accent">{selectedStory.userHandle}</p>
                    </div>
                    {selectedStory.caption && <p className="text-sm text-foreground/90">{selectedStory.caption}</p>}
                    {selectedStory.expiresAt && <p className="text-xs text-muted-foreground mt-1">{getExpiryText(selectedStory.expiresAt)}</p>}
                </div>
            </StoryDialogContent>
         </Dialog>
      )}
      {!selectedStory && stories.length > 0 && (
         <Card className="mt-8 border-dashed border-primary/30 bg-transparent">
            <CardContent className="p-6 text-center text-muted-foreground">
              <p>Click on a story above to view its content.</p>
            </CardContent>
          </Card>
      )}

    </PageWrapper>
  );
}
