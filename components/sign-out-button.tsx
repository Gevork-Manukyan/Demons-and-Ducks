"use client";

import { signOut } from "next-auth/react";
import { useState } from "react";
import { Button } from "@/components/ui/button";

export function SignOutButton() {
  const [isSigningOut, setIsSigningOut] = useState(false);

  const handleClick = async () => {
    setIsSigningOut(true);
    await signOut({ callbackUrl: "/" });
  };

  return (
    <Button
      type="button"
      variant="outline"
      onClick={handleClick}
      disabled={isSigningOut}
    >
      {isSigningOut ? "Signing out…" : "Sign out"}
    </Button>
  );
}

