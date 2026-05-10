
"use client";

import * as React from "react";
import { useState } from "react";
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
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { LogIn, Loader2, AlertCircle } from "lucide-react";
import { AuthService } from "@/services/auth";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";

export default function LoginPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const { login } = useAuth();

  const handleLogin = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      await login({ email, password });

      toast({
        title: "Login Successful",
        description: `Welcome! Redirecting...`,
      });

      router.push("/");
    } catch (err: any) {
      console.error("Login error:", err);
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
          <Card className="w-full max-w-sm shadow-2xl overflow-hidden relative z-20 bg-card/80 backdrop-blur-lg border-primary/20">
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
                  <CardTitle className="text-2xl font-bold text-primary">Login</CardTitle>
                  <CardDescription>
                  Enter your credentials to access your dashboard.
                  </CardDescription>
              </CardHeader>
              <form onSubmit={handleLogin}>
                  <CardContent className="space-y-4">
                  {error && (
                      <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertTitle>Login Failed</AlertTitle>
                      <AlertDescription>{error}</AlertDescription>
                      </Alert>
                  )}
                  <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input
                      id="email"
                      type="email"
                      placeholder="Your email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      disabled={isLoading}
                      className="bg-background/80"
                      />
                  </div>
                  <div className="space-y-2">
                      <Label htmlFor="password">Password</Label>
                      <Input
                      id="password"
                      type="password"
                      placeholder="Your secure password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      disabled={isLoading}
                      className="bg-background/80"
                      />
                  </div>
                  </CardContent>
                  <CardFooter className="flex flex-col gap-2">
                  <Button type="submit" className="w-full bg-accent hover:bg-accent/90 text-accent-foreground" disabled={isLoading}>
                      {isLoading ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                      <LogIn className="mr-2 h-4 w-4" />
                      )}
                      {isLoading ? "Logging in..." : "Login"}
                  </Button>
                  <p className="text-xs text-muted-foreground text-center mt-2">
                      Don't have an account?{' '}
                      <Link href="/register" className="underline text-primary hover:text-primary/80">
                        Sign Up
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
