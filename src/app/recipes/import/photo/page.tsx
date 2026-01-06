"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { type ImportDraft, isValidImportDraft } from "@/lib/import";

export default function ImportFromPhotoPage() {
  const router = useRouter();

  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Cleanup object URLs to prevent memory leaks
  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  function handleFileChange(
    e: React.ChangeEvent<HTMLInputElement>
  ) {
    const selected = e.target.files?.[0];
    if (!selected) return;

    // Revoke previous URL if it exists
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }

    setFile(selected);
    setPreviewUrl(URL.createObjectURL(selected));
    setError(null);
  }

  async function handleContinue() {
    if (!file || isImporting) return;

    setIsImporting(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("photo", file);

      const res = await fetch("/api/import/photo", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        const errorMessage =
          typeof errorData.error === "string"
            ? errorData.error
            : "We couldn't read that photo. Try again with a clearer image.";
        setError(errorMessage);
        setIsImporting(false);
        return;
      }

      const draft: unknown = await res.json();

      if (!isValidImportDraft(draft)) {
        setError("We couldn't read that photo. Try again with a clearer image.");
        setIsImporting(false);
        return;
      }

      router.push(
        `/recipes/import?draft=${encodeURIComponent(JSON.stringify(draft))}`
      );
    } catch (err) {
      setError(
        "We couldn't read that photo. Try again with a clearer image or better lighting."
      );
      setIsImporting(false);
    }
  }   

  return (
    <main className="max-w-xl mx-auto p-6 space-y-6">
      <header className="space-y-1">
        <h1 className="text-xl font-semibold">
          Import from photo
        </h1>
        <p className="text-sm text-slate-600">
          Take a photo or upload one from your device. We’ll read
          it before saving anything.
        </p>
      </header>

      <section className="space-y-4">
        <input
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleFileChange}
        />

        {previewUrl && (
          <div className="relative space-y-2">
            <p className="text-sm text-slate-600">Preview</p>
            <img
              src={previewUrl}
              alt="Recipe preview"
              className="rounded-md border max-h-[60vh] object-contain"
            />
          </div>
        )}
      </section>

      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}

      <section className="relative z-10 flex justify-between items-center pt-4">
        <button
          onClick={() => router.push("/recipes")}
          className="text-sm underline text-slate-600"
        >
          Cancel
        </button>

        <button
          onClick={handleContinue}
          disabled={!file || isImporting}
          className="rounded-md bg-black px-4 py-2 text-white disabled:opacity-50"
        >
          {isImporting ? "Reading photo…" : "Continue"}
        </button>
      </section>
    </main>
  );
}