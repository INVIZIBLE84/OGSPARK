
"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2, AlertCircle, UserPlus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { AuthService, RegisterPayload } from "@/services/auth";
import { useAuth } from "@/hooks/use-auth";
import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";

const DEPARTMENTS = ['B. Voc', 'CSE', 'ENTC', 'IT', 'Mech. En', 'MBA'];

export default function RegisterPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [error, setError] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);

  const { register } = useAuth();

  const handleRegisterSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);
    setError(null);

    const formData = new FormData(event.currentTarget);
    const username = formData.get('name') as string; // Renamed from 'name' to 'username'
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;
    const confirmPassword = formData.get('confirmPassword') as string;

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      setIsLoading(false);
      return;
    }

    if (password.length < 6) { // Changed minimum password length to 6 to match backend schema
      setError("Password must be at least 6 characters long.");
      setIsLoading(false);
      return;
    }

    const registrationData: RegisterPayload = {
      username,
      email,
      password,
    };

    try {
      await register(registrationData);

      toast({
        title: "Registration Successful",
        description: `Welcome, ${username}! Please log in to continue.`,
      });
      router.push('/login');
    } catch (err: any) {
      setError(err.response?.data?.message || "An unexpected error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative flex items-center justify-center min-h-screen w-full bg-background overflow-hidden">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
         <Card className="w-full max-w-md shadow-2xl overflow-hidden relative z-20 bg-card/80 backdrop-blur-lg border-primary/20">
           <div className="relative z-10 p-2">
            <CardHeader className="space-y-1 text-center">
               <Image
                 src="/sogo.png"
                 alt="S.P.A.R.K. sogo"
                 data-ai-hint="spark sogo"
                 width={219}
                 height={55}
                 className="mx-auto mb-4 h-auto"
                 priority
               />
              <CardTitle className="text-2xl font-bold text-primary">Create Account</CardTitle>
              <CardDescription>
                Fill in your details to get started.
              </CardDescription>
            </CardHeader>
            <form onSubmit={handleRegisterSubmit}>
              <CardContent className="space-y-4">
                {error && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Registration Failed</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}
                <div className="space-y-2">
                  <Label htmlFor="name">Username *</Label>
                  <Input id="name" name="name" type="text" placeholder="Enter your username" required disabled={isLoading} className="bg-background/80" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email *</Label>
                  <Input id="email" name="email" type="email" placeholder="Enter your email address" required disabled={isLoading} className="bg-background/80" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="password">Password *</Label>
                      <Input id="password" name="password" type="password" placeholder="Min. 8 characters" required disabled={isLoading} className="bg-background/80" />
                    </div>
                     <div className="space-y-2">
                       <Label htmlFor="confirmPassword">Confirm Password *</Label>
                       <Input id="confirmPassword" name="confirmPassword" type="password" placeholder="Re-enter password" required disabled={isLoading} className="bg-background/80" />
                     </div>
                </div>
              </CardContent>
              <CardFooter className="flex flex-col gap-4">
                <Button type="submit" className="w-full bg-accent hover:bg-accent/90 text-accent-foreground" disabled={isLoading}>
                  {isLoading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <UserPlus className="mr-2 h-4 w-4" />
                  )}
                  {isLoading ? "Registering..." : "Register"}
                </Button>
                <p className="text-xs text-muted-foreground text-center">
                    Already have an account?{' '}
                    <Link href="/login" className="underline text-primary hover:text-primary/80">
                      Log In
                    </Link>
                </p>
              </CardFooter>
            </form>
           </div>
          </Card>
        </motion.div>
    </div>
  );
}
