import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const tokenUrl = new URL("https://streaming.assemblyai.com/v3/token");
tokenUrl.search = new URLSearchParams({
  expires_in_seconds: "60",
  max_session_duration_seconds: "120",
}).toString();

export async function POST() {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: "You must be signed in." }, { status: 401 });

  const apiKey = process.env.ASSEMBLYAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "Speak to Note is not configured. Add ASSEMBLYAI_API_KEY to the server environment." },
      { status: 503 },
    );
  }

  try {
    const response = await fetch(tokenUrl, {
      method: "GET",
      headers: { Authorization: apiKey },
      cache: "no-store",
    });
    const data = (await response.json()) as { token?: string; error?: string };

    if (!response.ok || !data.token) {
      console.error("AssemblyAI token request failed", response.status, data.error);
      return NextResponse.json({ error: "Could not start voice transcription. Try again." }, { status: 502 });
    }

    return NextResponse.json({ token: data.token });
  } catch (error) {
    console.error("AssemblyAI token request failed", error);
    return NextResponse.json({ error: "Could not connect to voice transcription. Try again." }, { status: 502 });
  }
}
