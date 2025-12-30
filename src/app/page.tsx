import Link from "next/link";

export default function HomePage() {
  return (
    <main className="space-y-4">
      <h1 className="text-2xl font-semibold">Recipe Book</h1>
      <p className="text-slate-600">
        Skeleton app is running. Next: auth + protected recipes.
      </p>

      <div className="flex gap-3">
        <Link
          className="rounded-lg border px-4 py-2 hover:bg-slate-50"
          href="/login"
        >
          Login
        </Link>
        <Link
          className="rounded-lg border px-4 py-2 hover:bg-slate-50"
          href="/signup"
        >
          Sign Up
        </Link>
      </div>
    </main>
  );
}