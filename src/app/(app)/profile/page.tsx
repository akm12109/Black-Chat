
"use client";

import { PageWrapper } from "@/components/layout/page-wrapper";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { UserCircle, Edit3, ShieldCheck, AtSign, Mail, LogIn, UploadCloud, Camera, XCircle } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useRouter } from "next/navigation";
import React, { useEffect, useState, useRef } from "react";
import { Skeleton } from "@/components/ui/skeleton"; 
import Link from "next/link";
import { useToast } from "@/hooks/use-toast";
import { uploadToCloudinary } from "@/lib/cloudinary";
import { auth, firestore } from "@/lib/firebase"; 
import { updateProfile } from "firebase/auth";
import { doc, updateDoc, getDoc, serverTimestamp } from "firebase/firestore";
import { Progress } from "@/components/ui/progress";


export default function ProfilePage() {
  const { user, loading, isFirebaseConfigured } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [userJoinedDate, setUserJoinedDate] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!loading && !user && isFirebaseConfigured) {
      router.replace('/login');
    }
  }, [user, loading, router, isFirebaseConfigured]);


  useEffect(() => {
    if (user && firestore && isFirebaseConfigured) {
      const userDocRef = doc(firestore, "users", user.uid);
      getDoc(userDocRef).then(docSnap => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data.createdAt && data.createdAt.toDate) { // Check if createdAt is a Firebase Timestamp
            setUserJoinedDate(data.createdAt.toDate().toLocaleDateString());
          } else if (user.metadata.creationTime) { // Fallback to auth metadata if Firestore one is missing/invalid
             setUserJoinedDate(new Date(user.metadata.creationTime).toLocaleDateString());
          } else {
            setUserJoinedDate("N/A");
          }
        } else { // If user doc doesn't exist, use auth metadata and try to create doc
          if (user.metadata.creationTime) {
            setUserJoinedDate(new Date(user.metadata.creationTime).toLocaleDateString());
          } else {
            setUserJoinedDate("N/A");
          }
          // Attempt to create the user document if it's missing
          // This is a fallback, ideally AuthProvider or signup creates this.
          setDoc(userDocRef, {
            uid: user.uid,
            email: user.email,
            handle: user.displayName || user.email?.split('@')[0],
            photoURL: user.photoURL,
            createdAt: serverTimestamp() 
          }, { merge: true }).catch(err => console.error("Error creating missing user doc in profile:", err));
        }
      }).catch(error => {
        console.error("Error fetching user creation date:", error);
        // Fallback to auth metadata if Firestore fetch fails
        if (user.metadata.creationTime) {
          setUserJoinedDate(new Date(user.metadata.creationTime).toLocaleDateString());
        } else {
          setUserJoinedDate("N/A");
        }
      });
    } else if (user && user.metadata.creationTime) { // Fallback if firestore is not available
        setUserJoinedDate(new Date(user.metadata.creationTime).toLocaleDateString());
    } else {
        setUserJoinedDate("N/A");
    }
  }, [user, firestore, isFirebaseConfigured]);


  useEffect(() => {
    // Cleanup object URL
    return () => {
      if (imagePreview) {
        URL.revokeObjectURL(imagePreview);
      }
    };
  }, [imagePreview]);

  const handleAvatarClick = () => {
    if (isUploading) return;
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];
      if (file.size > 5 * 1024 * 1024) { 
        toast({
          variant: "destructive",
          title: "File too large",
          description: "Profile picture must be less than 5MB.",
        });
        return;
      }
      if (!["image/jpeg", "image/png", "image/gif", "image/webp"].includes(file.type)) {
          toast({
              variant: "destructive",
              title: "Invalid File Type",
              description: "Only JPG, PNG, GIF, or WEBP images are allowed.",
          });
          return;
      }
      setSelectedFile(file);
      if (imagePreview) URL.revokeObjectURL(imagePreview); 
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleCancelPhotoChange = () => {
    setSelectedFile(null);
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImagePreview(null);
    if(fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSavePhoto = async () => {
    if (!selectedFile || !user || !auth.currentUser || !firestore) { // auth.currentUser check
      toast({ variant: "destructive", title: "Error", description: "Cannot save photo. User or Firebase not available." });
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);
    const progressInterval = setInterval(() => {
      setUploadProgress(prev => Math.min(prev + 10, 90));
    }, 200);

    try {
      const cloudinaryResponse = await uploadToCloudinary(selectedFile);
      clearInterval(progressInterval);
      setUploadProgress(100);

      await updateProfile(auth.currentUser, { photoURL: cloudinaryResponse.secure_url });
      
      const userDocRef = doc(firestore, "users", user.uid);
      await updateDoc(userDocRef, { photoURL: cloudinaryResponse.secure_url });

      toast({ title: "Profile Picture Updated", description: "Your new avatar is live!" });
      setSelectedFile(null);
      setImagePreview(null); 
      if(fileInputRef.current) fileInputRef.current.value = "";

    } catch (error: any) {
      clearInterval(progressInterval);
      toast({ variant: "destructive", title: "Upload Failed", description: error.message || "Could not update profile picture." });
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };


  if (loading || (!user && isFirebaseConfigured)) {
    return (
      <PageWrapper title="Operative Profile" titleIcon={<UserCircle />} description="Loading your personal dossier...">
        <Card className="border-primary/30">
          <CardHeader className="flex flex-col items-center text-center md:flex-row md:text-left md:space-x-6">
            <Skeleton className="h-24 w-24 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-8 w-48" />
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-24" />
            </div>
            <Skeleton className="h-10 w-32 mt-4 md:mt-0" />
          </CardHeader>
          <CardContent className="mt-6 grid gap-6 md:grid-cols-2">
            <div className="space-y-2">
              <Skeleton className="h-4 w-24 mb-1" />
              <Skeleton className="h-10 w-full" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-24 mb-1" />
              <Skeleton className="h-10 w-full" />
            </div>
          </CardContent>
        </Card>
      </PageWrapper>
    );
  }

  if (!isFirebaseConfigured) {
     return (
      <PageWrapper title="Configuration Error" titleIcon={<UserCircle />} description="Firebase is not configured.">
        <Card className="border-destructive/50">
          <CardHeader>
            <CardTitle className="text-destructive">Firebase Not Configured</CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <p>Firebase services are not available. Please check the application configuration.</p>
            <Button asChild className="mt-4">
              <Link href="/dashboard">Go to Dashboard</Link>
            </Button>
          </CardContent>
        </Card>
      </PageWrapper>
     );
  }
  
  if (!user) {
    return (
      <PageWrapper title="Access Denied" titleIcon={<UserCircle />} description="Please log in to view your profile.">
        <Card className="border-primary/30 text-center">
          <CardContent className="pt-6">
            <p className="mb-4">You need to be logged in to access this page.</p>
            <Button asChild>
              <Link href="/login"><LogIn className="mr-2 h-4 w-4" /> Login</Link>
            </Button>
          </CardContent>
        </Card>
      </PageWrapper>
    );
  }

  const userHandle = user.displayName || user.email?.split('@')[0] || "Operative";
  const userAvatarSeed = user.uid || userHandle; 
  const currentAvatarSrc = imagePreview || user.photoURL || `https://picsum.photos/seed/${userAvatarSeed}/128/128`;

  return (
    <PageWrapper title="Operative Profile" titleIcon={<UserCircle />} description="View and manage your personal dossier.">
      <Card className="border-primary/30">
        <CardHeader className="flex flex-col items-center text-center md:flex-row md:text-left md:space-x-6">
          <div className="relative group">
            <Avatar 
              className="h-24 w-24 border-4 border-primary mb-4 md:mb-0 cursor-pointer group-hover:opacity-80 transition-opacity"
              onClick={handleAvatarClick}
              title="Click to change photo"
            >
              <AvatarImage 
                src={currentAvatarSrc} 
                alt={userHandle} 
                data-ai-hint="hacker avatar large"
              />
              <AvatarFallback className="text-3xl bg-primary text-primary-foreground">{userHandle?.[0]?.toUpperCase()}</AvatarFallback>
            </Avatar>
            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/50 rounded-full" onClick={handleAvatarClick}>
                <Camera className="h-8 w-8 text-white" />
            </div>
            <Input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleFileChange} 
                className="hidden" 
                accept="image/jpeg,image/png,image/gif,image/webp" 
                disabled={isUploading}
            />
          </div>

          <div className="flex-1">
            <CardTitle className="text-3xl text-glow-primary mb-1">{userHandle}</CardTitle>
            <CardDescription className="text-accent flex items-center justify-center md:justify-start">
              <ShieldCheck className="h-4 w-4 mr-1.5" /> Active Operative
            </CardDescription>
            <p className="text-xs text-muted-foreground mt-1">Joined: {userJoinedDate || <Skeleton className="h-3 w-20 inline-block" />}</p>
             {selectedFile && !isUploading && (
              <div className="mt-3 flex gap-2 justify-center md:justify-start">
                <Button onClick={handleSavePhoto} size="sm" variant="default">
                  <UploadCloud className="mr-2 h-4 w-4" /> Save Photo
                </Button>
                <Button onClick={handleCancelPhotoChange} size="sm" variant="outline">
                  <XCircle className="mr-2 h-4 w-4" /> Cancel
                </Button>
              </div>
            )}
            {isUploading && (
                <div className="mt-3 w-full md:max-w-xs">
                    <Progress value={uploadProgress} className="h-2 [&>div]:bg-primary" />
                    <p className="text-xs text-muted-foreground text-center md:text-left mt-1">Uploading...</p>
                </div>
            )}
          </div>
          <Button variant="outline" className="mt-4 md:mt-0 border-accent text-accent hover:bg-accent/10" disabled>
            <Edit3 className="mr-2 h-4 w-4" /> Edit Profile (Disabled)
          </Button>
        </CardHeader>
        <CardContent className="mt-6 grid gap-6 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="handle" className="text-accent flex items-center"><AtSign className="h-4 w-4 mr-1.5 text-muted-foreground"/> Current Handle</Label>
            <Input id="handle" value={userHandle} readOnly className="bg-input border-border focus:border-primary" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email" className="text-accent flex items-center"><Mail className="h-4 w-4 mr-1.5 text-muted-foreground"/> Email Address</Label>
            <Input id="email" type="email" value={user.email || "Not available"} readOnly className="bg-input border-border focus:border-primary" />
          </div>
        </CardContent>
        <CardFooter className="border-t border-border pt-6">
          <p className="text-xs text-muted-foreground">
            For security reasons, some information cannot be changed directly. Contact support for assistance.
          </p>
        </CardFooter>
      </Card>
    </PageWrapper>
  );
}
