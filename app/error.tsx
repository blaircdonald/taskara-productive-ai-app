"use client";

import { RotateCcw, TriangleAlert } from "lucide-react";

export default function ErrorPage({ reset }: { reset: () => void }) {
  return <main className="flex min-h-screen items-center justify-center bg-[var(--app-surface)] p-5"><div className="max-w-md rounded-2xl border border-rose-200 bg-white p-7 text-center shadow-xl"><TriangleAlert className="mx-auto h-8 w-8 text-rose-600" /><h1 className="mt-4 text-xl font-semibold">Dashboard could not load</h1><p className="mt-2 text-sm text-stone-500">Your data is safe. Try loading the overview again.</p><button onClick={reset} className="mt-5 inline-flex h-10 items-center gap-2 rounded-xl bg-[#a54f36] px-4 text-sm font-semibold text-white"><RotateCcw className="h-4 w-4" />Try again</button></div></main>;
}
