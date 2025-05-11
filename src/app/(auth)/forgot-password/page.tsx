"use client";

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Mail, KeyRound, ArrowLeft } from 'lucide-react';
import React from 'react';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useToast } from '@/hooks/use-toast';

export default function ForgotPasswordPage() {
  const [email, setEmail] = React.useState('');
  const [submitted, setSubmitted] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setSubmitted(false); // Reset submitted state for new attempts

    if (!auth) {
      toast({
        variant: "destructive",
        title: "Error",
        description: "Firebase authentication is not configured.",
      });
      setIsLoading(false);
      return;
    }

    try {
      await sendPasswordResetEmail(auth, email);
      toast({ title: "Success", description: "If an account exists for this email, a password reset link has been sent." });
      setSubmitted(true);
    } catch (error: any) {
      let errorMessage = "An unexpected error occurred.";
      if (error.code === "auth/invalid-email") {
        errorMessage = "The email address is not valid.";
      } else if (error.code === "auth/user-not-found") {
        // We still show a generic success message for privacy, but log internally if needed
        errorMessage = "No user found with this email. (For privacy, a success message is shown to the user)";
         console.warn("Password reset attempt for non-existent user:", email);
         // Show generic success to user
         toast({ title: "Success", description: "If an account exists for this email, a password reset link has been sent." });
         setSubmitted(true);
      } else {
        errorMessage = error.message;
      }
      if(error.code !== "auth/user-not-found"){
         toast({ variant: "destructive", title: "Error", description: errorMessage });
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="border-primary/50 shadow-lg shadow-primary/10">
      <CardHeader>
        <CardTitle className="text-2xl text-glow-primary flex items-center"><KeyRound className="mr-2 text-primary icon-glow-primary" /> Recover Access</CardTitle>
        <CardDescription>
          {submitted 
            ? "If an account with that email exists, a recovery link has been dispatched to your inbox."
            : "Enter your email address and we'll send you a link to reset your password."
          }
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!submitted ? (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <Label htmlFor="email" className="text-accent">Email Address</Label>
              <div className="relative flex items-center mt-1">
                <Mail className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="operative@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="pl-10 bg-input border-border focus:border-primary"
                />
              </div>
            </div>
            <Button type="submit" className="w-full" variant="default" disabled={isLoading}>
              {isLoading ? "Sending Link..." : "Send Recovery Link"}
            </Button>
          </form>
        ) : (
          <p className="text-center text-foreground">Please check your email for further instructions. The link may take a few minutes to arrive.</p>
        )}
      </CardContent>
      <CardFooter>
        <Button variant="link" asChild className="text-accent hover:text-glow-accent w-full">
          <Link href="/login">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Login
          </Link>
        </Button>
      </CardFooter>
    </Card>
  );
}
