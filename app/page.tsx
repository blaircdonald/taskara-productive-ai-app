"use client";

import {
  Bot,
  CalendarDays,
  CheckSquare,
  ChevronRight,
  FileText,
  LayoutDashboard,
  LibraryBig,
  PanelLeftClose,
  PanelLeftOpen,
  PenTool,
  Plus,
  Search,
  Settings,
  Sparkles,
  StickyNote,
  WandSparkles,
  type LucideIcon,
} from "lucide-react";
import { useState } from "react";

type MenuItem = {
  label: string;
  icon: LucideIcon;
  color: string;
  active?: boolean;
};

type MenuGroup = {
  label: string;
  items: MenuItem[];
};

const menuGroups: MenuGroup[] = [
  {
    label: "Workspace",
    items: [
      { label: "Dashboard", icon: LayoutDashboard, color: "#d97706", active: true },
      { label: "AI Assistant", icon: Bot, color: "#7c3aed" },
      { label: "Calendar", icon: CalendarDays, color: "#0f766e" },
      { label: "Task / Kanban", icon: CheckSquare, color: "#2563eb" },
    ],
  },
  {
    label: "Create",
    items: [
      { label: "Notes", icon: StickyNote, color: "#ca8a04" },
      { label: "Whiteboard", icon: PenTool, color: "#db2777" },
      { label: "Pages / Spaces", icon: LibraryBig, color: "#16a34a" },
      { label: "AI Template Builder", icon: WandSparkles, color: "#ea580c" },
    ],
  },
  {
    label: "System",
    items: [{ label: "Settings", icon: Settings, color: "#64748b" }],
  },
];

const stats = [
  { label: "Focus tasks", value: "12", detail: "4 due today", color: "bg-amber-100 text-amber-700" },
  { label: "Open spaces", value: "7", detail: "2 shared boards", color: "bg-emerald-100 text-emerald-700" },
  { label: "AI drafts", value: "18", detail: "5 ready to refine", color: "bg-violet-100 text-violet-700" },
];

const workspaces = [
  { title: "Product roadmap", type: "Whiteboard", progress: "68%", accent: "bg-pink-500" },
  { title: "Launch checklist", type: "Kanban", progress: "42%", accent: "bg-blue-500" },
  { title: "Meeting notes", type: "Notes", progress: "Updated 12m ago", accent: "bg-amber-500" },
];

export default function Home() {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <main className="min-h-screen bg-[var(--app-surface)] text-stone-950">
      <div className="flex min-h-screen">
        <aside
          className={`sticky top-0 flex h-screen shrink-0 flex-col border-r border-stone-200/80 bg-white/88 shadow-[8px_0_30px_rgba(120,90,60,0.08)] backdrop-blur-xl transition-[width] duration-300 ${
            collapsed ? "w-[84px]" : "w-[84px] sm:w-[280px]"
          }`}
        >
          <div className="flex h-20 items-center justify-center gap-3 border-b border-stone-200/70 px-4 sm:justify-start">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#a54f36] text-white shadow-sm">
              <Sparkles className="h-5 w-5 text-amber-100" aria-hidden="true" />
            </div>
            <div
              className={`min-w-0 transition-opacity duration-200 ${
                collapsed ? "pointer-events-none opacity-0" : "hidden opacity-0 sm:block sm:opacity-100"
              }`}
            >
              <p className="text-sm font-semibold leading-5 text-stone-950">Taskara</p>
              <p className="text-xs leading-5 text-stone-500">Focus workspace</p>
            </div>
          </div>

          <div className="flex items-center justify-center px-4 py-3 sm:justify-between">
            <span
              className={`text-xs font-medium uppercase text-stone-400 transition-opacity duration-200 ${
                collapsed ? "sr-only" : "sr-only sm:not-sr-only sm:opacity-100"
              }`}
            >
              Menu
            </span>
            <button
              type="button"
              onClick={() => setCollapsed((value) => !value)}
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-stone-200 bg-white text-stone-500 shadow-sm transition hover:border-stone-300 hover:bg-stone-50 hover:text-stone-950"
              aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
              title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {collapsed ? (
                <PanelLeftOpen className="h-4 w-4" aria-hidden="true" />
              ) : (
                <PanelLeftClose className="h-4 w-4" aria-hidden="true" />
              )}
            </button>
          </div>

          <nav className="flex-1 space-y-3 overflow-y-auto px-3 pb-3">
            {menuGroups.map((menuGroup) => (
              <div key={menuGroup.label} className="space-y-1">
                <p
                  className={`px-3 pb-1 text-[11px] font-semibold uppercase text-stone-400 ${
                    collapsed ? "sr-only" : "sr-only sm:not-sr-only"
                  }`}
                >
                  {menuGroup.label}
                </p>
                {menuGroup.items.map((item) => {
                  const Icon = item.icon;

                  return (
                    <a
                      key={item.label}
                      href="#"
                      className={`group flex h-10 items-center gap-3 rounded-xl px-3 text-sm font-medium transition ${
                        item.active
                          ? "bg-[#a54f36] text-white shadow-sm hover:bg-[#91432e]"
                          : "text-stone-600 hover:bg-stone-100 hover:text-stone-950"
                      } ${collapsed ? "justify-center" : "justify-center sm:justify-start"}`}
                      title={collapsed ? item.label : undefined}
                      aria-label={item.label}
                    >
                      <span
                        className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                          item.active ? "bg-white/14" : "bg-white shadow-sm ring-1 ring-stone-200/70"
                        }`}
                      >
                        <Icon
                          className="h-4 w-4"
                          style={{ color: item.active ? "#fef3c7" : item.color }}
                          aria-hidden="true"
                        />
                      </span>
                      <span
                        className={`min-w-0 truncate transition-opacity duration-200 ${
                          collapsed ? "sr-only" : "sr-only sm:not-sr-only sm:opacity-100"
                        }`}
                      >
                        {item.label}
                      </span>
                    </a>
                  );
                })}
              </div>
            ))}
          </nav>

          <footer className="border-t border-stone-200/70 p-3">
            <div
              className={`flex items-center gap-3 rounded-xl bg-stone-100/80 p-3 ${
                collapsed ? "justify-center" : "justify-center sm:justify-start"
              }`}
            >
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-600 text-sm font-semibold text-white">
                BD
              </div>
              <div
                className={`min-w-0 transition-opacity duration-200 ${
                  collapsed ? "sr-only" : "sr-only sm:not-sr-only sm:opacity-100"
                }`}
              >
                <p className="truncate text-sm font-medium text-stone-900">Blair&apos;s Space</p>
                <p className="truncate text-xs text-stone-500">Personal workspace</p>
              </div>
            </div>
          </footer>
        </aside>

        <section className="min-w-0 flex-1 overflow-hidden">
          <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-5 py-5 sm:px-7 lg:px-9">
            <header className="flex flex-col gap-4 rounded-2xl border border-stone-200/80 bg-white/78 p-4 shadow-[0_20px_60px_rgba(120,90,60,0.08)] backdrop-blur md:flex-row md:items-center md:justify-between">
              <div className="min-w-0">
                <p className="text-sm font-medium text-amber-700">Good morning, Blair</p>
                <h1 className="mt-1 text-2xl font-semibold text-stone-950 sm:text-3xl">
                  Your ideas, boards, and tasks in one calm place.
                </h1>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <label className="flex h-11 min-w-0 items-center gap-2 rounded-xl border border-stone-200 bg-white px-3 text-stone-500 shadow-sm sm:w-72">
                  <Search className="h-4 w-4 shrink-0 text-stone-400" aria-hidden="true" />
                  <input
                    className="min-w-0 flex-1 bg-transparent text-sm text-stone-900 outline-none placeholder:text-stone-400"
                    placeholder="Search workspace"
                    type="search"
                  />
                </label>
                <button
                  type="button"
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#a54f36] px-4 text-sm font-medium text-white shadow-sm transition hover:bg-[#91432e]"
                >
                  <Plus className="h-4 w-4 text-amber-100" aria-hidden="true" />
                  New
                </button>
              </div>
            </header>

            <div className="grid gap-4 md:grid-cols-3">
              {stats.map((stat) => (
                <article
                  key={stat.label}
                  className="rounded-2xl border border-stone-200/80 bg-white/82 p-5 shadow-[0_16px_45px_rgba(120,90,60,0.07)]"
                >
                  <div className="flex items-center justify-between gap-4">
                    <p className="text-sm font-medium text-stone-500">{stat.label}</p>
                    <span className={`rounded-lg px-2.5 py-1 text-xs font-medium ${stat.color}`}>
                      Live
                    </span>
                  </div>
                  <p className="mt-5 text-3xl font-semibold text-stone-950">{stat.value}</p>
                  <p className="mt-1 text-sm text-stone-500">{stat.detail}</p>
                </article>
              ))}
            </div>

            <div className="grid gap-5 lg:grid-cols-[1.15fr_0.85fr]">
              <section className="rounded-2xl border border-stone-200/80 bg-white/82 p-5 shadow-[0_16px_45px_rgba(120,90,60,0.07)]">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-stone-500">Workspace map</p>
                    <h2 className="mt-1 text-xl font-semibold text-stone-950">Recently touched</h2>
                  </div>
                  <button
                    type="button"
                    className="flex h-9 w-9 items-center justify-center rounded-lg border border-stone-200 bg-white text-stone-500 transition hover:bg-stone-50 hover:text-stone-950"
                    aria-label="Open workspace map"
                    title="Open workspace map"
                  >
                    <ChevronRight className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>

                <div className="mt-5 grid gap-3">
                  {workspaces.map((workspace) => (
                    <a
                      key={workspace.title}
                      href="#"
                      className="flex items-center gap-4 rounded-xl border border-stone-200/70 bg-stone-50/70 p-4 transition hover:border-stone-300 hover:bg-white"
                    >
                      <span className={`h-10 w-2 rounded-full ${workspace.accent}`} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-stone-950">
                          {workspace.title}
                        </p>
                        <p className="mt-1 truncate text-xs text-stone-500">{workspace.type}</p>
                      </div>
                      <span className="shrink-0 rounded-lg bg-white px-3 py-1 text-xs font-medium text-stone-600 shadow-sm ring-1 ring-stone-200/70">
                        {workspace.progress}
                      </span>
                    </a>
                  ))}
                </div>
              </section>

              <section className="rounded-2xl border border-stone-200/80 bg-[#fff8ed] p-5 shadow-[0_16px_45px_rgba(120,90,60,0.07)]">
                <div className="flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-100 text-violet-700">
                    <Sparkles className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <div>
                    <p className="text-sm font-medium text-stone-500">AI Assistant</p>
                    <h2 className="text-xl font-semibold text-stone-950">Ready to shape the day</h2>
                  </div>
                </div>
                <div className="mt-5 rounded-xl border border-amber-200/70 bg-white/72 p-4">
                  <p className="text-sm leading-6 text-stone-600">
                    Turn scattered notes into a project plan, summarize a board, or draft a template
                    from your current workspace context.
                  </p>
                  <button
                    type="button"
                    className="mt-4 inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-amber-500 px-4 text-sm font-medium text-stone-950 transition hover:bg-amber-400"
                  >
                    <FileText className="h-4 w-4" aria-hidden="true" />
                    Draft from notes
                  </button>
                </div>
              </section>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
