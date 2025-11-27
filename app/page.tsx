export default function Home() {
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
    </main>
  );
}
