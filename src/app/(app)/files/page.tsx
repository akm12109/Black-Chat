
"use client";

import React, { useState, useEffect } from 'react';
import { PageWrapper } from "@/components/layout/page-wrapper";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FileText, UploadCloud, DownloadCloud, Search, Filter, FolderArchive, Link2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useToast } from '@/hooks/use-toast';
import { uploadToCloudinary } from '@/lib/cloudinary';
import { useAuth } from '@/hooks/use-auth';
import { firestore } from '@/lib/firebase'; 
import { collection, addDoc, serverTimestamp, query, where, onSnapshot, orderBy, Timestamp } from 'firebase/firestore';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDistanceToNowStrict } from 'date-fns';

interface FileEntry {
  id: string;
  name: string;
  size: number; 
  type: string; 
  url: string; 
  uploadedBy: string; 
  uploadedById: string;
  createdAt: Timestamp;
  originalFilename: string;
  resourceType: string; 
}

export default function FilesPage() {
  const { user, isFirebaseConfigured } = useAuth();
  const { toast } = useToast();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [files, setFiles] = useState<FileEntry[]>([]);
  const [loadingFiles, setLoadingFiles] = useState(true);
  const fileInputRef = React.useRef<HTMLInputElement>(null);


  useEffect(() => {
    if (typeof document !== 'undefined') {
        document.title = 'File Share - Black HAT Commit';
    }
  }, []);

  useEffect(() => {
    if (!user || !firestore || !isFirebaseConfigured) {
      setLoadingFiles(false);
      setFiles([]);
      return;
    }

    setLoadingFiles(true);
    const filesCollectionRef = collection(firestore, "userFiles");
    // For now, shows files uploaded by anyone if permissions allow viewing.
    // To restrict to only user's files: where("uploadedById", "==", user.uid)
    const q = query(
      filesCollectionRef,
      // where("uploadedById", "==", user.uid), // Uncomment to show only user's files
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedFiles: FileEntry[] = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as FileEntry));
      setFiles(fetchedFiles);
      setLoadingFiles(false);
    }, (error) => {
      console.error("Error fetching files:", error);
      toast({ variant: "destructive", title: "Error", description: "Could not fetch files." });
      setLoadingFiles(false);
    });

    return () => unsubscribe();
  }, [user, isFirebaseConfigured, firestore, toast]);


  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];
      if (file.size > 10 * 1024 * 1024) { // 10MB limit
        toast({
          variant: "destructive",
          title: "File too large",
          description: "Maximum file size is 10MB.",
        });
        setSelectedFile(null);
        if(fileInputRef.current) fileInputRef.current.value = ""; 
        return;
      }
      setSelectedFile(file);
    } else {
      setSelectedFile(null);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      toast({ title: "No file selected", description: "Please select a file to upload." });
      return;
    }
    if (!user || !firestore) {
      toast({ variant: "destructive", title: "Error", description: "User not authenticated or Firestore not available." });
      return;
    }
    if (!user.permissions?.canShareFiles) {
      toast({ variant: "destructive", title: "Permission Denied", description: "You do not have permission to share files." });
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

      const userHandle = user.handle || user.displayName || user.email?.split('@')[0] || 'Unknown';
      const newFileEntry: Omit<FileEntry, 'id' | 'createdAt'> = {
        name: cloudinaryResponse.original_filename || selectedFile.name,
        size: selectedFile.size,
        type: selectedFile.type || cloudinaryResponse.format || 'unknown',
        url: cloudinaryResponse.secure_url,
        uploadedBy: userHandle,
        uploadedById: user.uid,
        originalFilename: cloudinaryResponse.original_filename || selectedFile.name,
        resourceType: cloudinaryResponse.resource_type,
      };

      await addDoc(collection(firestore, "userFiles"), {
        ...newFileEntry,
        createdAt: serverTimestamp(),
      });

      toast({ title: "Upload Successful", description: `${selectedFile.name} has been uploaded.` });
      setSelectedFile(null);
      if(fileInputRef.current) fileInputRef.current.value = ""; 
      
    } catch (error) {
      clearInterval(progressInterval);
      const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
      toast({ variant: "destructive", title: "Upload Failed", description: errorMessage });
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileBadgeVariant = (fileType: string): "default" | "secondary" | "outline" | "destructive" | null | undefined => {
    if (fileType.startsWith('image/')) return 'secondary';
    if (fileType === 'application/pdf') return 'destructive';
    if (fileType === 'application/zip' || fileType === 'application/x-rar-compressed') return 'default'; 
    return 'outline';
  };
  
  const getFileTypeDisplay = (file: FileEntry): string => {
    if (file.type.startsWith('image/')) return 'Image';
    if (file.type.startsWith('video/')) return 'Video';
    if (file.type === 'application/pdf') return 'PDF';
    if (file.type === 'application/zip' || file.type === 'application/x-rar-compressed' || file.resourceType === 'raw') return 'Archive/Raw';
    const extension = file.name.split('.').pop()?.toUpperCase();
    return extension || 'File';
  };


  return (
    <PageWrapper title="Secure File Storage" titleIcon={<FolderArchive />} description="Encrypted repository for mission-critical files. Max 10MB per file.">
      <Card className="mb-6 border-primary/30">
        <CardHeader className="flex flex-col md:flex-row items-start md:items-center justify-between gap-2">
          <CardTitle className="text-lg text-accent">Upload New File</CardTitle>
           <Button onClick={handleUpload} disabled={isUploading || !selectedFile || !user?.permissions?.canShareFiles} className="group">
            <UploadCloud className="mr-2 h-5 w-5" /> {isUploading ? `Uploading... ${uploadProgress}%` : 'Upload File'}
          </Button>
        </CardHeader>
        <CardContent>
          <Input 
            ref={fileInputRef}
            type="file" 
            onChange={handleFileChange}
            disabled={isUploading || !user?.permissions?.canShareFiles}
            className="bg-input border-border focus:border-primary file:text-primary file:font-semibold file:mr-2 file:border-0 file:bg-primary/10 file:px-2 file:py-1 file:rounded-sm" 
          />
          {isUploading && <Progress value={uploadProgress} className="w-full h-1 mt-2 [&>div]:bg-primary" />}
          {!isUploading && !user?.permissions?.canShareFiles && <p className="text-xs text-destructive mt-2">You do not have permission to share files.</p>}
          {!isUploading && user?.permissions?.canShareFiles && <p className="text-xs text-muted-foreground mt-2">Drag & drop (not implemented) or click to browse. Files are uploaded to Cloudinary.</p>}
        </CardContent>
      </Card>

      <Card className="border-primary/30">
        <CardHeader>
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-2">
            <CardTitle className="text-xl text-glow-primary">File Repository</CardTitle>
            <div className="flex gap-2">
              <Input placeholder="Search files..." className="max-w-xs bg-input border-border focus:border-primary" disabled/>
              <Button variant="outline" className="border-accent text-accent hover:bg-accent/10" disabled><Filter className="mr-2 h-4 w-4"/>Filter</Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loadingFiles ? (
             <div className="space-y-2">
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
                <Skeleton className="h-12 w-full" />
             </div>
          ) : files.length === 0 ? (
             <p className="text-muted-foreground text-center py-8">No files found in repository. {user?.permissions?.canShareFiles ? "Upload your first file." : ""}</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="text-accent">Name</TableHead>
                  <TableHead className="text-accent">Size</TableHead>
                  <TableHead className="text-accent hidden md:table-cell">Type</TableHead>
                  <TableHead className="text-accent hidden lg:table-cell">Uploaded By</TableHead>
                  <TableHead className="text-accent hidden md:table-cell">Uploaded At</TableHead>
                  <TableHead className="text-accent text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {files.map((file) => (
                  <TableRow key={file.id} className="hover:bg-card/80">
                    <TableCell className="font-medium text-foreground flex items-center">
                      <FileText className="h-4 w-4 mr-2 text-primary flex-shrink-0" /> 
                      <span className="truncate" title={file.originalFilename}>{file.originalFilename}</span>
                    </TableCell>
                    <TableCell>{formatFileSize(file.size)}</TableCell>
                    <TableCell className="hidden md:table-cell">
                      <Badge variant={getFileBadgeVariant(file.type)} 
                             className={
                                (file.type.startsWith('image/')) ? "bg-secondary text-secondary-foreground" :
                                (file.type === 'application/pdf') ? "bg-destructive text-destructive-foreground" :
                                (file.type.startsWith('application/zip') || file.resourceType === 'raw') ? "bg-accent text-accent-foreground" :
                                "border-primary text-primary"
                              }>
                          {getFileTypeDisplay(file)}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-muted-foreground">{file.uploadedBy}</TableCell>
                    <TableCell className="hidden md:table-cell text-muted-foreground">
                      {file.createdAt?.toDate ? formatDistanceToNowStrict(file.createdAt.toDate(), { addSuffix: true }) : 'N/A'}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" className="text-primary hover:text-glow-primary" title="Open File" asChild>
                        <a href={file.url} target="_blank" rel="noopener noreferrer">
                          <Link2 className="h-5 w-5" />
                        </a>
                      </Button>
                       <Button variant="ghost" size="icon" className="text-primary hover:text-glow-primary ml-1" title="Download File (May depend on file type)" asChild>
                        <a href={file.url} download={file.originalFilename}>
                          <DownloadCloud className="h-5 w-5" />
                        </a>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
        <CardFooter className="text-xs text-muted-foreground border-t border-border pt-4">
          <p>Files are securely stored on Cloudinary. Metadata managed by Firebase Firestore.</p>
        </CardFooter>
      </Card>
    </PageWrapper>
  );
}
