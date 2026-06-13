import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

export async function POST() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "You must be signed in." }, { status: 401 });
  if (!process.env.ASSEMBLYAI_API_KEY) return NextResponse.json({ error: "Voice Assistant is not configured. Add ASSEMBLYAI_API_KEY." }, { status: 503 });
  const url = new URL("https://agents.assemblyai.com/v1/token");
  url.search = new URLSearchParams({ expires_in_seconds: "60", max_session_duration_seconds: "1800" }).toString();
  try {
    const response = await fetch(url, { headers: { Authorization: `Bearer ${process.env.ASSEMBLYAI_API_KEY}` }, cache: "no-store" });
    const data = await response.json();
    if (!response.ok || !data.token) throw new Error("Could not mint a voice token.");
    return NextResponse.json({ token: data.token });
  } catch (error) {
    console.error("Voice token failed", error);
    return NextResponse.json({ error: "Could not start Voice Assistant." }, { status: 502 });
  }
}
