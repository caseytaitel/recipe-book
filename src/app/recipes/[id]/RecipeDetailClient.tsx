"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect, useRef, useCallback } from "react";
import { createRecipe, updateRecipe } from "@/lib/recipes";

type LineItem = {
  id: string;
  text: string;
};

type EditingTarget =
  | { type: "ingredient"; id: string }
  | { type: "step"; id: string }
  | { type: "notes" }
  | null;

interface Recipe {
  id: string;
  title: string;
  ingredients: string[] | LineItem[];
  steps: string[] | LineItem[];
  notes: string | null;
}

// Simple stable hash for generating IDs from strings
function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36);
}

// Normalize ingredients/steps to LineItem[]
function normalizeLines(
  items: string[] | LineItem[] | null | undefined,
  index: number
): LineItem[] {
  if (!items || items.length === 0) return [];
  if (typeof items[0] === "string") {
    return (items as string[]).map((text, i) => ({
      id: `${index}-${i}-${simpleHash(text)}`,
      text: String(text),
    }));
  }
  return (items as LineItem[]).map((item) => ({
    id: item.id || `${index}-${simpleHash(item.text)}`,
    text: String(item.text),
  }));
}

type DirtyMap = {
  ingredients: Set<string>;
  steps: Set<string>;
  notes: boolean;
};

export default function RecipeDetailClient({
  recipe,
  isImport = false,
}: {
  recipe: Recipe;
  isImport?: boolean;
}) {
  const router = useRouter();
  const SAVED_LINGER_MS = 1200;
  const SAVED_FADE_MS = 150;

  const [mode, setMode] = useState<"edit" | "cook">("edit");
  const [editingTarget, setEditingTarget] = useState<EditingTarget>(null);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">(
    "idle"
  );

  const normalizedIngredients = normalizeLines(recipe.ingredients, 0);
  const normalizedSteps = normalizeLines(recipe.steps, 1);

  const [ingredientsLines, setIngredientsLines] = useState(normalizedIngredients);
  const [stepsLines, setStepsLines] = useState(normalizedSteps);
  const [notesText, setNotesText] = useState(recipe.notes ?? "");

  const [dirty, setDirty] = useState<DirtyMap>({
    ingredients: new Set(),
    steps: new Set(),
    notes: false,
  });

  const persistedRef = useRef<{
    ingredients: LineItem[];
    steps: LineItem[];
    notes: string;
  } | null>(null);

  const editSnapshotRef = useRef<{
    type: "ingredient" | "step" | "notes";
    id?: string;
    value: string;
  } | null>(null);

  // Refs for outside click
  const ingredientEditorRef = useRef<HTMLInputElement>(null);
  const stepEditorRef = useRef<HTMLTextAreaElement>(null);
  const notesEditorRef = useRef<HTMLTextAreaElement>(null);

  // Initialize from recipe
  useEffect(() => {
    const newIngredients = normalizeLines(recipe.ingredients, 0);
    const newSteps = normalizeLines(recipe.steps, 1);

    setIngredientsLines(newIngredients);
    setStepsLines(newSteps);
    setNotesText(recipe.notes ?? "");

    persistedRef.current = {
      ingredients: newIngredients,
      steps: newSteps,
      notes: recipe.notes ?? "",
    };

    setDirty({
      ingredients: new Set(),
      steps: new Set(),
      notes: false,
    });
  }, [recipe]);

  const updateLine = useCallback(
    (type: "ingredient" | "step", id: string, newText: string) => {
      if (type === "ingredient") {
        setIngredientsLines((prev) =>
          prev.map((l) => (l.id === id ? { ...l, text: newText } : l))
        );
      } else {
        setStepsLines((prev) =>
          prev.map((l) => (l.id === id ? { ...l, text: newText } : l))
        );
      }
    },
    []
  );

  function markDirtyIfNeeded(
    type: "ingredient" | "step" | "notes",
    id: string | undefined,
    newValue: string
  ) {
    const snap = editSnapshotRef.current;
    if (!snap) return;

    const isDirty = newValue !== snap.value;

    setDirty((prev) => {
      const next: DirtyMap = {
        ingredients: new Set(prev.ingredients),
        steps: new Set(prev.steps),
        notes: prev.notes,
      };

      if (type === "notes") {
        next.notes = isDirty;
      } else if (type === "ingredient") {
        isDirty ? next.ingredients.add(id!) : next.ingredients.delete(id!);
      } else {
        isDirty ? next.steps.add(id!) : next.steps.delete(id!);
      }

      return next;
    });
  }

  function normalizeLineText(text: string): string {
    return text.trim();
  }
  
  function normalizeMultilineText(lines: LineItem[]): LineItem[] {
    return lines.map((l) => ({
      ...l,
      text: normalizeLineText(l.text),
    }));
  }
  
  function normalizeNotesText(text: string): string {
    return text
      .split("\n")
      .map((line) => line.trimEnd())
      .join("\n");
  }  

  // Close editor without reverting dirty changes
  const closeEditor = () => {
    editSnapshotRef.current = null;
    setEditingTarget(null);
  };

  // Cancel semantics (revert only if clean)
  const handleCancel = useCallback(() => {
    if (!editingTarget || !editSnapshotRef.current) {
      closeEditor();
      return;
    }

    const { type, id, value } = editSnapshotRef.current;

    const isDirty =
      type === "notes"
        ? dirty.notes
        : type === "ingredient"
        ? dirty.ingredients.has(id!)
        : dirty.steps.has(id!);

    if (!isDirty) {
      // revert clean edits only
      if (type === "ingredient") {
        setIngredientsLines((prev) =>
          prev.map((l) => (l.id === id ? { ...l, text: value } : l))
        );
      } else if (type === "step") {
        setStepsLines((prev) =>
          prev.map((l) => (l.id === id ? { ...l, text: value } : l))
        );
      } else {
        setNotesText(value);
      }
    }

    closeEditor();
  }, [editingTarget, dirty]);

  // Escape key
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && editingTarget) handleCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [editingTarget, handleCancel]);

  // Outside click
  useEffect(() => {
    if (!editingTarget) return;

    const onClick = (e: MouseEvent) => {
      const t = e.target as Node;
      if (
        (editingTarget.type === "ingredient" &&
          ingredientEditorRef.current &&
          !ingredientEditorRef.current.contains(t)) ||
        (editingTarget.type === "step" &&
          stepEditorRef.current &&
          !stepEditorRef.current.contains(t)) ||
        (editingTarget.type === "notes" &&
          notesEditorRef.current &&
          !notesEditorRef.current.contains(t))
      ) {
        handleCancel();
      }
    };

    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [editingTarget, handleCancel]);

  const handleSave = async () => {
    if (
      dirty.ingredients.size === 0 &&
      dirty.steps.size === 0 &&
      !dirty.notes
    ) {
      return;
    }

    setSaveStatus("saved");

    setTimeout(() => {
      // allow a brief fade-out window before clearing
      setSaveStatus("idle");
    }, SAVED_LINGER_MS + SAVED_FADE_MS);

    const formData = new FormData();
    const normalizedIngredients = normalizeMultilineText(ingredientsLines);
    const normalizedSteps = normalizeMultilineText(stepsLines);
    const normalizedNotes = normalizeNotesText(notesText);

    formData.append(
      "ingredients",
      normalizedIngredients.map((l) => l.text).join("\n")
    );
    formData.append(
      "steps",
      normalizedSteps.map((l) => l.text).join("\n")
    );
    formData.append("notes", normalizedNotes);

    if (isImport) {
      await createRecipe(formData);
    } else {
      await updateRecipe(recipe.id, formData);
    }    

    if (isImport) {
      router.push("/recipes");
      return;
    }    

    setIngredientsLines(normalizedIngredients);
    setStepsLines(normalizedSteps);
    setNotesText(normalizedNotes);

    persistedRef.current = {
      ingredients: normalizedIngredients,
      steps: normalizedSteps,
      notes: normalizedNotes,
    };

    setDirty({
      ingredients: new Set(),
      steps: new Set(),
      notes: false,
    });

    closeEditor();
    setSaveStatus("saved");
    setTimeout(() => setSaveStatus("idle"), 800);
  };

  const handleModeToggle = () => {
    if (mode === "edit") {
      // discard dirty edits
      const p = persistedRef.current;
      if (p) {
        setIngredientsLines(p.ingredients);
        setStepsLines(p.steps);
        setNotesText(p.notes);
      }
      setDirty({
        ingredients: new Set(),
        steps: new Set(),
        notes: false,
      });
      closeEditor();
      setMode("cook");
    } else {
      setMode("edit");
    }
  };

  const canEdit = mode === "edit";
  const hasDirty =
    dirty.ingredients.size > 0 || dirty.steps.size > 0 || dirty.notes;

  return (
    <main className="max-w-2xl space-y-8">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">{recipe.title}</h1>
        <button
          onClick={handleModeToggle}
          className="text-sm text-slate-600 hover:text-slate-900"
        >
          {mode === "edit" ? "Edit Mode" : "Cook Mode"}
        </button>
      </header>

      {/* Ingredients */}
      <section className="space-y-3">
        <h2 className="text-lg font-medium">Ingredients</h2>
        <ul className="list-disc space-y-1 pl-5">
          {ingredientsLines.map((line) => {
            const isEditing =
              editingTarget?.type === "ingredient" &&
              editingTarget.id === line.id;

            if (isEditing && canEdit) {
              return (
                <li key={line.id}>
                  <input
                    ref={ingredientEditorRef}
                    value={line.text}
                    onChange={(e) => {
                      updateLine("ingredient", line.id, e.target.value);
                      markDirtyIfNeeded(
                        "ingredient",
                        line.id,
                        e.target.value
                      );
                    }}
                    className="w-full border-b py-1"
                    autoFocus
                  />
                </li>
              );
            }

            return (
              <li
                key={line.id}
                className={
                  canEdit
                    ? "rounded-md border border-transparent hover:border-slate-300 cursor-pointer transition-colors px-1 -mx-1"
                    : ""
                }                
                onClick={() => {
                  if (!canEdit) return;
                  editSnapshotRef.current = {
                    type: "ingredient",
                    id: line.id,
                    value: line.text,
                  };
                  setEditingTarget({ type: "ingredient", id: line.id });
                }}
              >
                {line.text}
              </li>
            );
          })}
        </ul>
      </section>

      {/* Steps */}
      <section className="space-y-3">
        <h2 className="text-lg font-medium">Steps</h2>
        <ol className="list-decimal space-y-2 pl-5">
          {stepsLines.map((line) => {
            const isEditing =
              editingTarget?.type === "step" &&
              editingTarget.id === line.id;

            if (isEditing && canEdit) {
              return (
                <li key={line.id}>
                  <textarea
                    ref={stepEditorRef}
                    value={line.text}
                    onChange={(e) => {
                      updateLine("step", line.id, e.target.value);
                      markDirtyIfNeeded("step", line.id, e.target.value);
                    }}
                    rows={3}
                    className="w-full border p-2"
                    autoFocus
                  />
                </li>
              );
            }

            return (
              <li
                key={line.id}
                className={
                  canEdit
                    ? "rounded-md border border-transparent hover:border-slate-300 cursor-pointer transition-colors px-1 -mx-1"
                    : ""
                }                
                onClick={() => {
                  if (!canEdit) return;
                  editSnapshotRef.current = {
                    type: "step",
                    id: line.id,
                    value: line.text,
                  };
                  setEditingTarget({ type: "step", id: line.id });
                }}
              >
                {line.text}
              </li>
            );
          })}
        </ol>
      </section>

      {/* Notes */}
      {(notesText || editingTarget?.type === "notes") && (
        <section className="space-y-3">
          <h2 className="text-lg font-medium">Notes</h2>
          {editingTarget?.type === "notes" && canEdit ? (
            <textarea
              ref={notesEditorRef}
              value={notesText}
              onChange={(e) => {
                setNotesText(e.target.value);
                markDirtyIfNeeded("notes", undefined, e.target.value);
              }}
              rows={4}
              className="w-full border p-2"
              autoFocus
            />
          ) : (
            <p
              className={
                canEdit
                  ? "rounded-md border border-transparent hover:border-slate-300 cursor-pointer transition-colors px-2 py-1"
                  : ""
              }
              onClick={() => {
                if (!canEdit) return;
                editSnapshotRef.current = {
                  type: "notes",
                  value: notesText,
                };
                setEditingTarget({ type: "notes" });
              }}
            >
              {notesText || "\u00A0"}
            </p>
          )}
        </section>
      )}

      {/* Global Save */}
      {canEdit && hasDirty && (
        <div className="flex gap-3">
          <button
            onClick={handleSave}
            disabled={saveStatus === "saving"}
            className={`rounded-md bg-black px-4 py-2 text-white transition-opacity ${
              saveStatus === "saving" ? "opacity-60 pointer-events-none" : ""
            }`}
          >
            Save
          </button>
          {saveStatus === "saving" && (
            <span className="text-sm text-slate-600">Saving…</span>
          )}
          {saveStatus === "saved" && (
            <span
              className="text-sm text-slate-600 transition-opacity"
              style={{ opacity: 1 }}
            >
              Saved
            </span>
          )}
        </div>
      )}
    </main>
  );
}