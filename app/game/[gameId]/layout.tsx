import Link from "next/link";
import { SignOutButton } from "@/components/sign-out-button";

type GameLayoutProps = {
  children: React.ReactNode;
};

export default function GameLayout({ children }: GameLayoutProps) {
  return (
    <div className="flex h-screen flex-col">
      {/* Minimal Header */}
      <nav className="flex items-center justify-between bg-white px-6 py-4">
        <Link href="/lobby" className="text-xl font-semibold text-zinc-900 hover:text-zinc-700 transition-colors">
          Demons and Ducks
        </Link>
        <SignOutButton />
      </nav>

      {/* Main content - full height */}
      {children}
    </div>
  );
}
