"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default function SignUpPage() {
  const router = useRouter();
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [emailError, setEmailError] = React.useState<string | null>(null);
  const [passwordError, setPasswordError] = React.useState<string | null>(null);
  const [confirmPasswordError, setConfirmPasswordError] = React.useState<string | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmailError(null);
    setPasswordError(null);
    setConfirmPasswordError(null);

    if (!email.trim()) {
      setEmailError("Email is required.");
      return;
    }

    if (!password.trim()) {
      setPasswordError("Password is required.");
      return;
    }

    if (password.length < 8) {
      setPasswordError("Password must be at least 8 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setConfirmPasswordError("Passwords do not match.");
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (res.status === 409) {
          setEmailError("This email is already registered.");
        } else {
          toast.error(data.error || "Sign up failed");
        }
        setIsLoading(false);
        return;
      }

      toast.success("Account created successfully! Please sign in.");
      router.push("/login");
    } catch {
      toast.error("Sign up failed");
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <Card className="w-full max-w-md border border-border p-8">
        <div className="space-y-6">
          <div className="space-y-2 text-center">
            <h1 className="text-3xl font-bold">Create Account</h1>
            <p className="text-sm text-muted-foreground">
              Sign up to start using Papercuts
            </p>
          </div>

          <form onSubmit={handleSignUp} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (emailError && e.target.value.trim()) {
                    setEmailError(null);
                  }
                }}
                placeholder="Enter your email"
                className={emailError ? "border-destructive" : ""}
                autoFocus
              />
              {emailError && (
                <p className="text-sm text-destructive">{emailError}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (passwordError && e.target.value.trim()) {
                    setPasswordError(null);
                  }
                }}
                placeholder="Create password (min 8 characters)"
                className={passwordError ? "border-destructive" : ""}
              />
              {passwordError && (
                <p className="text-sm text-destructive">{passwordError}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  if (confirmPasswordError && e.target.value.trim()) {
                    setConfirmPasswordError(null);
                  }
                }}
                placeholder="Confirm your password"
                className={confirmPasswordError ? "border-destructive" : ""}
              />
              {confirmPasswordError && (
                <p className="text-sm text-destructive">{confirmPasswordError}</p>
              )}
            </div>

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? "Creating account..." : "Create account"}
            </Button>
          </form>

          <div className="text-sm text-center text-muted-foreground">
            Already have an account?{" "}
            <Link href="/login" className="text-primary hover:underline">
              Sign in
            </Link>
          </div>
        </div>
      </Card>
    </div>
  );
}
