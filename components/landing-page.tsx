"use client";

import { Show } from "@clerk/nextjs";
import {
  ArrowRight,
  Bot,
  CalendarDays,
  CheckSquare,
  LayoutDashboard,
  Menu,
  PenTool,
  Sparkles,
  StickyNote,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";

const features: { title: string; text: string; icon: LucideIcon; style: string }[] = [
  { title: "AI Assistant", text: "Plan your day and take action across your workspace.", icon: Bot, style: "bg-violet-100 text-violet-700" },
  { title: "Calendar", text: "Keep tasks, reminders, and commitments visible.", icon: CalendarDays, style: "bg-teal-100 text-teal-700" },
  { title: "Kanban Boards", text: "Move projects forward with flexible shared boards.", icon: CheckSquare, style: "bg-blue-100 text-blue-700" },
  { title: "Notes", text: "Capture and refine ideas in a focused writing space.", icon: StickyNote, style: "bg-amber-100 text-amber-700" },
  { title: "Whiteboards", text: "Map ideas and think visually with your team.", icon: PenTool, style: "bg-pink-100 text-pink-700" },
  { title: "Collaboration", text: "Keep people, tasks, and context moving together.", icon: Users, style: "bg-emerald-100 text-emerald-700" },
];

export function LandingPage() {
  return <main className="min-h-screen overflow-hidden bg-[#fbf7f1] text-stone-950">
    <Navbar />
    <section className="relative px-4 pb-20 pt-36 sm:pt-44">
      <div className="absolute -left-40 top-12 h-96 w-96 rounded-full bg-amber-300/30 blur-3xl" />
      <div className="absolute -right-40 top-40 h-96 w-96 rounded-full bg-violet-300/25 blur-3xl" />
      <div className="relative mx-auto max-w-7xl text-center">
        <div className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-white/75 px-3 py-1.5 text-xs font-semibold text-amber-800 shadow-sm"><Sparkles className="h-3.5 w-3.5" />One calm workspace, powered by AI</div>
        <h1 className="mx-auto mt-7 max-w-5xl text-balance text-5xl font-semibold leading-[1.02] tracking-[-.055em] sm:text-6xl lg:text-[5.4rem]">Your ideas, plans, and team, <span className="bg-gradient-to-r from-[#a54f36] via-orange-500 to-violet-600 bg-clip-text text-transparent">moving together.</span></h1>
        <p className="mx-auto mt-6 max-w-2xl text-balance text-base leading-7 text-stone-600 sm:text-lg">Taskara brings notes, tasks, whiteboards, calendar planning, and collaboration into one thoughtful AI-powered workspace.</p>
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <Show when="signed-out"><PrimaryLink href="/sign-up">Get started <ArrowRight className="h-4 w-4" /></PrimaryLink></Show>
          <Show when="signed-in"><PrimaryLink href="/dashboard">Open workspace <ArrowRight className="h-4 w-4" /></PrimaryLink></Show>
          <Link href="#features" className="inline-flex h-12 items-center justify-center rounded-xl border border-stone-200 bg-white/80 px-6 text-sm font-semibold shadow-sm transition hover:-translate-y-0.5 hover:bg-white hover:shadow-md">Explore features</Link>
        </div>
        <DashboardPreview />
      </div>
    </section>
    <section id="features" className="scroll-mt-24 px-4 py-20 sm:py-28">
      <div className="mx-auto max-w-7xl">
        <div className="mx-auto mb-12 max-w-3xl text-center"><p className="text-xs font-semibold uppercase tracking-wider text-[#a54f36]">Everything in its place</p><h2 className="mt-4 text-balance text-3xl font-semibold tracking-tight sm:text-5xl">A complete workspace that still feels simple</h2><p className="mx-auto mt-4 max-w-2xl text-sm leading-7 text-stone-600 sm:text-base">Each tool works beautifully alone and becomes more useful when connected.</p></div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{features.map(({ title, text, icon: Icon, style }) => <article key={title} className="rounded-3xl border border-stone-200/80 bg-white/70 p-5 shadow-[0_14px_40px_rgba(95,70,50,.06)] transition hover:-translate-y-1 hover:bg-white hover:shadow-lg"><span className={`flex h-11 w-11 items-center justify-center rounded-2xl ${style}`}><Icon className="h-5 w-5" /></span><h3 className="mt-5 font-semibold">{title}</h3><p className="mt-2 text-sm leading-6 text-stone-600">{text}</p></article>)}</div>
      </div>
    </section>
    <section className="px-4 py-20"><div className="relative mx-auto max-w-7xl overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-[#a54f36] to-violet-700 px-6 py-16 text-center text-white shadow-[0_35px_90px_rgba(122,65,45,.28)]"><Sparkles className="mx-auto h-7 w-7 text-amber-200" /><h2 className="mx-auto mt-6 max-w-3xl text-balance text-3xl font-semibold sm:text-5xl">Build your productivity system in one workspace</h2><p className="mx-auto mt-4 max-w-xl text-sm leading-7 text-white/75">Bring your work together and make every next step clearer.</p><div className="mt-8"><PrimaryLink href="/sign-up" light>Start for free <ArrowRight className="h-4 w-4" /></PrimaryLink></div></div></section>
    <footer className="border-t border-stone-200/80 bg-white/50 px-4 py-8"><div className="mx-auto flex max-w-7xl items-center justify-between gap-4"><Link href="/" className="flex items-center gap-2 font-semibold"><Logo />Taskara</Link><p className="text-xs text-stone-400">© 2026 Taskara. Built for focused work.</p></div></footer>
  </main>;
}

function Navbar() {
  const [open, setOpen] = useState(false);
  return <header className="fixed inset-x-0 top-0 z-50 px-3 pt-3 sm:px-5"><div className="mx-auto max-w-7xl rounded-2xl border border-white/80 bg-[#fffdf9]/85 shadow-[0_12px_40px_rgba(95,70,50,.10)] backdrop-blur-xl"><div className="flex h-16 items-center gap-4 px-4 sm:px-5"><Link href="/" className="flex items-center gap-2.5 font-semibold"><Logo />Taskara</Link><nav className="ml-auto hidden items-center gap-4 sm:flex"><Link href="#features" className="text-sm font-medium text-stone-600 hover:text-stone-950">Features</Link><Show when="signed-out"><Link href="/sign-in" className="text-sm font-semibold text-stone-600 hover:text-stone-950">Sign in</Link><PrimaryLink href="/sign-up" compact>Get started</PrimaryLink></Show><Show when="signed-in"><PrimaryLink href="/dashboard" compact>Open workspace</PrimaryLink></Show></nav><button onClick={() => setOpen(!open)} className="ml-auto flex h-10 w-10 items-center justify-center rounded-xl border border-stone-200 bg-white sm:hidden" aria-label="Toggle menu">{open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}</button></div>{open && <div className="grid gap-2 border-t border-stone-200/70 p-3 sm:hidden"><Link href="#features" onClick={() => setOpen(false)} className="rounded-xl px-3 py-2.5 text-sm font-medium hover:bg-stone-100">Features</Link><Show when="signed-out"><Link href="/sign-in" className="rounded-xl px-3 py-2.5 text-sm font-medium hover:bg-stone-100">Sign in</Link><PrimaryLink href="/sign-up" compact>Get started</PrimaryLink></Show><Show when="signed-in"><PrimaryLink href="/dashboard" compact>Open workspace</PrimaryLink></Show></div>}</div></header>;
}

function DashboardPreview() {
  const cards = [["Calendar", CalendarDays, "bg-teal-100 text-teal-700"], ["Kanban", CheckSquare, "bg-blue-100 text-blue-700"], ["Notes", StickyNote, "bg-amber-100 text-amber-700"], ["AI Assistant", Bot, "bg-violet-100 text-violet-700"]] as const;
  return <div className="mx-auto mt-12 max-w-6xl rounded-[2rem] border border-white/90 bg-white/65 p-2.5 shadow-[0_35px_100px_rgba(103,70,45,.18)] backdrop-blur sm:p-4"><div className="overflow-hidden rounded-[1.4rem] border border-stone-200/80 bg-[#f7f0e6] text-left"><div className="flex h-10 items-center gap-1.5 border-b bg-white/90 px-4"><span className="h-2.5 w-2.5 rounded-full bg-rose-300" /><span className="h-2.5 w-2.5 rounded-full bg-amber-300" /><span className="h-2.5 w-2.5 rounded-full bg-emerald-300" /><span className="ml-3 text-[10px] text-stone-400">Taskara dashboard</span></div><div className="grid min-h-[360px] grid-cols-[56px_1fr] sm:grid-cols-[180px_1fr]"><aside className="border-r bg-white/80 p-2"><div className="flex items-center gap-2 p-2"><Logo /><span className="hidden text-xs font-semibold sm:block">Taskara</span></div>{[LayoutDashboard, Bot, CalendarDays, CheckSquare, StickyNote, PenTool].map((Icon, index) => <div key={index} className={`mt-1 flex items-center gap-2 rounded-lg p-2 ${index === 0 ? "bg-[#a54f36] text-white" : "text-stone-400"}`}><Icon className="h-4 w-4" /><span className="hidden text-[10px] sm:block">{["Dashboard", "AI Assistant", "Calendar", "Kanban", "Notes", "Whiteboard"][index]}</span></div>)}</aside><div className="p-4 sm:p-6"><div className="rounded-2xl bg-gradient-to-r from-white to-amber-50 p-4 shadow-sm"><p className="text-xs font-semibold text-amber-700">Good morning, Blair</p><p className="mt-2 text-lg font-semibold sm:text-2xl">A calm view of everything moving forward.</p></div><div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">{cards.map(([label, Icon, style]) => <div key={label} className="rounded-xl border bg-white p-3 shadow-sm"><span className={`flex h-8 w-8 items-center justify-center rounded-lg ${style}`}><Icon className="h-4 w-4" /></span><p className="mt-3 text-xs font-semibold">{label}</p></div>)}</div></div></div></div></div>;
}

function PrimaryLink({ href, children, compact = false, light = false }: { href: string; children: React.ReactNode; compact?: boolean; light?: boolean }) {
  return <Link href={href} className={`inline-flex items-center justify-center gap-2 rounded-xl font-semibold shadow-lg transition hover:-translate-y-0.5 ${light ? "bg-white text-[#8f432e]" : "bg-[#a54f36] text-white hover:bg-[#91432e]"} ${compact ? "h-10 px-4 text-xs" : "h-12 px-6 text-sm"}`}>{children}</Link>;
}

function Logo() {
  return <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#a54f36] text-amber-100 shadow-sm"><Sparkles className="h-4.5 w-4.5" /></span>;
}
