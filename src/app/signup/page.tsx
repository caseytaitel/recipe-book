"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
  
    const { error: signUpError } = await supabase.auth.signUp({
      email,
      password,
    });
  
    if (signUpError) {
      setLoading(false);
      setError(signUpError.message);
      return;
    }
  
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
  
    setLoading(false);
  
    if (signInError) {
      setError(signInError.message);
      return;
    }

    router.replace("/recipes");
    router.refresh();
  }  

  return (
    <main className="max-w-sm space-y-4">
      <h1 className="text-xl font-semibold">Sign up</h1>

      {error && (
        <p className="rounded-md bg-red-50 p-2 text-sm text-red-600">
          {error}
        </p>
      )}

      <form onSubmit={handleSignup} className="space-y-3">
        <input
          type="email"
          placeholder="Email"
          required
          className="w-full rounded-md border p-2"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <input
          type="password"
          placeholder="Password"
          required
          className="w-full rounded-md border p-2"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <button
          disabled={loading}
          className="w-full rounded-md bg-black py-2 text-white disabled:opacity-50"
        >
          {loading ? "Creating account..." : "Create account"}
        </button>
      </form>
    </main>
  );
}