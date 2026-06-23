"use client";

import { useUser } from "@clerk/nextjs";
import {
  Bot,
  CalendarDays,
  CheckSquare,
  LayoutDashboard,
  LibraryBig,
  PanelLeftClose,
  PanelLeftOpen,
  PenTool,
  Settings,
  Sparkles,
  StickyNote,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { applyTheme } from "@/lib/theme-client";

type NavItem = { label: string; href: string; icon: LucideIcon; color: string };

const groups: { label: string; items: NavItem[] }[] = [
  {
    label: "Workspace",
    items: [
      { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard, color: "#d97706" },
      { label: "AI Assistant", href: "/assistant", icon: Bot, color: "#7c3aed" },
      { label: "Calendar", href: "/calendar", icon: CalendarDays, color: "#0f766e" },
      { label: "Task / Kanban", href: "/kanban", icon: CheckSquare, color: "#2563eb" },
    ],
  },
  {
    label: "Create",
    items: [
      { label: "Notes", href: "/notes", icon: StickyNote, color: "#ca8a04" },
      { label: "Whiteboard", href: "/whiteboard", icon: PenTool, color: "#db2777" },
      { label: "Pages / Spaces", href: "/spaces", icon: LibraryBig, color: "#7c3aed" },
    ],
  },
  { label: "System", items: [{ label: "Settings", href: "/settings", icon: Settings, color: "#64748b" }] },
];

function getInitials(name: string) {
  const initials = name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("");

  return initials || "TS";
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const { isLoaded, user } = useUser();
  const emailName = user?.primaryEmailAddress?.emailAddress.split("@")[0];
  const spaceOwnerName = user?.fullName || user?.firstName || user?.username || emailName;
  const spaceName = isLoaded && user && spaceOwnerName ? `${spaceOwnerName}'s Space` : "Personal Space";
  const avatarInitials = getInitials(user?.fullName || user?.username || emailName || "Taskara Space");
  const avatarUrl = user?.imageUrl;

  useEffect(() => {
    let theme = "light";
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const syncSystem = () => { if (theme === "system") applyTheme(theme); };
    fetch("/api/settings/preferences").then((response) => response.ok ? response.json() : null).then((data) => {
      theme = data?.theme || "light";
      applyTheme(theme);
    }).catch(() => applyTheme(theme));
    media.addEventListener("change", syncSystem);
    return () => media.removeEventListener("change", syncSystem);
  }, []);

  return (
    <main className="min-h-screen bg-[var(--app-surface)] text-stone-950">
      <div className="flex min-h-screen">
        <aside className={`sticky top-0 z-30 flex h-screen shrink-0 flex-col border-r border-stone-200/80 bg-white/88 shadow-[8px_0_30px_rgba(120,90,60,0.08)] backdrop-blur-xl transition-[width] duration-300 ${collapsed ? "w-[68px] sm:w-[84px]" : "w-[68px] sm:w-[280px]"}`}>
          <div className="flex h-20 items-center justify-center gap-3 border-b border-stone-200/70 px-3 sm:justify-start sm:px-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#a54f36] text-white shadow-sm"><Sparkles className="h-5 w-5 text-amber-100" /></div>
            {!collapsed && <div className="hidden min-w-0 sm:block"><p className="text-sm font-semibold">Taskara</p><p className="text-xs text-stone-500">Focus workspace</p></div>}
          </div>
          <div className="flex justify-center px-3 py-3 sm:justify-end">
            <button type="button" onClick={() => setCollapsed((value) => !value)} className="flex h-9 w-9 items-center justify-center rounded-lg border border-stone-200 bg-white text-stone-500 shadow-sm hover:bg-stone-50" aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}>
              {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
            </button>
          </div>
          <nav className="scrollbar-hidden flex-1 space-y-3 overflow-y-auto px-3 pb-3">
            {groups.map((group) => <div key={group.label} className="space-y-1">
              {!collapsed && <p className="sr-only px-3 pb-1 text-[11px] font-semibold uppercase text-stone-400 sm:not-sr-only">{group.label}</p>}
              {group.items.map((item) => {
                const active = item.href !== "#" && (pathname === item.href || (item.href !== "/" && pathname.startsWith(`${item.href}/`)));
                const Icon = item.icon;
                return <Link key={item.label} href={item.href} title={item.label} aria-label={item.label} className={`group flex h-10 items-center gap-3 rounded-xl px-3 text-sm font-medium transition ${active ? "bg-[#a54f36] text-white shadow-sm" : "text-stone-600 hover:bg-stone-100 hover:text-stone-950"} ${collapsed ? "justify-center" : "justify-center sm:justify-start"}`}>
                  <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${active ? "bg-white/14" : "bg-white shadow-sm ring-1 ring-stone-200/70"}`}><Icon className="h-4 w-4" style={{ color: active ? "#ffffff" : item.color }} /></span>
                  {!collapsed && <span className="sr-only min-w-0 truncate sm:not-sr-only">{item.label}</span>}
                </Link>;
              })}
            </div>)}
          </nav>
          <footer className="border-t border-stone-200/70 p-3"><div className="flex items-center justify-center gap-3 rounded-xl bg-stone-100/80 p-3 sm:justify-start">{avatarUrl ? <img src={avatarUrl} alt={`${spaceName} avatar`} className="h-9 w-9 shrink-0 rounded-lg object-cover ring-1 ring-white/80" /> : <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-600 text-sm font-semibold text-white">{avatarInitials}</div>}{!collapsed && <div className="hidden min-w-0 sm:block"><p className="truncate text-sm font-medium">{spaceName}</p><p className="truncate text-xs text-stone-500">Personal workspace</p></div>}</div></footer>
        </aside>
        <section className="min-w-0 flex-1 overflow-hidden">{children}</section>
      </div>
    </main>
  );
}
