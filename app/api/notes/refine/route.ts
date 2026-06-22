import { GoogleGenAI } from "@google/genai";
import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { getUserSettings } from "@/lib/settings";

const actions = {
  grammar: "Improve grammar, spelling, and clarity without changing the meaning.",
  rephrase: "Rephrase the text while preserving its meaning.",
  shorter: "Make the text shorter and more direct while preserving key information.",
  longer: "Make the text more complete and detailed without adding unsupported claims.",
  simplify: "Simplify the language so it is easier to understand.",
  tone: "Change the tone to the requested tone while preserving the meaning.",
} as const;
const tones = ["Professional", "Friendly", "Confident", "Casual", "Concise"];

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "You must be signed in." }, { status: 401 });
  if (!process.env.GEMINI_API_KEY) return NextResponse.json({ error: "AI Refine is not configured. Add GEMINI_API_KEY to the server environment." }, { status: 503 });
  try {
    const settings = await getUserSettings(userId);
    if (!settings.aiProcessingEnabled || !settings.aiRefineEnabled) return NextResponse.json({ error: "AI Refine is disabled in Settings." }, { status: 403 });
    const body = await request.json();
    const text = typeof body.text === "string" ? body.text.trim() : "";
    const action = body.action as keyof typeof actions;
    const tone = typeof body.tone === "string" ? body.tone : undefined;
    if (!text || text.length > 12000) return NextResponse.json({ error: "Select between 1 and 12,000 characters." }, { status: 400 });
    if (!actions[action]) return NextResponse.json({ error: "Choose a valid refinement action." }, { status: 400 });
    if (action === "tone" && (!tone || !tones.includes(tone))) return NextResponse.json({ error: "Choose a valid tone." }, { status: 400 });
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const response = await ai.models.generateContent({
      model: settings.aiModel,
      contents: `Rewrite the text below. ${actions[action]} Requested default tone: ${settings.aiTone}.${tone ? ` Requested tone: ${tone}.` : ""} Response detail: ${settings.aiBehavior}.\n\nReturn only the rewritten text, without quotes, labels, markdown fences, or commentary.\n\nTEXT:\n${text}`,
    });
    const refined = response.text?.trim();
    if (!refined) throw new Error("Gemini returned an empty response.");
    return NextResponse.json({ text: refined });
  } catch (error) {
    console.error("AI Refine failed", error);
    return NextResponse.json({ error: "AI Refine could not complete this request. Try again." }, { status: 500 });
  }
}
