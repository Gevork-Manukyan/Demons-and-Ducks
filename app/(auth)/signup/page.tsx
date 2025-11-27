"use client";

import Link from "next/link";
import { signIn, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useFormState, useFormStatus } from "react-dom";
import { useEffect } from "react";
import { SignUp } from "@/actions/auth-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function SignUpPage() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [state, formAction] = useFormState(SignUp, null);

  // Redirect to lobby if already logged in
  useEffect(() => {
    if (status === "authenticated") {
      router.push("/lobby");
    }
  }, [status, router]);

  useEffect(() => {
    if (state?.success && state.username && state.password) {
      signIn("credentials", {
        username: state.username,
        password: state.password,
        redirect: false,
      }).then((result) => {
        if (!result?.error) {
          router.push("/lobby");
          router.refresh();
        }
      });
    }
  }, [state, router]);

  // Show loading state while checking session
  if (status === "loading") {
    return (
      <main className="flex min-h-screen flex-col items-center justify-center bg-white px-4 py-12 text-zinc-900">
        <p>Loading...</p>
      </main>
    );
  }

  // Don't render form if authenticated (redirect will happen)
  if (status === "authenticated") {
    return null;
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-white px-4 py-12 text-zinc-900">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Create an account</CardTitle>
          <CardDescription>
            Already have one?{" "}
            <Link href="/signin" className="font-medium text-zinc-900 underline">
              Sign in
            </Link>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form action={formAction} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                name="username"
                autoComplete="username"
                required
                minLength={3}
                maxLength={50}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                name="password"
                autoComplete="new-password"
                required
                minLength={8}
                maxLength={100}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">Display name (optional)</Label>
              <Input
                id="name"
                name="name"
                maxLength={100}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email (optional)</Label>
              <Input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                maxLength={100}
              />
            </div>

            {state?.error ? (
              <Alert variant="destructive">
                <AlertDescription>{state.error}</AlertDescription>
              </Alert>
            ) : null}

            <SubmitButton />
          </form>
        </CardContent>
      </Card>
    </main>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  
  return (
    <Button type="submit" className="w-full" disabled={pending}>
      {pending ? "Creating account…" : "Create account"}
    </Button>
  );
}
