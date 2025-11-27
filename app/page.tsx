import Link from "next/link";
import { getServerSession } from "next-auth";

import { SignOutButton } from "@/components/sign-out-button";
import { authOptions } from "@/lib/auth";

export default async function Home() {
  const session = await getServerSession(authOptions);
  const username = session?.user?.username;
  const email = session?.user?.email;

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-white px-6 py-16 text-center text-zinc-900">
      <p className="text-xs uppercase tracking-[0.3em] text-zinc-400">
        demons & ducks
      </p>
      <h1 className="text-4xl font-semibold tracking-tight">
        Blank canvas, ready to build.
      </h1>
      <p className="max-w-lg text-base text-zinc-500">
        Everything Vercel shipped with the starter has been cleared. Drop in
        components, experiment with ideas, and start shaping the experience
        you actually need.
      </p>
      <div className="flex flex-wrap items-center justify-center gap-3 text-sm text-zinc-500">
        <span>First stop:</span>
        <code className="rounded-md bg-zinc-100 px-2 py-1 font-mono text-xs text-zinc-700">
          app/page.tsx
        </code>
      </div>

      <div className="mt-4 flex flex-col items-center gap-3 rounded-2xl border border-zinc-200 px-6 py-5 text-sm text-zinc-600 shadow-sm">
        {session?.user ? (
          <>
            <p>
              Signed in as{" "}
              <span className="font-semibold text-zinc-900">
                {username ?? email ?? "unknown user"}
              </span>
            </p>
            <SignOutButton />
          </>
        ) : (
          <>
            <p className="text-zinc-600">You are not signed in yet.</p>
            <div className="flex gap-3">
              <Link
                href="/signin"
                className="rounded-md bg-zinc-900 px-4 py-2 text-white transition hover:bg-zinc-800"
              >
                Sign in
              </Link>
              <Link
                href="/signup"
                className="rounded-md border border-zinc-300 px-4 py-2 text-zinc-900 transition hover:border-zinc-900"
              >
                Create account
              </Link>
            </div>
          </>
        )}
      </div>
    </main>
  );
}
