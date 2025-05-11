
"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { formatDistanceToNowStrict, format } from 'date-fns';
import type { Timestamp } from 'firebase/firestore';
import { Badge } from '@/components/ui/badge';
import { UserCircle, CalendarDays, ShieldAlert } from 'lucide-react';

export interface DailyReport {
  id: string;
  teamName: string;
  userId: string;
  userHandle: string;
  userAvatarUrl?: string | null;
  reportDate: Timestamp;
  accomplishments: string;
  blockers?: string;
  createdAt: Timestamp;
}

interface ReportCardProps {
  report: DailyReport;
}

export function ReportCard({ report }: ReportCardProps) {
  const reportDateFormatted = report.reportDate ? format(report.reportDate.toDate(), 'PPP') : 'N/A';
  const submittedAtFormatted = report.createdAt ? formatDistanceToNowStrict(report.createdAt.toDate(), { addSuffix: true }) : 'just now';

  return (
    <Card className="border-primary/30 shadow-md hover:shadow-primary/10 transition-shadow w-full">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Avatar className="h-10 w-10 border-2 border-accent">
              <AvatarImage src={report.userAvatarUrl || `https://picsum.photos/seed/${report.userId}/40/40`} alt={report.userHandle} data-ai-hint="hacker avatar" />
              <AvatarFallback className="bg-accent text-accent-foreground">{report.userHandle?.[0]?.toUpperCase() || 'U'}</AvatarFallback>
            </Avatar>
            <div>
              <CardTitle className="text-md text-glow-accent">{report.userHandle}</CardTitle>
              <CardDescription className="text-xs">Submitted {submittedAtFormatted}</CardDescription>
            </div>
          </div>
          <Badge variant="secondary" className="text-xs bg-accent/20 text-accent-foreground border border-accent">
            {report.teamName}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="pt-2 pb-4">
        <div className="flex items-center text-sm text-muted-foreground mb-3">
            <CalendarDays className="h-4 w-4 mr-1.5"/> Report Date: {reportDateFormatted}
        </div>
        <h4 className="font-semibold text-foreground mb-1">Accomplishments:</h4>
        <p className="text-sm text-foreground/90 whitespace-pre-wrap mb-3 p-2 bg-black/10 dark:bg-white/5 rounded-md border border-border">
          {report.accomplishments}
        </p>
        {report.blockers && (
          <>
            <h4 className="font-semibold text-destructive mb-1 flex items-center"><ShieldAlert className="h-4 w-4 mr-1.5"/> Blockers/Issues:</h4>
            <p className="text-sm text-destructive/90 whitespace-pre-wrap p-2 bg-destructive/10 rounded-md border border-destructive/30">
              {report.blockers}
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
}
