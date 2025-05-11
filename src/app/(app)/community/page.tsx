
"use client";

import { PageWrapper } from "@/components/layout/page-wrapper";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Users, ThumbsUp, MessageCircle, Share2, UploadCloud } from "lucide-react";
import Image from "next/image";
import { useAuth } from "@/hooks/use-auth";
import { firestore } from "@/lib/firebase";
import { collection, addDoc, serverTimestamp, query, orderBy, onSnapshot, Timestamp } from 'firebase/firestore';
import React, { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDistanceToNowStrict } from "date-fns";
import { uploadToCloudinary } from "@/lib/cloudinary"; 
import { Progress } from "@/components/ui/progress";

interface CommunityPost {
  id: string;
  authorId: string;
  authorHandle: string;
  authorAvatarSeed?: string; // Keep for existing picsum, new posts might use photoURL
  authorPhotoURL?: string | null;
  content: string;
  imageUrl?: string | null; // Cloudinary URL
  imageHint?: string;
  createdAt: Timestamp;
  likes: number; // Simplification, full like system is complex
  comments: number; // Simplification
}


export default function CommunityPage() {
  const { user, isFirebaseConfigured } = useAuth();
  const { toast } = useToast();
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(true);
  const [newPostContent, setNewPostContent] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.title = 'Community - Black HAT Commit';
    }
  }, []);

  useEffect(() => {
    if (!firestore || !isFirebaseConfigured) {
      setLoadingPosts(false);
      setPosts([]);
      return;
    }
    setLoadingPosts(true);
    const postsCollectionRef = collection(firestore, "communityPosts");
    const q = query(postsCollectionRef, orderBy("createdAt", "desc"));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedPosts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CommunityPost));
      setPosts(fetchedPosts);
      setLoadingPosts(false);
    }, (error) => {
      console.error("Error fetching community posts:", error);
      toast({ variant: "destructive", title: "Error", description: "Could not fetch community posts." });
      setLoadingPosts(false);
    });
    return () => unsubscribe();
  }, [isFirebaseConfigured, firestore, toast]);
  
  useEffect(() => {
    return () => {
      if (imagePreview) URL.revokeObjectURL(imagePreview);
    };
  }, [imagePreview]);


  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];
      if (file.size > 10 * 1024 * 1024) { // 10MB limit
        toast({ variant: "destructive", title: "File too large", description: "Max file size is 10MB." });
        return;
      }
      if (!file.type.startsWith("image/")) {
        toast({ variant: "destructive", title: "Invalid File Type", description: "Only image files are allowed." });
        return;
      }
      setSelectedFile(file);
      if (imagePreview) URL.revokeObjectURL(imagePreview);
      setImagePreview(URL.createObjectURL(file));
    }
  };
  
  const handleRemoveImage = () => {
    setSelectedFile(null);
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };


  const handleCreatePost = async () => {
    if (!newPostContent.trim() && !selectedFile) {
      toast({ title: "Empty Post", description: "Please write something or add an image." });
      return;
    }
    if (!user || !firestore) {
      toast({ variant: "destructive", title: "Error", description: "User not authenticated or Firebase not available." });
      return;
    }
    if (!user.permissions?.canPostToCommunity) {
      toast({ variant: "destructive", title: "Permission Denied", description: "You do not have permission to post." });
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);
    let uploadedImageUrl: string | null = null;

    if (selectedFile) {
      try {
        const progressInterval = setInterval(() => {
            setUploadProgress(prev => Math.min(prev + 10, 90)));
        }, 200);
        const cloudinaryResponse = await uploadToCloudinary(selectedFile);
        clearInterval(progressInterval);
        setUploadProgress(100);
        uploadedImageUrl = cloudinaryResponse.secure_url;
      } catch (error) {
        setIsUploading(false);
        setUploadProgress(0);
        const errorMessage = error instanceof Error ? error.message : "An unknown error occurred during image upload.";
        toast({ variant: "destructive", title: "Image Upload Failed", description: errorMessage });
        return;
      }
    }
    
    const userHandle = user.handle || user.displayName || user.email?.split('@')[0] || "Anonymous";
    try {
      await addDoc(collection(firestore, "communityPosts"), {
        authorId: user.uid,
        authorHandle: userHandle,
        authorPhotoURL: user.photoURL, // Use actual photoURL
        content: newPostContent,
        imageUrl: uploadedImageUrl,
        imageHint: uploadedImageUrl ? "community post image" : undefined, // Generic hint or could be user-inputted
        createdAt: serverTimestamp(),
        likes: 0,
        comments: 0,
      });
      setNewPostContent("");
      handleRemoveImage(); // Clear file input and preview
      toast({ title: "Post Submitted", description: "Your intel is live on the feed." });
    } catch (error) {
      console.error("Error creating post:", error);
      const firestoreError = error instanceof Error ? error.message : "Could not submit post.";
      toast({ variant: "destructive", title: "Post Error", description: firestoreError });
    } finally {
        setIsUploading(false);
        setUploadProgress(0);
    }
  };


  return (
    <PageWrapper title="Community Feed" titleIcon={<Users />} description="Share intel, tools, and insights with fellow operatives.">
      <Card className="mb-6 border-primary/30">
        <CardHeader>
          <CardTitle className="text-lg text-accent">Broadcast New Intel</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea 
            placeholder="Share your latest findings or start a discussion..." 
            className="bg-input border-border focus:border-primary min-h-[100px]" 
            value={newPostContent}
            onChange={(e) => setNewPostContent(e.target.value)}
            disabled={!user?.permissions?.canPostToCommunity || isUploading}
          />
          <Input 
            type="file" 
            ref={fileInputRef}
            className="mt-2 bg-input border-border focus:border-primary file:text-primary file:font-semibold file:mr-2 file:border-0 file:bg-primary/10 file:px-2 file:py-1 file:rounded-sm" 
            onChange={handleFileChange}
            accept="image/*"
            disabled={!user?.permissions?.canPostToCommunity || isUploading}
          />
          {imagePreview && (
            <div className="mt-2 relative w-32 h-32 border border-border rounded overflow-hidden">
              <Image src={imagePreview} alt="Preview" layout="fill" objectFit="cover" />
              <Button variant="destructive" size="icon" className="absolute top-1 right-1 h-6 w-6" onClick={handleRemoveImage} disabled={isUploading}>
                <Trash2 className="h-3 w-3"/>
              </Button>
            </div>
          )}
          {isUploading && <Progress value={uploadProgress} className="w-full h-1 mt-2 [&>div]:bg-primary" />}
          {!user?.permissions?.canPostToCommunity && <p className="text-xs text-destructive mt-2">You do not have permission to post.</p>}
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button variant="ghost" size="sm" className="text-primary hover:text-glow-primary" onClick={() => fileInputRef.current?.click()} disabled={!user?.permissions?.canPostToCommunity || isUploading}>
            <UploadCloud className="mr-2 h-4 w-4" /> Attach Image
          </Button>
          <Button variant="default" onClick={handleCreatePost} disabled={(!newPostContent.trim() && !selectedFile) || !user?.permissions?.canPostToCommunity || isUploading}>
            {isUploading ? "Posting..." : "Post to Feed"}
          </Button>
        </CardFooter>
      </Card>

      <div className="space-y-6">
        {loadingPosts ? (
          <>
            <Skeleton className="h-48 w-full rounded-md" />
            <Skeleton className="h-48 w-full rounded-md" />
          </>
        ) : posts.length === 0 ? (
           <Card className="border-primary/30">
            <CardContent className="p-6 text-center text-muted-foreground">
              <p>The feed is quiet. No intel shared yet.</p>
            </CardContent>
          </Card>
        ) : (
          posts.map((post) => (
            <Card key={post.id} className="border-primary/30 shadow-md hover:shadow-primary/10 transition-shadow">
              <CardHeader>
                <div className="flex items-center space-x-3">
                  <Image src={post.authorPhotoURL || `https://picsum.photos/seed/${post.authorAvatarSeed || post.authorId}/40/40`} alt={post.authorHandle} width={40} height={40} className="rounded-full border-2 border-accent" data-ai-hint="hacker avatar" />
                  <div>
                    <CardTitle className="text-md text-glow-accent">{post.authorHandle}</CardTitle>
                    <CardDescription className="text-xs">{post.createdAt ? formatDistanceToNowStrict(post.createdAt.toDate(), { addSuffix: true }) : 'Just now'}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="mb-3 text-foreground/90 whitespace-pre-wrap">{post.content}</p>
                {post.imageUrl && (
                  <div className="rounded-md overflow-hidden border border-border aspect-video relative mb-3">
                    <Image src={post.imageUrl} alt="Post image" layout="fill" objectFit="cover" data-ai-hint={post.imageHint || "community image"} />
                  </div>
                )}
              </CardContent>
              <CardFooter className="flex justify-start space-x-4 border-t border-border pt-3">
                <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-primary">
                  <ThumbsUp className="mr-1.5 h-4 w-4" /> {post.likes} Likes
                </Button>
                <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-primary">
                  <MessageCircle className="mr-1.5 h-4 w-4" /> {post.comments} Comments
                </Button>
                <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-primary ml-auto">
                  <Share2 className="mr-1.5 h-4 w-4" /> Share
                </Button>
              </CardFooter>
            </Card>
          ))
        )}
      </div>
    </PageWrapper>
  );
}
