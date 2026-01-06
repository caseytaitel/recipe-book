// TODO Phase 4+: leverage extracted normalization pipeline when adding footnotes or structured annotations.

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import OpenAI from "openai";
import { normalizeRecipeData } from "@/lib/import";
import { OPENAI_MODEL } from "@/lib/ai/config";

function isValidUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

type ParsedRecipe = {
  title?: unknown;
  ingredients?: unknown;
  steps?: unknown;
  notes?: unknown;
};

export async function POST(req: Request) {
  try {
    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid request body" },
        { status: 400 }
      );
    }

    if (!body || typeof body !== "object") {
      return NextResponse.json(
        { error: "Please enter a valid recipe link." },
        { status: 400 }
      );
    }

    const url = (body as Record<string, unknown>).url;

    if (!url || typeof url !== "string" || !isValidUrl(url)) {
      return NextResponse.json(
        { error: "Please enter a valid recipe link." },
        { status: 400 }
      );
    }

    const fetchRes = await fetch(url, {
      headers: { "User-Agent": "RecipeBookBot/1.0" },
    });

    if (!fetchRes.ok) {
      return NextResponse.json(
        { error: "We couldn't read that website. Try another link." },
        { status: 400 }
      );
    }

    const html = await fetchRes.text();

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      console.error("[import:url]", "OPENAI_API_KEY is not configured");
      return NextResponse.json(
        { error: "Something went wrong on our side. Please try again." },
        { status: 500 }
      );
    }

    const openai = new OpenAI({
      apiKey,
    });

    const completion = await openai.chat.completions.create({
      model: OPENAI_MODEL,
      temperature: 0,
      messages: [
        {
          role: "system",
          content: "You extract structured recipe data. Return ONLY valid JSON.",
        },
        {
          role: "user",
          content: `
Extract a recipe from the following webpage content.

Return JSON with:
- title (string)
- ingredients (array of strings, one ingredient per line)
- steps (array of strings, one step per line)
- notes (string or null)

If information is missing, return empty strings or empty arrays.
Do not guess.

WEBPAGE CONTENT:
${html}
          `,
        },
      ],
    });

    const raw = completion.choices[0]?.message?.content;

    if (!raw || typeof raw !== "string") {
      console.error("[import:url]", "OpenAI returned no content");
      return NextResponse.json(
        { error: "We couldn't read that website." },
        { status: 500 }
      );
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch (parseError) {
      console.error("[import:url]", parseError);
      return NextResponse.json(
        { error: "Something didn't look right in that recipe." },
        { status: 500 }
      );
    }

    if (!parsed || typeof parsed !== "object") {
      return NextResponse.json(
        { error: "Something didn't look right in that recipe." },
        { status: 500 }
      );
    }

    const draft = normalizeRecipeData(parsed as ParsedRecipe, url);

    return NextResponse.json(draft);
  } catch (err) {
    console.error("[import:url]", err);
    return NextResponse.json(
      { error: "Something went wrong. Try again." },
      { status: 500 }
    );
  }
}