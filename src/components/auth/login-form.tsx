
"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import Link from "next/link";
import { ArrowRight, Mail, Lock } from "lucide-react";
import React from "react";
import { Separator } from "@/components/ui/separator";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useRouter } from "next/navigation";
import { useToast } from "@/hooks/use-toast";

const formSchema = z.object({
  email: z.string().email({ message: "Invalid email address." }),
  password: z.string().min(6, { message: "Password must be at least 6 characters." }),
});

export function LoginForm() {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = React.useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true);
    if (!auth) {
      toast({
        variant: "destructive",
        title: "Login Failed",
        description: "Firebase authentication is not configured.",
      });
      setIsLoading(false);
      return;
    }
    try {
      await signInWithEmailAndPassword(auth, values.email, values.password);
      toast({ title: "Success", description: "Logged in successfully!" });
      // User will be redirected by AuthGuard or PublicRouteGuard after state update
      // router.push("/dashboard"); // This might be redundant if guards handle it
    } catch (error: any) {
      let errorMessage = "An unexpected error occurred.";
      if (error.code) {
        switch (error.code) {
          case "auth/user-not-found":
          case "auth/invalid-credential": // More generic error for wrong email/password combo
            errorMessage = "Invalid credentials. Please check your email and password.";
            break;
          case "auth/wrong-password":
            errorMessage = "Incorrect password. Please try again.";
            break;
          case "auth/invalid-email":
            errorMessage = "The email address is not valid.";
            break;
          default:
            errorMessage = error.message;
        }
      }
      toast({ variant: "destructive", title: "Login Failed", description: errorMessage });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Card className="border-primary/50 shadow-lg shadow-primary/10">
      <CardHeader>
        <CardTitle className="text-2xl text-glow-primary flex items-center"><Lock className="mr-2 text-primary icon-glow-primary" /> Secure Access</CardTitle>
        <CardDescription>Enter your credentials to access your Black HAT Commit terminal.</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-accent">Email Address</FormLabel>
                  <FormControl>
                    <div className="relative flex items-center">
                      <Mail className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                      <Input placeholder="user@example.com" {...field} className="pl-10 bg-input border-border focus:border-primary" />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-accent">Password</FormLabel>
                  <FormControl>
                     <div className="relative flex items-center">
                      <Lock className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                      <Input type="password" placeholder="••••••••" {...field} className="pl-10 bg-input border-border focus:border-primary" />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="w-full group" variant="default" disabled={isLoading}>
              {isLoading ? "Authenticating..." : "Login"}
              <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
            </Button>
          </form>
        </Form>
      </CardContent>
      <CardFooter className="flex flex-col items-center space-y-2">
        <Link href="/forgot-password" passHref>
          <Button variant="link" className="text-xs text-accent hover:text-glow-accent">Forgot Password?</Button>
        </Link>
        <Separator className="my-2 bg-border" />
        <p className="text-sm text-muted-foreground">
          Admin manages accounts. Contact admin for access.
        </p>
      </CardFooter>
    </Card>
  );
}

