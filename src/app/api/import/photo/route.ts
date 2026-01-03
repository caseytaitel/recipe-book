export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import OpenAI from "openai";

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const image = formData.get("photo") as File | null;

    if (!image) {
      return NextResponse.json(
        { error: "No image uploaded" },
        { status: 400 }
      );
    }

    const buffer = Buffer.from(await image.arrayBuffer());

    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY!,
    });

    const response = await openai.responses.create({
      model: "gpt-4.1-mini",
      input: [
        {
          role: "user",
          content: [
            {
              type: "input_text",
              text: `
Read this recipe image and extract:
- title
- ingredients (array of strings)
- steps (array of strings)
- notes (optional)

Return strict JSON only.
`,
            },
            {
              type: "input_image",
              image_url: `data:${image.type};base64,${buffer.toString("base64")}`,
              detail: "auto",
            },
          ],
        },
      ],
    });

    const text = response.output_text;

    if (!text) {
      throw new Error("No text returned from OpenAI");
    }

    const raw = response.output_text;

    const cleaned = raw
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/```$/i, "")
      .trim();

    const draft = JSON.parse(cleaned);

    return NextResponse.json(draft);
  } catch (err) {
    console.error("Photo import failed:", err);
    return NextResponse.json(
      { error: "Failed to import from photo" },
      { status: 500 }
    );
  }
}