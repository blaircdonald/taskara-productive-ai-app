import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { ArrowRight, CalendarDays, CheckSquare, Plus, Sparkles } from "lucide-react";
import Link from "next/link";

const stats = [
  { label: "Focus tasks", value: "12", detail: "4 due today", color: "bg-amber-100 text-amber-700" },
  { label: "Open spaces", value: "7", detail: "2 shared boards", color: "bg-emerald-100 text-emerald-700" },
  { label: "AI drafts", value: "18", detail: "5 ready to refine", color: "bg-violet-100 text-violet-700" },
];

export default async function DashboardPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  return <AppShell><div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-5 py-5 sm:px-7 lg:px-9">
    <header className="flex flex-col gap-4 rounded-2xl border border-stone-200/80 bg-white/78 p-5 shadow-[0_20px_60px_rgba(120,90,60,0.08)] backdrop-blur md:flex-row md:items-center md:justify-between">
      <div><p className="text-sm font-medium text-amber-700">Good morning, Blair</p><h1 className="mt-1 text-2xl font-semibold sm:text-3xl">Your ideas, boards, and tasks in one calm place.</h1></div>
      <Link href="/calendar" className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#a54f36] px-4 text-sm font-medium text-white shadow-sm hover:bg-[#91432e]"><Plus className="h-4 w-4 text-amber-100" />Plan your day</Link>
    </header>
    <div className="grid gap-4 md:grid-cols-3">{stats.map((stat) => <article key={stat.label} className="rounded-2xl border border-stone-200/80 bg-white/82 p-5 shadow-[0_16px_45px_rgba(120,90,60,0.07)]"><div className="flex items-center justify-between"><p className="text-sm font-medium text-stone-500">{stat.label}</p><span className={`rounded-lg px-2.5 py-1 text-xs font-medium ${stat.color}`}>Live</span></div><p className="mt-5 text-3xl font-semibold">{stat.value}</p><p className="mt-1 text-sm text-stone-500">{stat.detail}</p></article>)}</div>
    <div className="grid gap-5 lg:grid-cols-[1.15fr_0.85fr]">
      <section className="rounded-2xl border border-stone-200/80 bg-white/82 p-6 shadow-[0_16px_45px_rgba(120,90,60,0.07)]"><span className="flex h-11 w-11 items-center justify-center rounded-xl bg-teal-100 text-teal-700"><CalendarDays className="h-5 w-5" /></span><h2 className="mt-5 text-xl font-semibold">Make room for what matters</h2><p className="mt-2 max-w-xl text-sm leading-6 text-stone-600">Plan tasks and reminders, keep loose ideas as drafts, and move the day around whenever plans change.</p><Link href="/calendar" className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-[#a54f36]">Open calendar <ArrowRight className="h-4 w-4" /></Link></section>
      <section className="rounded-2xl border border-amber-200/70 bg-[#fff8ed] p-6 shadow-[0_16px_45px_rgba(120,90,60,0.07)]"><div className="flex gap-3"><span className="flex h-11 w-11 items-center justify-center rounded-xl bg-violet-100 text-violet-700"><Sparkles className="h-5 w-5" /></span><span className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-100 text-blue-700"><CheckSquare className="h-5 w-5" /></span></div><h2 className="mt-5 text-xl font-semibold">A calmer planning rhythm</h2><p className="mt-2 text-sm leading-6 text-stone-600">Capture first, schedule when ready, and keep every task easy to find.</p></section>
    </div>
  </div></AppShell>;
}
