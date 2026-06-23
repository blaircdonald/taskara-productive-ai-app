"use client";

import { Show } from "@clerk/nextjs";
import {
  ArrowRight,
  Bot,
  CalendarDays,
  CheckSquare,
  LayoutDashboard,
  Lightbulb,
  ListTodo,
  Menu,
  PenTool,
  Sparkles,
  StickyNote,
  X,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";

export function LandingPage() {
  return (
    <main className="landing-page min-h-screen overflow-hidden bg-[#fbf7f1] text-stone-950">
      <Navbar />
      <HeroSection />
    </main>
  );
}

function Navbar() {
  const [open, setOpen] = useState(false);

  return (
    <header className="fixed inset-x-0 top-0 z-50 px-4 pt-5 sm:px-8">
      <div className="mx-auto max-w-7xl">
        <div className="grid h-12 grid-cols-[1fr_auto] items-center gap-3 md:grid-cols-[1fr_1fr]">
          <Link href="/" className="flex w-fit items-center gap-2.5 font-semibold">
            <Logo />
            <span>Taskara</span>
          </Link>

          <div className="ml-auto hidden items-center gap-2 md:flex">
            <Show when="signed-out">
              <Link href="/sign-in" className="rounded-xl px-3 py-2 text-sm font-semibold text-stone-600 hover:text-stone-950">
                Sign in
              </Link>
              <CTA href="/sign-up" compact>Get started</CTA>
            </Show>
            <Show when="signed-in">
              <CTA href="/dashboard" compact>Open workspace</CTA>
            </Show>
          </div>

          <button onClick={() => setOpen(!open)} className="col-start-2 ml-auto flex h-10 w-10 items-center justify-center rounded-xl border border-stone-200 bg-white md:hidden" aria-label={open ? "Close menu" : "Open menu"}>
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {open && (
          <div className="mt-3 rounded-2xl border border-white/80 bg-[#fffdf9]/95 p-3 shadow-[0_12px_40px_rgba(95,70,50,.10)] backdrop-blur-xl md:hidden">
            <div className="grid grid-cols-2 gap-2">
              <Show when="signed-out">
                <Link href="/sign-in" className="flex h-11 items-center justify-center rounded-xl border bg-white text-sm font-semibold">
                  Sign in
                </Link>
                <CTA href="/sign-up" compact>Get started</CTA>
              </Show>
              <Show when="signed-in">
                <CTA href="/dashboard" compact>Open workspace</CTA>
              </Show>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}

function HeroSection() {
  return (
    <section id="top" className="relative min-h-screen px-4 pb-12 pt-24 sm:px-8 sm:pt-28 lg:flex lg:items-center lg:py-24">
      <Glow className="-left-40 top-20 bg-amber-300/30" />
      <Glow className="right-0 top-12 bg-violet-300/25" />
      <div className="pointer-events-none absolute inset-0 opacity-60">
        <div className="absolute left-[48%] top-20 h-64 w-64 rotate-45 border border-[#a54f36]/15" />
        <div className="absolute right-8 top-40 h-80 w-80 rotate-12 border border-violet-300/30" />
        <div className="absolute bottom-16 left-[42%] h-56 w-56 -rotate-12 border border-amber-300/35" />
      </div>
      <div className="relative mx-auto grid max-w-7xl items-start gap-12 lg:grid-cols-[0.82fr_1.18fr] lg:items-center">
        <div className="max-w-2xl text-left">
          <h1 className="landing-reveal max-w-2xl text-balance text-5xl font-semibold leading-[0.96] tracking-[-.055em] sm:text-6xl lg:text-[4rem]">
            Plan together. Execute smarter. Powered by AI.
          </h1>
          <p className="landing-reveal mt-6 max-w-md text-base leading-7 text-stone-600 sm:text-lg">
            Taskara brings notes, tasks, whiteboards, calendar planning, and collaboration into one thoughtful AI-powered workspace.
          </p>
          <div className="landing-reveal mt-8 flex max-w-md justify-center">
            <CTA href="/sign-up">Get started <ArrowRight className="h-4 w-4" /></CTA>
          </div>
        </div>
        <div id="preview" className="landing-float relative mx-auto w-full max-w-3xl scroll-mt-24 pt-10 lg:min-h-[650px] lg:max-w-none lg:pt-0">
          <div className="absolute right-1/2 top-0 h-[320px] w-[320px] translate-x-1/2 rotate-45 rounded-[3rem] bg-gradient-to-br from-[#a54f36] via-orange-400 to-violet-500 opacity-75 shadow-[0_40px_120px_rgba(165,79,54,.28)] sm:h-[430px] sm:w-[430px] lg:right-0 lg:top-8 lg:h-[510px] lg:w-[510px] lg:translate-x-0" />
          <div className="absolute right-[8%] top-[12%] hidden h-64 w-64 rotate-12 rounded-[2rem] border border-white/60 bg-amber-100/50 shadow-[0_20px_80px_rgba(217,119,6,.20)] backdrop-blur sm:block" />
          <div className="absolute right-[20%] top-[25%] hidden h-72 w-72 -rotate-[22deg] rounded-[2rem] border border-white/60 bg-violet-100/60 shadow-[0_25px_90px_rgba(124,58,237,.18)] backdrop-blur sm:block" />
          <div className="relative mx-auto rounded-[2rem] border border-white/90 bg-white/65 p-2.5 shadow-[0_35px_100px_rgba(103,70,45,.18)] backdrop-blur sm:p-4 lg:absolute lg:inset-x-auto lg:bottom-0 lg:right-0 lg:w-[88%]">
            <DashboardMockup />
          </div>
        </div>
      </div>
    </section>
  );
}

function DashboardMockup() {
  const cards = [
    ["Calendar", "8 items", "bg-teal-100 text-teal-700", CalendarDays],
    ["Kanban", "16 tasks", "bg-blue-100 text-blue-700", CheckSquare],
    ["Notes", "24 notes", "bg-amber-100 text-amber-700", StickyNote],
    ["AI Assistant", "Ready", "bg-violet-100 text-violet-700", Bot],
  ] as const;

  return (
    <div className="min-h-[470px] overflow-hidden rounded-[1.4rem] border border-stone-200/80 bg-[#f7f0e6] text-left">
      <MockTopbar title="Taskara dashboard" />
      <div className="grid min-h-[inherit] grid-cols-[56px_1fr] sm:grid-cols-[160px_1fr]">
        <MockSidebar />
        <div className="min-w-0 p-3 sm:p-5">
          <div className="rounded-2xl bg-gradient-to-r from-white to-amber-50 p-4 shadow-sm">
            <div className="flex items-center gap-2 text-xs font-semibold text-amber-700">
              <Sparkles className="h-3.5 w-3.5" />Good morning!
            </div>
            <p className="mt-2 text-lg font-semibold sm:text-2xl">A calm view of everything moving forward.</p>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2 lg:grid-cols-4">
            {cards.map(([label, stat, style, Icon]) => (
              <div key={label} className="rounded-xl border border-stone-200/70 bg-white p-3 shadow-sm">
                <span className={`flex h-8 w-8 items-center justify-center rounded-lg ${style}`}><Icon className="h-4 w-4" /></span>
                <p className="mt-3 text-xs font-semibold">{label}</p>
                <p className="mt-1 text-[10px] text-stone-400">{stat}</p>
              </div>
            ))}
          </div>
          <div className="mt-3 grid gap-2 lg:grid-cols-[1.2fr_.8fr]">
            <div className="rounded-xl border border-stone-200/70 bg-white p-3">
              <div className="flex items-center gap-2 text-xs font-semibold"><ListTodo className="h-3.5 w-3.5 text-blue-600" />Task summary</div>
              <div className="mt-4 grid grid-cols-4 gap-1">
                {["16", "9", "7", "1"].map((n, i) => (
                  <div key={i} className="rounded-lg bg-stone-50 p-2">
                    <p className="text-sm font-semibold">{n}</p>
                    <p className="text-[8px] text-stone-400">{["Total", "Done", "Open", "Due"][i]}</p>
                  </div>
                ))}
              </div>
              <div className="mt-3 h-2 rounded-full bg-stone-100"><div className="h-full w-2/3 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500" /></div>
            </div>
            <div className="hidden rounded-xl border border-violet-100 bg-gradient-to-br from-violet-50 to-amber-50 p-3 sm:block">
              <div className="flex items-center gap-2 text-xs font-semibold"><Lightbulb className="h-3.5 w-3.5 text-violet-600" />AI insight</div>
              <p className="mt-3 text-[10px] leading-4 text-stone-500">Your best focus window begins at 10:30. Start with the launch brief.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function MockTopbar({ title }: { title: string }) {
  return <div className="flex h-9 items-center gap-1.5 border-b border-stone-200/70 bg-white/90 px-3"><span className="h-2.5 w-2.5 rounded-full bg-rose-300" /><span className="h-2.5 w-2.5 rounded-full bg-amber-300" /><span className="h-2.5 w-2.5 rounded-full bg-emerald-300" /><span className="ml-3 text-[9px] font-medium text-stone-400">{title}</span></div>;
}

function MockSidebar() {
  return <aside className="border-r border-stone-200/70 bg-white/80 p-2"><div className="flex items-center gap-2 rounded-lg p-1.5"><Logo small /><span className="hidden text-[10px] font-semibold sm:block">Taskara</span></div><div className="mt-4 grid gap-1">{([[LayoutDashboard, "Dashboard"], [Bot, "AI Assistant"], [CalendarDays, "Calendar"], [CheckSquare, "Kanban"], [StickyNote, "Notes"], [PenTool, "Whiteboard"]] as const).map(([Icon, label], i) => <div key={label} className={`flex items-center gap-2 rounded-lg p-2 ${i === 0 ? "bg-[#a54f36] text-white" : "text-stone-400"}`}><Icon className="h-3.5 w-3.5 shrink-0" /><span className="hidden text-[9px] font-medium sm:block">{label}</span></div>)}</div></aside>;
}

function CTA({ href, children, compact = false }: { href: string; children: React.ReactNode; compact?: boolean }) {
  return <Link href={href} className={`inline-flex items-center justify-center gap-2 rounded-xl bg-[#a54f36] font-semibold text-white shadow-lg shadow-[#a54f36]/15 transition hover:-translate-y-0.5 hover:bg-[#91432e] hover:shadow-xl ${compact ? "h-10 px-4 text-xs" : "h-12 px-6 text-sm"}`}>{children}</Link>;
}

function Logo({ small = false }: { small?: boolean }) {
  return <span className={`flex shrink-0 items-center justify-center rounded-xl bg-[#a54f36] text-white shadow-sm ${small ? "h-7 w-7" : "h-10 w-10"}`}><Sparkles className={small ? "h-3.5 w-3.5" : "h-4.5 w-4.5"} /></span>;
}

function Glow({ className }: { className: string }) {
  return <div className={`pointer-events-none absolute h-96 w-96 rounded-full blur-3xl ${className}`} />;
}
