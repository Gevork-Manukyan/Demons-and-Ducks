"use client";

import Link from "next/link";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useFormState, useFormStatus } from "react-dom";
import { useEffect } from "react";
import { SignUp } from "@/actions/auth-actions";

export default function SignUpPage() {
  const router = useRouter();
  const [state, formAction] = useFormState(SignUp, null);

  useEffect(() => {
    if (state?.success && state.username && state.password) {
      signIn("credentials", {
        username: state.username,
        password: state.password,
        redirect: false,
      }).then((result) => {
        if (!result?.error) {
          router.push("/");
          router.refresh();
        }
      });
    }
  }, [state, router]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-white px-4 py-12 text-zinc-900">
      <div className="w-full max-w-sm rounded-2xl border border-zinc-200 p-6 shadow-sm">
        <h1 className="text-2xl font-semibold">Create an account</h1>
        <p className="mt-2 text-sm text-zinc-500">
          Already have one?{" "}
          <Link href="/signin" className="font-medium text-zinc-900 underline">
            Sign in
          </Link>
        </p>

        <form action={formAction} className="mt-6 space-y-4">
          <label className="block text-sm font-medium text-zinc-700">
            Username
            <input
              className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-base focus:border-zinc-900 focus:outline-none"
              name="username"
              autoComplete="username"
              required
              minLength={3}
              maxLength={50}
            />
          </label>

          <label className="block text-sm font-medium text-zinc-700">
            Password
            <input
              className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-base focus:border-zinc-900 focus:outline-none"
              type="password"
              name="password"
              autoComplete="new-password"
              required
              minLength={8}
              maxLength={100}
            />
          </label>

          <label className="block text-sm font-medium text-zinc-700">
            Display name (optional)
            <input
              className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-base focus:border-zinc-900 focus:outline-none"
              name="name"
              maxLength={100}
            />
          </label>

          <label className="block text-sm font-medium text-zinc-700">
            Email (optional)
            <input
              className="mt-1 w-full rounded-md border border-zinc-300 px-3 py-2 text-base focus:border-zinc-900 focus:outline-none"
              name="email"
              type="email"
              autoComplete="email"
              maxLength={100}
            />
          </label>

          {state?.error ? <p className="text-sm text-red-600">{state.error}</p> : null}

          <SubmitButton />
        </form>
      </div>
    </main>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  
  return (
    <button
      type="submit"
      className="w-full rounded-md bg-zinc-900 px-3 py-2 text-sm font-semibold text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50"
      disabled={pending}
    >
      {pending ? "Creating account…" : "Create account"}
    </button>
  );
}
