"use client";

import * as React from "react";
import { signOut } from "next-auth/react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export function LogoutCard() {
  const [isLoading, setIsLoading] = React.useState(false);

  const handleLogout = async () => {
    setIsLoading(true);
    try {
      await signOut({ callbackUrl: "/login" });
      toast.success("Logged out successfully");
    } catch {
      toast.error("Logout failed");
      setIsLoading(false);
    }
  };

  return (
    <Card className="border border-border p-6">
      <h2 className="text-xl font-semibold mb-2">Account</h2>
      <p className="text-sm text-muted-foreground mb-4">
        Sign out of your account
      </p>
      <Button
        variant="outline"
        onClick={handleLogout}
        disabled={isLoading}
      >
        {isLoading ? "Signing out..." : "Sign out"}
      </Button>
    </Card>
  );
}
