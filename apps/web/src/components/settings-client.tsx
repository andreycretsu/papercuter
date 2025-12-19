"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export function LogoutCard() {
  const router = useRouter();
  const [isLoading, setIsLoading] = React.useState(false);

  const handleLogout = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/auth/logout", {
        method: "POST",
      });

      if (!res.ok) {
        throw new Error("Logout failed");
      }

      toast.success("Logged out successfully");
      router.push("/login");
      router.refresh();
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
