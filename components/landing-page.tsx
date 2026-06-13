"use client";

import { Show } from "@clerk/nextjs";
import {
  ArrowRight, Bell, Blocks, Bot, BrainCircuit, CalendarDays, Check, CheckCircle2,
  CheckSquare, ChevronRight, CircleHelp, Clock3, Code2, Command, FileText, Github,
  GraduationCap, LayoutDashboard, LayoutTemplate, Lightbulb, Linkedin, ListTodo,
  Menu, MessageCircle, MousePointer2, PenTool, Play, Plus, Rocket, Shapes, ShieldCheck,
  Sparkles, StickyNote, Target, Twitter, Users, WandSparkles, X, Zap,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";

const navItems = [
  ["Features", "#features"], ["How it works", "#workflow"], ["Showcase", "#showcase"],
  ["AI", "#ai"], ["Collaboration", "#collaboration"], ["Use cases", "#use-cases"], ["FAQ", "#faq"],
] as const;

const features: Feature[] = [
  { icon: Bot, title: "AI Assistant", text: "Plan your day, find answers, and take action across your workspace.", tone: "violet" },
  { icon: LayoutDashboard, title: "Smart Dashboard", text: "See tasks, reminders, recent work, and AI insights in one calm view.", tone: "amber" },
  { icon: CalendarDays, title: "Calendar & Reminders", text: "Turn plans into scheduled work and keep every commitment visible.", tone: "teal" },
  { icon: CheckSquare, title: "Kanban Task Boards", text: "Shape flexible workflows with priorities, due dates, labels, and comments.", tone: "blue" },
  { icon: StickyNote, title: "Notion-style Notes", text: "Write, structure, and refine ideas in a focused, flexible editor.", tone: "yellow" },
  { icon: PenTool, title: "Visual Whiteboards", text: "Think spatially, map ideas, and generate diagrams with AI.", tone: "pink" },
  { icon: LayoutTemplate, title: "AI Template Builder", text: "Create reusable workflows and mini workspace systems with AI.", tone: "orange", badge: "Coming soon" },
  { icon: Users, title: "Live Collaboration", text: "Work together with active presence, shared boards, and task comments.", tone: "green" },
  { icon: Blocks, title: "Spaces & Categories", text: "Organize projects, pages, people, and preferences around your work.", tone: "slate" },
];

const aiFeatures: Feature[] = [
  { icon: CheckSquare, title: "Create tasks", text: "Turn a thought into a structured task with a due date and priority.", tone: "blue" },
  { icon: Bell, title: "Add reminders", text: "Ask naturally and let Taskara place the right reminder on your calendar.", tone: "teal" },
  { icon: WandSparkles, title: "Refine notes", text: "Rewrite selected text for clarity, tone, or a more useful structure.", tone: "yellow" },
  { icon: Shapes, title: "Generate diagrams", text: "Move from an idea to a visual diagram directly on your whiteboard.", tone: "pink" },
  { icon: LayoutTemplate, title: "Build templates", text: "Describe a repeatable system and let AI shape the first version.", tone: "orange", badge: "Coming soon" },
  { icon: Lightbulb, title: "Get insights", text: "Spot overdue work, momentum, and the most useful next action.", tone: "violet" },
];

const useCases: Feature[] = [
  { icon: Rocket, title: "Founders", text: "Keep strategy, product work, decisions, and execution close together.", tone: "orange" },
  { icon: GraduationCap, title: "Students", text: "Turn classes, notes, assignments, and study plans into one clear system.", tone: "blue" },
  { icon: Users, title: "Teams", text: "Coordinate projects in shared spaces without losing the context around them.", tone: "green" },
  { icon: WandSparkles, title: "Creators", text: "Capture ideas, develop content, and manage production from spark to publish.", tone: "pink" },
  { icon: Target, title: "Project managers", text: "Connect roadmaps, task boards, meetings, and project knowledge.", tone: "violet" },
  { icon: CheckCircle2, title: "Personal productivity", text: "Build a gentle, reliable home for everything you want to move forward.", tone: "teal" },
];

const testimonials = [
  { quote: "Taskara gives our planning the structure of a project tool without making creative work feel rigid.", name: "Maya Chen", role: "Product Lead" },
  { quote: "I can move from a rough idea to notes, a board, and an actual plan without changing my mental context.", name: "Jordan Ellis", role: "Independent Creator" },
  { quote: "The shared Kanban view keeps everyone aligned, while the AI assistant makes weekly planning remarkably quick.", name: "Priya Raman", role: "Operations Director" },
];

const faqs = [
  ["What can the AI Assistant do?", "Taskara's AI Assistant can help you plan, answer questions, create tasks and reminders, and work across supported parts of your workspace. Important updates require your confirmation."],
  ["How does collaboration work?", "Shared Kanban boards support invited collaborators, active presence, and task-level comments powered by Liveblocks. Shared spaces also keep pages and collaborators organized together."],
  ["Can I write long-form notes?", "Yes. Taskara includes focused notes and a structured page editor for longer documents, project context, and reusable page templates."],
  ["Does the whiteboard support AI?", "Yes. You can use AI diagram generation to turn a prompt into a visual starting point, then continue shaping it on the whiteboard."],
  ["Is the AI Template Builder available?", "The AI Template Builder is in development. It is shown as coming soon anywhere it appears on this page."],
  ["How is my data handled?", "Taskara uses authenticated, owner-scoped workspace data and requires confirmation before important AI-assisted updates. You can also export your workspace data from settings."],
];

type Tone = "violet" | "amber" | "teal" | "blue" | "yellow" | "pink" | "orange" | "green" | "slate";
type Feature = { icon: LucideIcon; title: string; text: string; tone: Tone; badge?: string };

const tones: Record<Tone, string> = {
  violet: "bg-violet-100 text-violet-700", amber: "bg-amber-100 text-amber-700",
  teal: "bg-teal-100 text-teal-700", blue: "bg-blue-100 text-blue-700",
  yellow: "bg-yellow-100 text-yellow-700", pink: "bg-pink-100 text-pink-700",
  orange: "bg-orange-100 text-orange-700", green: "bg-emerald-100 text-emerald-700",
  slate: "bg-slate-100 text-slate-700",
};

export function LandingPage() {
  return (
    <main className="landing-page overflow-hidden bg-[#fbf7f1] text-stone-950">
      <Navbar />
      <HeroSection />
      <FeatureSection />
      <WorkflowSection />
      <ProductShowcase />
      <AIWorkflowSection />
      <CollaborationSection />
      <UseCasesSection />
      <TestimonialsSection />
      <FAQSection />
      <FinalCTASection />
      <Footer />
    </main>
  );
}

function Navbar() {
  const [open, setOpen] = useState(false);
  return <header className="fixed inset-x-0 top-0 z-50 px-3 pt-3 sm:px-5">
    <div className="mx-auto max-w-7xl rounded-2xl border border-white/80 bg-[#fffdf9]/85 shadow-[0_12px_40px_rgba(95,70,50,.10)] backdrop-blur-xl">
      <div className="flex h-16 items-center gap-4 px-4 sm:px-5">
        <Link href="/" className="flex items-center gap-2.5 font-semibold"><Logo /><span>Taskara</span></Link>
        <nav className="ml-auto hidden items-center gap-1 lg:flex">
          {navItems.map(([label, href]) => <Link key={href} href={href} className="rounded-lg px-3 py-2 text-xs font-medium text-stone-600 transition hover:bg-stone-100 hover:text-stone-950">{label}</Link>)}
        </nav>
        <div className="ml-auto hidden items-center gap-2 lg:flex">
          <Show when="signed-out"><Link href="/sign-in" className="rounded-xl px-3 py-2 text-sm font-semibold text-stone-600 hover:text-stone-950">Sign in</Link><CTA href="/sign-up" compact>Get started</CTA></Show>
          <Show when="signed-in"><CTA href="/dashboard" compact>Open workspace</CTA></Show>
        </div>
        <button onClick={() => setOpen(!open)} className="ml-auto flex h-10 w-10 items-center justify-center rounded-xl border border-stone-200 bg-white lg:hidden" aria-label={open ? "Close menu" : "Open menu"}>{open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}</button>
      </div>
      {open && <div className="border-t border-stone-200/70 p-3 lg:hidden">
        <nav className="grid gap-1">{navItems.map(([label, href]) => <Link onClick={() => setOpen(false)} key={href} href={href} className="rounded-xl px-3 py-2.5 text-sm font-medium hover:bg-stone-100">{label}</Link>)}</nav>
        <div className="mt-3 grid grid-cols-2 gap-2 border-t border-stone-200/70 pt-3">
          <Show when="signed-out"><Link href="/sign-in" className="flex h-11 items-center justify-center rounded-xl border bg-white text-sm font-semibold">Sign in</Link><CTA href="/sign-up" compact>Get started</CTA></Show>
          <Show when="signed-in"><CTA href="/dashboard" compact>Open workspace</CTA></Show>
        </div>
      </div>}
    </div>
  </header>;
}

function HeroSection() {
  return <section className="relative px-4 pb-20 pt-36 sm:pt-44 lg:pb-28">
    <Glow className="-left-40 top-12 bg-amber-300/30" />
    <Glow className="-right-40 top-40 bg-violet-300/25" />
    <div className="relative mx-auto max-w-7xl text-center">
      <div className="landing-reveal inline-flex items-center gap-2 rounded-full border border-amber-200/80 bg-white/75 px-3 py-1.5 text-xs font-semibold text-amber-800 shadow-sm"><Sparkles className="h-3.5 w-3.5" /> One calm workspace, powered by AI</div>
      <h1 className="landing-reveal mx-auto mt-7 max-w-5xl text-balance text-5xl font-semibold leading-[1.02] tracking-[-.055em] sm:text-6xl lg:text-[5.4rem]">
        Your ideas, plans, and team, <span className="bg-gradient-to-r from-[#a54f36] via-orange-500 to-violet-600 bg-clip-text text-transparent">moving together.</span>
      </h1>
      <p className="landing-reveal mx-auto mt-6 max-w-2xl text-balance text-base leading-7 text-stone-600 sm:text-lg">Taskara brings notes, tasks, whiteboards, calendar planning, and collaboration into one thoughtful AI-powered workspace.</p>
      <div className="landing-reveal mt-8 flex flex-col justify-center gap-3 sm:flex-row">
        <CTA href="/sign-up">Get started <ArrowRight className="h-4 w-4" /></CTA>
        <Link href="#showcase" className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-stone-200 bg-white/80 px-6 text-sm font-semibold shadow-sm transition hover:-translate-y-0.5 hover:bg-white hover:shadow-md"><Play className="h-4 w-4 fill-[#a54f36] text-[#a54f36]" />Watch demo</Link>
      </div>
      <div className="mt-7 flex flex-wrap justify-center gap-2">
        {([["AI Assistant", Sparkles], ["Real-time collaboration", Users], ["Smart workspace", BrainCircuit]] as const).map(([label, Icon]) => <span key={label} className="flex items-center gap-1.5 rounded-full border border-stone-200/80 bg-white/60 px-3 py-1.5 text-xs font-medium text-stone-600"><Icon className="h-3.5 w-3.5 text-[#a54f36]" />{label}</span>)}
      </div>
      <div className="landing-float mx-auto mt-12 max-w-6xl rounded-[2rem] border border-white/90 bg-white/65 p-2.5 shadow-[0_35px_100px_rgba(103,70,45,.18)] backdrop-blur sm:p-4">
        <DashboardMockup />
      </div>
    </div>
  </section>;
}

function FeatureSection() {
  return <Section id="features" eyebrow="Everything in its place" title="A complete workspace that still feels simple" text="Each tool is useful on its own. Together, they create a connected system for thinking, planning, and getting meaningful work done.">
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {features.map((feature) => <FeatureCard key={feature.title} {...feature} />)}
    </div>
  </Section>;
}

function WorkflowSection() {
  const steps = [
    { number: "01", icon: Blocks, title: "Organize your workspace", text: "Bring projects, notes, boards, and plans into calm, flexible spaces." },
    { number: "02", icon: Sparkles, title: "Let AI move work forward", text: "Create tasks, refine ideas, generate diagrams, and find the next step." },
    { number: "03", icon: Users, title: "Collaborate and track progress", text: "Share context, discuss the work, and see momentum as it happens." },
  ];
  return <Section id="workflow" eyebrow="How it works" title="From open loop to clear next step" text="Taskara gives every idea a natural path from capture to action.">
    <div className="relative grid gap-5 lg:grid-cols-3">
      <div className="absolute left-[16%] right-[16%] top-12 hidden border-t border-dashed border-[#a54f36]/30 lg:block" />
      {steps.map((step) => <article key={step.number} className="relative rounded-3xl border border-stone-200/80 bg-white/70 p-6 shadow-[0_18px_50px_rgba(95,70,50,.07)]">
        <div className="flex items-center justify-between"><span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#a54f36] text-white shadow-lg shadow-[#a54f36]/20"><step.icon className="h-5 w-5" /></span><span className="text-4xl font-semibold tracking-tighter text-stone-200">{step.number}</span></div>
        <h3 className="mt-6 text-lg font-semibold">{step.title}</h3><p className="mt-2 text-sm leading-6 text-stone-600">{step.text}</p>
      </article>)}
    </div>
  </Section>;
}

function ProductShowcase() {
  return <Section id="showcase" eyebrow="Product showcase" title="A focused view for every kind of work" text="Move naturally between overview, deep work, visual thinking, and execution without rebuilding your context.">
    <div className="grid gap-5 lg:grid-cols-2">
      <ShowcaseCard label="Dashboard overview" title="Know what matters now" text="A calm command center for tasks, reminders, recent work, and AI insights." className="lg:col-span-2"><DashboardMockup compact /></ShowcaseCard>
      <ShowcaseCard label="Notes editor" title="Give ideas room to grow" text="Focused writing with flexible structure and AI refinement."><NotesMockup /></ShowcaseCard>
      <ShowcaseCard label="Kanban board" title="Turn plans into motion" text="Shared, flexible boards with comments and clear ownership."><KanbanMockup /></ShowcaseCard>
      <ShowcaseCard label="Visual whiteboard" title="Think beyond the list" text="Map relationships and shape ideas in a visual canvas."><WhiteboardMockup /></ShowcaseCard>
      <ShowcaseCard label="AI Assistant" title="One prompt, real progress" text="Ask questions or take action anywhere in your workspace."><AssistantMockup /></ShowcaseCard>
    </div>
  </Section>;
}

function AIWorkflowSection() {
  return <section id="ai" className="scroll-mt-24 px-4 py-20 sm:py-28">
    <div className="relative mx-auto max-w-7xl overflow-hidden rounded-[2.25rem] bg-[#211b18] px-5 py-14 text-stone-50 shadow-[0_30px_90px_rgba(49,35,27,.2)] sm:px-10 lg:px-14">
      <div className="absolute -right-24 -top-24 h-80 w-80 rounded-full bg-violet-500/20 blur-3xl" /><div className="absolute -bottom-32 left-20 h-72 w-72 rounded-full bg-amber-400/15 blur-3xl" />
      <div className="relative grid gap-10 lg:grid-cols-[.8fr_1.2fr] lg:items-end">
        <div><Eyebrow dark icon={Sparkles}>AI woven into the work</Eyebrow><h2 className="mt-4 text-balance text-3xl font-semibold tracking-tight sm:text-5xl">Less busywork. More useful momentum.</h2><p className="mt-4 max-w-xl text-sm leading-7 text-stone-300 sm:text-base">Taskara&apos;s AI meets you inside the workspace, where it can turn your intent into a clear, reviewable next step.</p></div>
        <div className="grid gap-3 sm:grid-cols-2">{aiFeatures.map((feature) => <FeatureCard key={feature.title} {...feature} dark />)}</div>
      </div>
    </div>
  </section>;
}

function CollaborationSection() {
  const items = [["Shared Kanban boards", CheckSquare], ["Active user presence", Users], ["Task-level comments", MessageCircle], ["Liveblocks-powered collaboration", Zap], ["Flexible team workspaces", Blocks]] as const;
  return <Section id="collaboration" eyebrow="Built for shared momentum" title="Collaboration that keeps context attached" text="Work together directly where decisions, tasks, and ideas live.">
    <div className="grid items-center gap-10 lg:grid-cols-[.85fr_1.15fr]">
      <div><div className="grid gap-3">{items.map(([label, Icon]) => <div key={label} className="flex items-center gap-3 rounded-2xl border border-stone-200/80 bg-white/70 p-3.5 shadow-sm"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700"><Icon className="h-4 w-4" /></span><span className="text-sm font-semibold">{label}</span><Check className="ml-auto h-4 w-4 text-emerald-600" /></div>)}</div></div>
      <div className="rounded-[2rem] border border-white bg-gradient-to-br from-emerald-50 via-white to-blue-50 p-4 shadow-[0_30px_80px_rgba(75,100,85,.14)] sm:p-7"><CollaborationMockup /></div>
    </div>
  </Section>;
}

function UseCasesSection() {
  return <Section id="use-cases" eyebrow="Made for many minds" title="Your workspace should fit how you think" text="Taskara is structured enough to keep work moving and flexible enough to make it your own.">
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{useCases.map((item) => <FeatureCard key={item.title} {...item} />)}</div>
  </Section>;
}

function TestimonialsSection() {
  return <Section eyebrow="Early impressions" title="A calmer way to do ambitious work" text="Placeholder stories from the kinds of people Taskara is built to support.">
    <div className="grid gap-4 lg:grid-cols-3">{testimonials.map((item, i) => <article key={item.name} className="rounded-3xl border border-stone-200/80 bg-white/75 p-6 shadow-[0_18px_50px_rgba(95,70,50,.07)]"><div className="flex gap-1 text-amber-500">{Array.from({ length: 5 }).map((_, star) => <Sparkles key={star} className="h-3.5 w-3.5 fill-current" />)}</div><blockquote className="mt-5 text-base leading-7 text-stone-700">&ldquo;{item.quote}&rdquo;</blockquote><div className="mt-6 flex items-center gap-3 border-t border-stone-200/70 pt-5"><span className={`flex h-10 w-10 items-center justify-center rounded-full font-semibold text-white ${["bg-[#a54f36]", "bg-violet-600", "bg-teal-700"][i]}`}>{item.name.split(" ").map((n) => n[0]).join("")}</span><div><p className="text-sm font-semibold">{item.name}</p><p className="text-xs text-stone-500">{item.role}</p></div></div></article>)}</div>
  </Section>;
}

function FAQSection() {
  return <Section id="faq" eyebrow="Frequently asked" title="A few useful answers" text="The practical details behind Taskara's connected workspace.">
    <div className="mx-auto max-w-3xl space-y-3">{faqs.map(([question, answer]) => <details key={question} className="group rounded-2xl border border-stone-200/80 bg-white/75 px-5 shadow-sm open:bg-white open:shadow-md"><summary className="flex cursor-pointer list-none items-center gap-3 py-5 text-sm font-semibold"><CircleHelp className="h-4 w-4 text-[#a54f36]" />{question}<Plus className="ml-auto h-4 w-4 transition group-open:rotate-45" /></summary><p className="pb-5 pl-7 text-sm leading-6 text-stone-600">{answer}</p></details>)}</div>
  </Section>;
}

function FinalCTASection() {
  return <section className="px-4 py-20 sm:py-28"><div className="relative mx-auto max-w-7xl overflow-hidden rounded-[2.5rem] bg-gradient-to-br from-[#a54f36] via-[#a54f36] to-violet-700 px-6 py-16 text-center text-white shadow-[0_35px_90px_rgba(122,65,45,.28)] sm:px-10 sm:py-20"><div className="absolute left-0 top-0 h-52 w-52 rounded-full bg-amber-300/20 blur-3xl" /><div className="absolute bottom-0 right-0 h-60 w-60 rounded-full bg-violet-300/25 blur-3xl" /><div className="relative"><span className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-white/15 ring-1 ring-white/25"><Sparkles className="h-6 w-6 text-amber-200" /></span><h2 className="mx-auto mt-6 max-w-3xl text-balance text-3xl font-semibold tracking-tight sm:text-5xl">Build your entire productivity system in one AI workspace</h2><p className="mx-auto mt-4 max-w-xl text-sm leading-7 text-white/75 sm:text-base">Bring your work together, make the next step clearer, and give your best ideas room to move.</p><Link href="/sign-up" className="mt-8 inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-white px-6 text-sm font-semibold text-[#8f432e] shadow-lg transition hover:-translate-y-0.5 hover:shadow-xl">Start for free <ArrowRight className="h-4 w-4" /></Link></div></div></section>;
}

function Footer() {
  const groups = [
    ["Product", [["Features", "#features"], ["Showcase", "#showcase"], ["AI Assistant", "#ai"], ["Collaboration", "#collaboration"]]],
    ["Resources", [["Use cases", "#use-cases"], ["FAQ", "#faq"], ["Sign in", "/sign-in"], ["Create account", "/sign-up"]]],
    ["Legal", [["Privacy", "#"], ["Terms", "#"], ["Security", "#"], ["Data handling", "#faq"]]],
  ] as const;
  return <footer className="border-t border-stone-200/80 bg-white/50 px-4 py-12"><div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-[1.2fr_2fr]"><div><Link href="/" className="flex items-center gap-2.5 font-semibold"><Logo /><span>Taskara</span></Link><p className="mt-4 max-w-xs text-sm leading-6 text-stone-500">A cozy AI-powered workspace for ideas, plans, and shared momentum.</p><div className="mt-5 flex gap-2">{[Twitter, Linkedin, Github].map((Icon, i) => <span key={i} title="Social link coming later" className="flex h-9 w-9 items-center justify-center rounded-xl border border-stone-200 bg-white text-stone-400"><Icon className="h-4 w-4" /></span>)}</div></div><div className="grid grid-cols-2 gap-8 sm:grid-cols-3">{groups.map(([title, links]) => <div key={title}><p className="text-xs font-semibold uppercase tracking-wider text-stone-400">{title}</p><div className="mt-4 grid gap-3">{links.map(([label, href]) => href === "#" ? <span key={label} className="text-sm text-stone-400" title="Link coming later">{label}</span> : <Link key={label} href={href} className="text-sm text-stone-600 hover:text-[#a54f36]">{label}</Link>)}</div></div>)}</div></div><div className="mx-auto mt-10 flex max-w-7xl flex-col gap-2 border-t border-stone-200/70 pt-6 text-xs text-stone-400 sm:flex-row sm:justify-between"><p>© 2026 Taskara. Built for focused work.</p><p>Thoughtful tools. Clearer days.</p></div></footer>;
}

function Section({ id, eyebrow, title, text, children }: { id?: string; eyebrow: string; title: string; text: string; children: React.ReactNode }) {
  return <section id={id} className="scroll-mt-24 px-4 py-20 sm:py-28"><div className="mx-auto max-w-7xl"><div className="mx-auto mb-12 max-w-3xl text-center"><Eyebrow>{eyebrow}</Eyebrow><h2 className="mt-4 text-balance text-3xl font-semibold tracking-[-.035em] sm:text-5xl">{title}</h2><p className="mx-auto mt-4 max-w-2xl text-sm leading-7 text-stone-600 sm:text-base">{text}</p></div>{children}</div></section>;
}

function Eyebrow({ children, dark = false, icon: Icon = Sparkles }: { children: React.ReactNode; dark?: boolean; icon?: LucideIcon }) {
  return <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold ${dark ? "bg-white/10 text-amber-200 ring-1 ring-white/15" : "border border-amber-200/80 bg-amber-50 text-amber-800"}`}><Icon className="h-3.5 w-3.5" />{children}</span>;
}

function FeatureCard({ icon: Icon, title, text, tone, badge, dark = false }: Feature & { dark?: boolean }) {
  return <article className={`group rounded-3xl border p-5 transition duration-300 hover:-translate-y-1 ${dark ? "border-white/10 bg-white/[.06] hover:bg-white/[.09]" : "border-stone-200/80 bg-white/70 shadow-[0_14px_40px_rgba(95,70,50,.06)] hover:bg-white hover:shadow-[0_22px_55px_rgba(95,70,50,.11)]"}`}><div className="flex items-start justify-between gap-3"><span className={`flex h-11 w-11 items-center justify-center rounded-2xl ${tones[tone]}`}><Icon className="h-5 w-5" /></span>{badge && <span className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${dark ? "bg-white/10 text-amber-200" : "bg-orange-50 text-orange-700"}`}>{badge}</span>}</div><h3 className="mt-5 font-semibold">{title}</h3><p className={`mt-2 text-sm leading-6 ${dark ? "text-stone-300" : "text-stone-600"}`}>{text}</p></article>;
}

function ShowcaseCard({ label, title, text, children, className = "" }: { label: string; title: string; text: string; children: React.ReactNode; className?: string }) {
  return <article className={`overflow-hidden rounded-[2rem] border border-stone-200/80 bg-white/75 p-3 shadow-[0_22px_60px_rgba(95,70,50,.09)] ${className}`}><div className="p-4 sm:p-5"><p className="text-xs font-semibold uppercase tracking-wider text-[#a54f36]">{label}</p><h3 className="mt-2 text-xl font-semibold">{title}</h3><p className="mt-1 text-sm text-stone-500">{text}</p></div>{children}</article>;
}

function DashboardMockup({ compact = false }: { compact?: boolean }) {
  const cards = [["Calendar", "8 items", "bg-teal-100 text-teal-700", CalendarDays], ["Kanban", "16 tasks", "bg-blue-100 text-blue-700", CheckSquare], ["Notes", "24 notes", "bg-amber-100 text-amber-700", StickyNote], ["AI Assistant", "Ready", "bg-violet-100 text-violet-700", Bot]] as const;
  return <div className={`overflow-hidden rounded-[1.4rem] border border-stone-200/80 bg-[#f7f0e6] text-left ${compact ? "min-h-[330px]" : "min-h-[470px]"}`}><MockTopbar title="Taskara dashboard" />
    <div className="grid min-h-[inherit] grid-cols-[56px_1fr] sm:grid-cols-[160px_1fr]"><MockSidebar /><div className="min-w-0 p-3 sm:p-5"><div className="rounded-2xl bg-gradient-to-r from-white to-amber-50 p-4 shadow-sm"><div className="flex items-center gap-2 text-xs font-semibold text-amber-700"><Sparkles className="h-3.5 w-3.5" />Good morning, Blair</div><p className="mt-2 text-lg font-semibold sm:text-2xl">A calm view of everything moving forward.</p></div><div className="mt-3 grid grid-cols-2 gap-2 lg:grid-cols-4">{cards.map(([label, stat, style, Icon]) => <div key={label} className="rounded-xl border border-stone-200/70 bg-white p-3 shadow-sm"><span className={`flex h-8 w-8 items-center justify-center rounded-lg ${style}`}><Icon className="h-4 w-4" /></span><p className="mt-3 text-xs font-semibold">{label}</p><p className="mt-1 text-[10px] text-stone-400">{stat}</p></div>)}</div><div className="mt-3 grid gap-2 lg:grid-cols-[1.2fr_.8fr]"><div className="rounded-xl border border-stone-200/70 bg-white p-3"><div className="flex items-center gap-2 text-xs font-semibold"><ListTodo className="h-3.5 w-3.5 text-blue-600" />Task summary</div><div className="mt-4 grid grid-cols-4 gap-1">{["16", "9", "7", "1"].map((n, i) => <div key={i} className="rounded-lg bg-stone-50 p-2"><p className="text-sm font-semibold">{n}</p><p className="text-[8px] text-stone-400">{["Total", "Done", "Open", "Due"][i]}</p></div>)}</div><div className="mt-3 h-2 rounded-full bg-stone-100"><div className="h-full w-2/3 rounded-full bg-gradient-to-r from-emerald-500 to-teal-500" /></div></div><div className="hidden rounded-xl border border-violet-100 bg-gradient-to-br from-violet-50 to-amber-50 p-3 sm:block"><div className="flex items-center gap-2 text-xs font-semibold"><Lightbulb className="h-3.5 w-3.5 text-violet-600" />AI insight</div><p className="mt-3 text-[10px] leading-4 text-stone-500">Your best focus window begins at 10:30. Start with the launch brief.</p></div></div></div></div>
  </div>;
}

function MockTopbar({ title }: { title: string }) { return <div className="flex h-9 items-center gap-1.5 border-b border-stone-200/70 bg-white/90 px-3"><span className="h-2.5 w-2.5 rounded-full bg-rose-300" /><span className="h-2.5 w-2.5 rounded-full bg-amber-300" /><span className="h-2.5 w-2.5 rounded-full bg-emerald-300" /><span className="ml-3 text-[9px] font-medium text-stone-400">{title}</span></div>; }
function MockSidebar() { return <aside className="border-r border-stone-200/70 bg-white/80 p-2"><div className="flex items-center gap-2 rounded-lg p-1.5"><Logo small /><span className="hidden text-[10px] font-semibold sm:block">Taskara</span></div><div className="mt-4 grid gap-1">{([[LayoutDashboard, "Dashboard"], [Bot, "AI Assistant"], [CalendarDays, "Calendar"], [CheckSquare, "Kanban"], [StickyNote, "Notes"], [PenTool, "Whiteboard"]] as const).map(([Icon, label], i) => <div key={label} className={`flex items-center gap-2 rounded-lg p-2 ${i === 0 ? "bg-[#a54f36] text-white" : "text-stone-400"}`}><Icon className="h-3.5 w-3.5 shrink-0" /><span className="hidden text-[9px] font-medium sm:block">{label}</span></div>)}</div></aside>; }

function NotesMockup() { return <MockFrame title="Launch brief"><div className="p-5"><div className="flex flex-wrap gap-1 border-b pb-3 text-stone-400">{[FileText, Command, ListTodo, WandSparkles].map((Icon, i) => <span key={i} className="rounded-md border bg-white p-1.5"><Icon className="h-3 w-3" /></span>)}</div><p className="mt-5 text-xl font-semibold">Launch narrative</p><p className="mt-3 text-[11px] leading-5 text-stone-500">Taskara turns scattered work into a connected, calm system.</p><div className="mt-4 space-y-2">{["Clarify the core story", "Refine homepage messaging", "Prepare launch checklist"].map((x, i) => <div key={x} className="flex items-center gap-2 text-[10px] text-stone-600"><span className={`h-3.5 w-3.5 rounded border ${i === 0 ? "border-emerald-500 bg-emerald-500" : "border-stone-300"}`} />{x}</div>)}</div></div></MockFrame>; }
function KanbanMockup() { return <MockFrame title="Launch board"><div className="grid grid-cols-3 gap-2 p-3">{["Ideas", "In progress", "Done"].map((col, i) => <div key={col} className="rounded-xl bg-stone-100/80 p-2"><p className="mb-2 text-[9px] font-semibold">{col}</p>{Array.from({ length: i === 1 ? 2 : 3 }).map((_, j) => <div key={j} className="mb-2 rounded-lg border bg-white p-2 shadow-sm"><span className={`block h-1.5 w-7 rounded-full ${["bg-pink-400", "bg-blue-400", "bg-emerald-400"][i]}`} /><p className="mt-2 text-[8px] font-medium">{["Shape the story", "Build showcase", "Review flow"][j]}</p><div className="mt-2 flex items-center justify-between"><Clock3 className="h-2.5 w-2.5 text-amber-500" /><span className="h-4 w-4 rounded-full bg-violet-200" /></div></div>)}</div>)}</div></MockFrame>; }
function WhiteboardMockup() { return <MockFrame title="Product map"><div className="relative h-[260px] overflow-hidden bg-[radial-gradient(#d6d3d1_1px,transparent_1px)] [background-size:16px_16px]"><div className="absolute left-[38%] top-[38%] rounded-xl bg-[#a54f36] px-4 py-3 text-[10px] font-semibold text-white shadow-lg">Taskara</div><BoardNode className="left-[8%] top-[15%]" color="bg-amber-100 border-amber-300">Ideas</BoardNode><BoardNode className="right-[8%] top-[16%]" color="bg-violet-100 border-violet-300">AI</BoardNode><BoardNode className="bottom-[16%] left-[10%]" color="bg-blue-100 border-blue-300">Tasks</BoardNode><BoardNode className="bottom-[13%] right-[8%]" color="bg-emerald-100 border-emerald-300">Team</BoardNode><svg className="absolute inset-0 h-full w-full opacity-30"><path d="M90 65 L190 110 M310 65 L220 110 M95 220 L190 135 M310 220 L220 135" stroke="#78716c" strokeWidth="1.5" strokeDasharray="4 4" /></svg><MousePointer2 className="absolute right-[27%] top-[42%] h-5 w-5 fill-violet-600 text-violet-600" /></div></MockFrame>; }
function BoardNode({ children, className, color }: { children: React.ReactNode; className: string; color: string }) { return <span className={`absolute z-10 rounded-lg border px-4 py-2 text-[9px] font-semibold shadow-sm ${color} ${className}`}>{children}</span>; }
function AssistantMockup() { return <MockFrame title="AI Assistant"><div className="p-4"><div className="rounded-xl bg-violet-50 p-3 text-[10px] leading-5 text-stone-600">Plan a focused launch week and add the key tasks to my board.</div><div className="mt-3 rounded-xl border bg-white p-3 shadow-sm"><div className="flex items-center gap-2 text-[10px] font-semibold text-violet-700"><Sparkles className="h-3.5 w-3.5" />I prepared a focused plan</div><div className="mt-3 space-y-2">{["Finalize launch narrative", "Review product showcase", "Schedule launch update"].map((x) => <div key={x} className="flex items-center gap-2 rounded-lg bg-stone-50 p-2 text-[9px]"><CheckSquare className="h-3 w-3 text-blue-600" />{x}<ChevronRight className="ml-auto h-3 w-3 text-stone-300" /></div>)}</div><button className="mt-3 rounded-lg bg-[#a54f36] px-3 py-2 text-[9px] font-semibold text-white">Confirm 3 actions</button></div><div className="mt-3 flex rounded-xl border bg-white p-2"><span className="flex-1 text-[9px] text-stone-400">Ask Taskara anything...</span><Command className="h-3.5 w-3.5 text-violet-600" /></div></div></MockFrame>; }
function CollaborationMockup() { return <div className="overflow-hidden rounded-2xl border border-stone-200/80 bg-[#f7f0e6]"><MockTopbar title="Shared launch board" /><div className="grid grid-cols-[1fr_125px]"><div className="p-3"><div className="flex items-center justify-between"><p className="text-xs font-semibold">Website launch</p><div className="flex -space-x-2">{["bg-violet-500", "bg-teal-600", "bg-amber-500"].map((x) => <span key={x} className={`h-6 w-6 rounded-full border-2 border-white ${x}`} />)}</div></div><div className="mt-3 grid grid-cols-2 gap-2">{["In progress", "Ready"].map((col, i) => <div key={col} className="rounded-xl bg-white/70 p-2"><p className="text-[8px] font-semibold">{col}</p>{["Homepage copy", "Product demo"].map((x, j) => <div key={x} className="mt-2 rounded-lg border bg-white p-2 shadow-sm"><p className="text-[8px] font-medium">{x}</p><div className="mt-2 flex items-center"><MessageCircle className="h-2.5 w-2.5 text-blue-500" /><span className="ml-1 text-[7px] text-stone-400">{j + 2}</span><span className={`ml-auto h-4 w-4 rounded-full ${i ? "bg-emerald-200" : "bg-violet-200"}`} /></div></div>)}</div>)}</div></div><aside className="border-l bg-white/90 p-3"><p className="text-[9px] font-semibold">Live now</p><div className="mt-3 space-y-3">{[["Maya", "Editing copy", "bg-violet-500"], ["Jordan", "On board", "bg-teal-600"], ["Priya", "Reviewing", "bg-amber-500"]].map(([name, action, color]) => <div key={name} className="flex items-center gap-2"><span className={`h-5 w-5 rounded-full ${color}`} /><span><span className="block text-[8px] font-semibold">{name}</span><span className="block text-[7px] text-stone-400">{action}</span></span></div>)}</div></aside></div></div>; }
function MockFrame({ title, children }: { title: string; children: React.ReactNode }) { return <div className="overflow-hidden rounded-2xl border border-stone-200/80 bg-[#fbfaf8]"><MockTopbar title={title} />{children}</div>; }

function CTA({ href, children, compact = false }: { href: string; children: React.ReactNode; compact?: boolean }) { return <Link href={href} className={`inline-flex items-center justify-center gap-2 rounded-xl bg-[#a54f36] font-semibold text-white shadow-lg shadow-[#a54f36]/15 transition hover:-translate-y-0.5 hover:bg-[#91432e] hover:shadow-xl ${compact ? "h-10 px-4 text-xs" : "h-12 px-6 text-sm"}`}>{children}</Link>; }
function Logo({ small = false }: { small?: boolean }) { return <span className={`flex shrink-0 items-center justify-center rounded-xl bg-[#a54f36] text-amber-100 shadow-sm ${small ? "h-7 w-7" : "h-10 w-10"}`}><Sparkles className={small ? "h-3.5 w-3.5" : "h-4.5 w-4.5"} /></span>; }
function Glow({ className }: { className: string }) { return <div className={`pointer-events-none absolute h-96 w-96 rounded-full blur-3xl ${className}`} />; }
