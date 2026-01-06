"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function AddRecipeButton() {
  const router = useRouter();

  const [isImporting, setIsImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUrl, setLastUrl] = useState<string | null>(null);

  async function runImport(url: string) {
    try {
      setIsImporting(true);
      setError(null);

      const res = await fetch("/api/import/url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        const errorMessage =
          typeof errorData.error === "string"
            ? errorData.error
            : "Something went wrong. Try again.";
        setError(errorMessage);
        setIsImporting(false);
        return;
      }

      const draft = await res.json();

      router.push(
        `/recipes/import?draft=${encodeURIComponent(JSON.stringify(draft))}`
      );
    } catch (err) {
      setError("Something went wrong. Try again.");
    } finally {
      setIsImporting(false);
    }
  }

  async function handleImportFromUrl() {
    const url = window.prompt("Paste recipe URL");
    if (!url) return;

    setLastUrl(url);
    await runImport(url);
  }

  function handleImportFromPhoto() {
    router.push("/recipes/import/photo");
  }  

  async function handleRetry() {
    if (!lastUrl) return;
    await runImport(lastUrl);
  }

  return (
    <div className="flex flex-col gap-2 items-end">
      <div className="flex gap-2">
        <button
          onClick={() => router.push("/recipes/new")}
          disabled={isImporting}
          className="rounded-md bg-black px-4 py-2 text-white disabled:opacity-50"
        >
          Add Recipe
        </button>

        <button
          onClick={handleImportFromUrl}
          disabled={isImporting}
          className="rounded-md border px-4 py-2 text-sm disabled:opacity-50"
        >
          {isImporting ? "Importing…" : "Import from URL"}
        </button>

        <button
          onClick={handleImportFromPhoto}
          disabled={isImporting}
          className="rounded-md border px-4 py-2 text-sm disabled:opacity-50"
        >
          Import from Photo
        </button>

      </div>

      {error && (
        <div className="text-sm text-red-600 flex gap-2 items-center">
          <span>{error}</span>
          {lastUrl && (
            <button
              onClick={handleRetry}
              className="underline text-red-700"
            >
              Retry
            </button>
          )}
        </div>
      )}
    </div>
  );
}