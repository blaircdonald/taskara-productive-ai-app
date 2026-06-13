"use client";

import {
  ArrowRight, Bell, Bot, CalendarDays, CheckCircle2, CheckSquare, Clock3, FileText, LayoutDashboard,
  LayoutTemplate, Lightbulb, ListTodo, PenTool, Plus, Sparkles, StickyNote, TriangleAlert,
} from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";
import type { DashboardData } from "@/lib/dashboard";

const featureStyles = {
  calendar: ["bg-teal-100 text-teal-700", CalendarDays],
  kanban: ["bg-blue-100 text-blue-700", LayoutDashboard],
  notes: ["bg-amber-100 text-amber-700", StickyNote],
  whiteboard: ["bg-pink-100 text-pink-700", PenTool],
  assistant: ["bg-violet-100 text-violet-700", Bot],
  templates: ["bg-orange-100 text-orange-700", LayoutTemplate],
} as const;

const activityIcons = { calendar: CalendarDays, kanban: CheckSquare, notes: StickyNote, whiteboard: PenTool, spaces: FileText, assistant: Bot } as const;
const workIcons = { Note: StickyNote, Whiteboard: PenTool, "Kanban board": LayoutDashboard, Page: FileText } as const;
const dateKey = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

export function DashboardWorkspace({ data }: { data: DashboardData }) {
  const metrics = useMemo(() => {
    const today = dateKey(new Date());
    const completed = data.tasks.filter((task) => task.completed).length;
    const pending = data.tasks.length - completed;
    const overdue = data.tasks.filter((task) => !task.completed && task.dueDate < today).length;
    const dueToday = data.tasks.filter((task) => !task.completed && task.dueDate === today).length;
    const upcoming = data.calendar.filter((item) => item.scheduledDate && item.scheduledDate >= today).slice(0, 6);
    const todayReminders = data.calendar.filter((item) => item.kind === "reminder" && item.scheduledDate === today).length;
    return { today, completed, pending, overdue, dueToday, upcoming, todayReminders, percentage: data.tasks.length ? Math.round(completed / data.tasks.length * 100) : 0 };
  }, [data]);

  const activeFeature = [
    ["Notes", data.counts.notes], ["Kanban", data.counts.tasks], ["Calendar", data.counts.calendar], ["Whiteboards", data.counts.whiteboards],
  ].sort((a, b) => Number(b[1]) - Number(a[1]))[0]?.[0] ?? "your workspace";
  const insights = [
    metrics.overdue ? `You have ${metrics.overdue} overdue ${metrics.overdue === 1 ? "task" : "tasks"}.` : "No overdue tasks. Your plan is on track.",
    data.tasks.length ? `You have completed ${metrics.percentage}% of your accessible tasks.` : "Create your first task to start tracking progress.",
    metrics.todayReminders ? `You have ${metrics.todayReminders} ${metrics.todayReminders === 1 ? "reminder" : "reminders"} today.` : "No reminders are scheduled for today.",
    `Your most active workspace is ${activeFeature}.`,
    metrics.overdue ? "Suggested focus: finish overdue high-priority tasks first." : metrics.dueToday ? "Suggested focus: clear today's tasks before planning ahead." : "Suggested focus: choose one meaningful next task.",
  ];

  const features = [
    { key: "calendar", name: "Calendar", href: "/calendar", status: "Active", stat: `${data.counts.calendar} items`, detail: `${metrics.upcoming.length} upcoming` },
    { key: "kanban", name: "Kanban / Tasks", href: "/kanban", status: "Active", stat: `${data.counts.tasks} tasks`, detail: `${data.counts.boards} boards` },
    { key: "notes", name: "Notes", href: "/notes", status: "Active", stat: `${data.counts.notes} notes`, detail: "Your thinking space" },
    { key: "whiteboard", name: "Whiteboard", href: "/whiteboard", status: "Active", stat: `${data.counts.whiteboards} boards`, detail: "Visual ideas" },
    { key: "assistant", name: "AI Assistant", href: "/assistant", status: data.aiStatus === "ready" ? "Ready" : data.aiStatus === "disabled" ? "Disabled" : "Setup required", stat: `${data.counts.threads} chats`, detail: `${data.counts.assistantActions} actions` },
    { key: "templates", name: "AI Template Builder", href: "", status: "Coming soon", stat: "Not available", detail: "In development" },
  ] as const;
  const quickActions = [
    ["Create Task", "/kanban?create=task", CheckSquare, "bg-blue-100 text-blue-700"],
    ["Add Calendar Reminder", "/calendar?create=reminder", Bell, "bg-teal-100 text-teal-700"],
    ["Create Note", "/notes?create=1", StickyNote, "bg-amber-100 text-amber-700"],
    ["Open Whiteboard", "/whiteboard?create=1", PenTool, "bg-pink-100 text-pink-700"],
    ["Ask AI Assistant", "/assistant?prompt=Help me plan my next focused work session", Bot, "bg-violet-100 text-violet-700"],
  ] as const;

  return <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-6 px-4 py-5 sm:px-7 lg:px-9">
    <header className="overflow-hidden rounded-3xl border border-stone-200/80 bg-gradient-to-br from-white/95 via-[#fffaf1] to-amber-100/60 p-6 shadow-[0_20px_60px_rgba(120,90,60,0.09)] sm:p-8">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between"><div><p className="flex items-center gap-2 text-sm font-semibold text-amber-700"><Sparkles className="h-4 w-4" />Welcome back, {data.user.firstName}</p><h1 className="mt-2 max-w-3xl text-3xl font-semibold tracking-tight sm:text-4xl">A calm view of everything moving forward.</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-stone-600">Your tasks, ideas, reminders, and recent work are gathered here from across Taskara.</p></div><Link href="/calendar" className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#a54f36] px-5 text-sm font-semibold text-white shadow-sm hover:bg-[#91432e]"><CalendarDays className="h-4 w-4" />Plan your day</Link></div>
    </header>

    <Section title="App overview" detail="Live status from your workspace">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">{features.map((feature) => {
        const [style, Icon] = featureStyles[feature.key];
        const content = <article className={`h-full rounded-2xl border border-stone-200/80 bg-white/85 p-4 shadow-[0_12px_35px_rgba(120,90,60,0.06)] transition ${feature.href ? "hover:-translate-y-0.5 hover:shadow-md" : "opacity-75"}`}><div className="flex items-start justify-between gap-3"><span className={`flex h-11 w-11 items-center justify-center rounded-xl ${style}`}><Icon className="h-5 w-5" /></span><span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${feature.status === "Coming soon" ? "bg-stone-100 text-stone-500" : feature.status === "Ready" || feature.status === "Active" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>{feature.status}</span></div><h3 className="mt-4 font-semibold">{feature.name}</h3><div className="mt-3 flex items-end justify-between"><p className="text-xl font-semibold">{feature.stat}</p><p className="text-xs text-stone-500">{feature.detail}</p></div></article>;
        return feature.href ? <Link key={feature.key} href={feature.href}>{content}</Link> : <div key={feature.key}>{content}</div>;
      })}</div>
    </Section>

    <Section title="Quick access" detail="Start something without hunting for it">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">{quickActions.map(([label, href, Icon, style]) => <Link key={label} href={href} className="flex min-h-24 items-center gap-3 rounded-2xl border border-stone-200/80 bg-white/85 p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"><span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${style}`}><Icon className="h-5 w-5" /></span><span className="text-sm font-semibold">{label}</span></Link>)}<button disabled className="flex min-h-24 items-center gap-3 rounded-2xl border border-dashed border-stone-300 bg-white/45 p-4 text-left opacity-65"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-100 text-orange-700"><LayoutTemplate className="h-5 w-5" /></span><span><span className="block text-sm font-semibold">Generate AI Template</span><span className="text-xs text-stone-500">Coming soon</span></span></button></div>
    </Section>

    <div className="grid gap-5 xl:grid-cols-[1.15fr_.85fr]">
      <Card title="Task summary" icon={ListTodo} action={<Link href="/kanban" className="text-xs font-semibold text-[#a54f36]">Open Kanban</Link>}>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">{[
          ["Total", data.tasks.length, "text-stone-700"], ["Completed", metrics.completed, "text-emerald-700"], ["Pending", metrics.pending, "text-blue-700"], ["Overdue", metrics.overdue, "text-rose-700"],
        ].map(([label, value, color]) => <div key={String(label)} className="rounded-xl bg-stone-50 p-3"><p className="text-xs text-stone-500">{label}</p><p className={`mt-1 text-2xl font-semibold ${color}`}>{value}</p></div>)}</div>
        <div className="mt-5"><div className="mb-2 flex justify-between text-xs"><span className="font-medium text-stone-600">Overall progress</span><span className="font-semibold text-emerald-700">{metrics.percentage}%</span></div><div className="h-3 overflow-hidden rounded-full bg-stone-100"><div className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all" style={{ width: `${metrics.percentage}%` }} /></div></div>
        {!data.tasks.length && <Empty icon={CheckSquare} text="No tasks yet. Create one to begin tracking progress." href="/kanban?create=task" label="Create task" />}
      </Card>
      <Card title="AI Insights" icon={Lightbulb}><div className="space-y-2">{insights.map((insight, index) => <div key={insight} className="flex gap-3 rounded-xl bg-gradient-to-r from-violet-50/80 to-amber-50/60 p-3"><span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-white text-violet-600 shadow-sm">{index === 0 && metrics.overdue ? <TriangleAlert className="h-3.5 w-3.5" /> : <Sparkles className="h-3.5 w-3.5" />}</span><p className="text-sm leading-5 text-stone-700">{insight}</p></div>)}</div></Card>
    </div>

    <div className="grid gap-5 xl:grid-cols-2">
      <Card title="Upcoming calendar" icon={CalendarDays} action={<Link href="/calendar" className="text-xs font-semibold text-[#a54f36]">View calendar</Link>}>
        {metrics.upcoming.length ? <div className="space-y-2">{metrics.upcoming.map((item) => <Link href="/calendar" key={item.id} className="flex items-center gap-3 rounded-xl border border-stone-100 p-3 hover:bg-stone-50"><span className="h-9 w-1 rounded-full" style={{ backgroundColor: item.categoryColor }} /><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-stone-100">{item.kind === "reminder" ? <Bell className="h-4 w-4 text-violet-600" /> : <CheckSquare className="h-4 w-4 text-blue-600" />}</span><span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium">{item.title}</span><span className="mt-0.5 block text-xs text-stone-500">{formatDate(item.scheduledDate!)}{item.scheduledTime ? ` at ${item.scheduledTime.slice(0, 5)}` : ""} · {item.categoryName}</span></span><span className="rounded-full bg-stone-100 px-2 py-1 text-[10px] font-semibold capitalize text-stone-600">{item.kind}</span></Link>)}</div> : <Empty icon={CalendarDays} text="Nothing scheduled ahead. Add a reminder when you are ready." href="/calendar?create=reminder" label="Add reminder" />}
      </Card>
      <Card title="Recent activity" icon={Clock3}>
        {data.activity.length ? <div className="space-y-2">{data.activity.slice(0, 7).map((item) => {
          const Icon = activityIcons[item.feature as keyof typeof activityIcons] ?? Sparkles;
          const row = <div className="flex items-center gap-3 rounded-xl border border-stone-100 p-3 hover:bg-stone-50"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-stone-100 text-[#a54f36]"><Icon className="h-4 w-4" /></span><span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium capitalize">{item.action} {item.title}</span><span className="text-xs capitalize text-stone-500">{item.feature} · {relativeTime(item.createdAt)}</span></span>{item.href && <ArrowRight className="h-4 w-4 text-stone-300" />}</div>;
          return item.href ? <Link key={item.id} href={item.href}>{row}</Link> : <div key={item.id}>{row}</div>;
        })}</div> : <Empty icon={Clock3} text="Your next create or update action will appear here." />}
      </Card>
    </div>

    <Card title="Recent pages and work" icon={FileText}>
      {data.recentWork.length ? <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">{data.recentWork.map((item) => {
        const Icon = workIcons[item.type as keyof typeof workIcons] ?? FileText;
        return <Link href={item.href} key={`${item.type}-${item.id}`} className="rounded-2xl border border-stone-200/80 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"><span className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ backgroundColor: `${item.color}18`, color: item.color }}><Icon className="h-5 w-5" /></span><p className="mt-3 truncate text-sm font-semibold">{item.title}</p><p className="mt-1 text-xs text-stone-500">{item.type} · {relativeTime(item.updatedAt)}</p></Link>;
      })}</div> : <Empty icon={FileText} text="Recently updated notes, boards, and pages will collect here." href="/notes?create=1" label="Create note" />}
    </Card>
  </div>;
}

function Section({ title, detail, children }: { title: string; detail: string; children: React.ReactNode }) { return <section><div className="mb-3"><h2 className="text-lg font-semibold">{title}</h2><p className="text-xs text-stone-500">{detail}</p></div>{children}</section>; }
function Card({ title, icon: Icon, action, children }: { title: string; icon: React.ElementType; action?: React.ReactNode; children: React.ReactNode }) { return <section className="rounded-2xl border border-stone-200/80 bg-white/85 p-5 shadow-[0_16px_45px_rgba(120,90,60,0.07)]"><div className="mb-4 flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-amber-700"><Icon className="h-5 w-5" /></span><h2 className="flex-1 font-semibold">{title}</h2>{action}</div>{children}</section>; }
function Empty({ icon: Icon, text, href, label }: { icon: React.ElementType; text: string; href?: string; label?: string }) { return <div className="mt-3 rounded-xl border border-dashed border-stone-300 p-6 text-center"><Icon className="mx-auto h-6 w-6 text-stone-400" /><p className="mt-2 text-sm text-stone-500">{text}</p>{href && <Link href={href} className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-[#a54f36]">{label}<Plus className="h-3.5 w-3.5" /></Link>}</div>; }
function formatDate(value: string) { const [year, month, day] = value.split("-").map(Number); return new Date(year, month - 1, day).toLocaleDateString(undefined, { month: "short", day: "numeric", year: year !== new Date().getFullYear() ? "numeric" : undefined }); }
function relativeTime(value: string) { const seconds = Math.max(1, Math.floor((Date.now() - new Date(value).getTime()) / 1000)); if (seconds < 60) return "just now"; if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`; if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`; if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`; return new Date(value).toLocaleDateString(); }
