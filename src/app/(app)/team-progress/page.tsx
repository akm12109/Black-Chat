
"use client";

import React, { useState, useEffect } from 'react';
import { PageWrapper } from "@/components/layout/page-wrapper";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ClipboardList, PlusSquare } from "lucide-react";
import { useAuth } from '@/hooks/use-auth';
import { firestore } from '@/lib/firebase';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, Timestamp, where } from 'firebase/firestore';
import { DailyReportForm, type DailyReportFormData } from '@/components/team-progress/daily-report-form';
import { ReportCard, type DailyReport } from '@/components/team-progress/report-card';
import { Dialog, DialogTrigger } from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { startOfDay } from 'date-fns';

export default function TeamProgressPage() {
  const { user, loading: authLoading, isFirebaseConfigured } = useAuth();
  const { toast } = useToast();
  const [reports, setReports] = useState<DailyReport[]>([]);
  const [loadingReports, setLoadingReports] = useState(true);
  const [isFormDialogOpen, setIsFormDialogOpen] = useState(false);
  const [filterDate, setFilterDate] = useState<Date | null>(null); // For future filtering

  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.title = 'Team Progress - Black HAT Commit';
    }
  }, []);

  useEffect(() => {
    if (!firestore || !isFirebaseConfigured || authLoading) {
      setLoadingReports(false);
      setReports([]);
      return;
    }
    if (!user) { // Ensure user is loaded before attempting to fetch based on it
        setLoadingReports(false);
        setReports([]);
        return;
    }


    setLoadingReports(true);
    const reportsCollectionRef = collection(firestore, "dailyReports");
    
    let q;
    if (filterDate) {
        const start = startOfDay(filterDate);
        const end = new Date(start);
        end.setDate(start.getDate() + 1);

        q = query(
          reportsCollectionRef,
          where("reportDate", ">=", Timestamp.fromDate(start)),
          where("reportDate", "<", Timestamp.fromDate(end)),
          orderBy("reportDate", "desc"),
          orderBy("createdAt", "desc")
        );
    } else {
         q = query(reportsCollectionRef, orderBy("reportDate", "desc"), orderBy("createdAt", "desc"));
    }


    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedReports = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as DailyReport));
      setReports(fetchedReports);
      setLoadingReports(false);
    }, (error) => {
      console.error("Error fetching daily reports:", error);
      toast({ variant: "destructive", title: "Error", description: "Could not fetch daily reports." });
      setLoadingReports(false);
    });

    return () => unsubscribe();
  }, [isFirebaseConfigured, firestore, user, authLoading, toast, filterDate]);

  const handleCreateReport = async (data: DailyReportFormData) => {
    if (!user || !firestore) {
      toast({ variant: "destructive", title: "Error", description: "Authentication or database error." });
      return;
    }
    if (!user.permissions?.canSubmitDailyReport) {
      toast({ variant: "destructive", title: "Permission Denied", description: "You do not have permission to submit reports." });
      setIsFormDialogOpen(false);
      return;
    }

    try {
      const userHandle = user.handle || user.displayName || user.email?.split('@')[0] || 'Anonymous';
      await addDoc(collection(firestore, "dailyReports"), {
        teamName: data.teamName,
        reportDate: Timestamp.fromDate(startOfDay(data.reportDate)), // Store as start of day
        accomplishments: data.accomplishments,
        blockers: data.blockers || "",
        userId: user.uid,
        userHandle: userHandle,
        userAvatarUrl: user.photoURL,
        createdAt: serverTimestamp(),
      });
      setIsFormDialogOpen(false);
      toast({ title: "Report Submitted", description: "Your daily progress has been logged." });
    } catch (error) {
      console.error("Error creating daily report:", error);
      toast({ variant: "destructive", title: "Error", description: "Failed to submit report." });
    }
  };
  
  if (authLoading && !isFirebaseConfigured) {
    return (
        <PageWrapper title="Team Daily Progress" titleIcon={<ClipboardList />} description="Loading reports...">
            <Skeleton className="h-10 w-1/3 mb-6" />
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-64 w-full rounded-md" />)}
            </div>
        </PageWrapper>
    );
  }

  if (!isFirebaseConfigured) {
    return (
      <PageWrapper title="Team Daily Progress" titleIcon={<ClipboardList />}>
        <Card><CardContent className="p-6 text-destructive">Firebase is not configured. Team progress reporting is unavailable.</CardContent></Card>
      </PageWrapper>
    );
  }
  
  if (!user && !authLoading) {
     return (
      <PageWrapper title="Team Daily Progress" titleIcon={<ClipboardList />}>
        <Card><CardContent className="p-6 text-muted-foreground">Please log in to view or submit team progress reports.</CardContent></Card>
      </PageWrapper>
    );
  }

  return (
    <PageWrapper title="Team Daily Progress" titleIcon={<ClipboardList />} description="Track daily accomplishments and blockers across teams.">
      <Dialog open={isFormDialogOpen} onOpenChange={setIsFormDialogOpen}>
        <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <h2 className="text-xl font-semibold text-accent">Daily Reports</h2>
          <DialogTrigger asChild>
            <Button 
              variant="default" 
              onClick={() => setIsFormDialogOpen(true)} 
              disabled={!user?.permissions?.canSubmitDailyReport}
              className="w-full sm:w-auto"
            >
              <PlusSquare className="mr-2 h-5 w-5" /> Submit Today's Report
            </Button>
          </DialogTrigger>
        </div>
        {/* Auto-close if permission lost while open & user exists */}
        {user && !user.permissions?.canSubmitDailyReport && isFormDialogOpen && setIsFormDialogOpen(false)}
        {user?.permissions?.canSubmitDailyReport && (
            <DailyReportForm 
                onSubmit={handleCreateReport} 
                onCancel={() => setIsFormDialogOpen(false)} 
            />
        )}
      </Dialog>

      {/* Placeholder for date filter UI - To be implemented if needed 
      <div className="mb-6">
        <Input type="date" onChange={(e) => setFilterDate(e.target.value ? new Date(e.target.value) : null)} />
      </div>
      */}

      <div className="space-y-6">
        {loadingReports ? (
          <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2 xl:grid-cols-3">
            {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-72 w-full rounded-lg" />)}
          </div>
        ) : reports.length === 0 ? (
          <Card className="border-primary/30">
            <CardContent className="p-6 text-center text-muted-foreground">
              <p>No daily reports found for the selected criteria.</p>
              {user?.permissions?.canSubmitDailyReport && <p className="text-sm">Be the first to submit a report!</p>}
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-1 lg:grid-cols-2 xl:grid-cols-3">
            {reports.map((report) => (
              <ReportCard key={report.id} report={report} />
            ))}
          </div>
        )}
      </div>
    </PageWrapper>
  );
}
