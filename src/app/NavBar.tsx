"use client";

import { logout } from "@/lib/recipes";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function NavBar() {
  const router = useRouter();

  async function handleLogout() {
    await logout();
    router.push("/");
  }

  return (
    <nav className="h-12 border-b">
      <div className="mx-auto max-w-5xl px-4 h-full flex items-center justify-between">
        <Link href="/recipes" className="text-sm font-medium">
          Recipe Book
        </Link>

        <button
          onClick={handleLogout}
          className="text-sm"
        >
          Log Out
        </button>
      </div>
    </nav>
  );
}