"use client";

import { UserProfile } from "@clerk/nextjs";
import {
  Bell, Bookmark, Briefcase, CalendarDays, Check, Circle, Download, Flag, Folder, Heart, Home,
  Lightbulb, Lock, Palette, Pencil, Plus, Save, ShieldCheck, Sparkles, Star, Tag, Trash2, UserRound, WalletCards, X,
} from "lucide-react";
import { useEffect, useMemo, useState, useTransition, type ComponentType } from "react";
import type { TaskCategory, UserSettings } from "@/db";
import { aiBehaviors, aiModels, aiTones, categoryIcons, categoryScopes } from "@/lib/settings-options";
import { applyTheme } from "@/lib/theme-client";
import { createCategory, deleteCategory, updateCategory, updatePreferences } from "./actions";

type Section = "profile" | "subscription" | "categories" | "ai" | "preferences" | "privacy";
type CategoryScope = typeof categoryScopes[number];
type IconComponent = ComponentType<{ className?: string }>;
const iconMap: Record<string, IconComponent> = { tag: Tag, "calendar-days": CalendarDays, bell: Bell, briefcase: Briefcase, home: Home, heart: Heart, star: Star, bookmark: Bookmark, flag: Flag, lightbulb: Lightbulb, folder: Folder, circle: Circle };
const scopeLabels: Record<CategoryScope, string> = { calendar: "Calendar", kanban: "Tasks / Kanban", notes: "Notes", reminders: "Reminders" };
const nav: { id: Section; label: string; icon: IconComponent }[] = [
  { id: "profile", label: "Profile", icon: UserRound }, { id: "subscription", label: "Subscription", icon: WalletCards },
  { id: "categories", label: "Categories", icon: Tag }, { id: "ai", label: "AI settings", icon: Sparkles },
  { id: "preferences", label: "Preferences", icon: Palette }, { id: "privacy", label: "Privacy & security", icon: ShieldCheck },
];

export function SettingsWorkspace({ profile, settings, categories: initialCategories, usage }: {
  profile: { name: string; email: string; avatarUrl: string };
  settings: UserSettings;
  categories: TaskCategory[];
  usage: Record<string, number>;
}) {
  const [section, setSection] = useState<Section>("profile");
  const [values, setValues] = useState(settings);
  const [categories, setCategories] = useState(initialCategories);
  const [scope, setScope] = useState<CategoryScope>("calendar");
  const [editing, setEditing] = useState<TaskCategory | null | undefined>(undefined);
  const [accountOpen, setAccountOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [pending, startTransition] = useTransition();
  useEffect(() => { if (!message) return; const timer = window.setTimeout(() => setMessage(""), 4500); return () => clearTimeout(timer); }, [message]);
  const save = () => startTransition(async () => {
    try { await updatePreferences(values); setMessage("Settings saved."); }
    catch (error) { setMessage(error instanceof Error ? error.message : "Could not save settings."); }
  });
  const scoped = useMemo(() => categories.filter((category) => category.scope === scope), [categories, scope]);
  const set = <K extends keyof UserSettings>(key: K, value: UserSettings[K]) => setValues((current) => ({ ...current, [key]: value }));

  return <div className="mx-auto w-full max-w-[1500px] px-3 py-4 sm:px-5 lg:px-7">
    {message && <button onClick={() => setMessage("")} className="fixed bottom-5 right-5 z-[120] max-w-sm rounded-xl bg-stone-900 px-4 py-3 text-left text-sm text-white shadow-xl">{message}</button>}
    <header className="mb-5 rounded-2xl border border-stone-200/80 bg-white/82 p-5 shadow-[0_16px_50px_rgba(120,90,60,0.08)]">
      <p className="text-sm font-medium text-[#a54f36]">Make Taskara feel like yours</p><h1 className="mt-1 text-3xl font-semibold">Settings</h1>
    </header>
    <div className="grid min-w-0 gap-5 lg:grid-cols-[245px_minmax(0,1fr)]">
      <nav className="flex gap-2 overflow-x-auto rounded-2xl border border-stone-200/80 bg-white/78 p-2 lg:sticky lg:top-5 lg:block lg:self-start lg:overflow-visible">
        {nav.map((item) => <button key={item.id} onClick={() => setSection(item.id)} className={`flex h-11 shrink-0 items-center gap-3 rounded-xl px-3 text-sm font-medium lg:mb-1 lg:w-full ${section === item.id ? "bg-[#a54f36] text-white shadow-sm" : "text-stone-600 hover:bg-stone-100"}`}><item.icon className="h-4 w-4" />{item.label}</button>)}
      </nav>
      <main className="min-w-0 space-y-5">
        {section === "profile" && <SectionCard icon={UserRound} title="Profile" detail="Your identity across Taskara.">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center"><img src={profile.avatarUrl} alt="" className="h-20 w-20 rounded-2xl object-cover ring-4 ring-amber-100" /><div className="min-w-0 flex-1"><h2 className="truncate text-xl font-semibold">{profile.name}</h2><p className="mt-1 truncate text-sm text-stone-500">{profile.email}</p></div><button onClick={() => setAccountOpen(true)} className={primaryButton}><Pencil className="h-4 w-4" />Manage account</button></div>
        </SectionCard>}
        {section === "subscription" && <SectionCard icon={WalletCards} title="Subscription" detail="Your current plan and product usage.">
          <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-5"><div className="flex flex-wrap items-start justify-between gap-3"><div><span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700">Active</span><h2 className="mt-3 text-2xl font-semibold">Free plan</h2><p className="mt-1 text-sm text-stone-500">No renewal date. Enjoy the core Taskara workspace.</p></div><button disabled className={`${primaryButton} opacity-50`}>Upgrade coming soon</button></div></div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">{Object.entries(usage).map(([label, value]) => <div key={label} className="rounded-xl border border-stone-200 bg-white p-4"><p className="text-2xl font-semibold">{value}</p><p className="mt-1 text-xs capitalize text-stone-500">{label}</p></div>)}</div>
        </SectionCard>}
        {section === "categories" && <SectionCard icon={Tag} title="Categories" detail="Create a separate category library for each part of your workspace.">
          <div className="flex gap-2 overflow-x-auto pb-2">{categoryScopes.map((item) => <button key={item} onClick={() => setScope(item)} className={`h-10 shrink-0 rounded-xl px-3 text-sm font-medium ${scope === item ? "bg-stone-900 text-white" : "bg-stone-100 text-stone-600"}`}>{scopeLabels[item]}</button>)}</div>
          <div className="mt-4 grid gap-3">{scoped.map((category) => <CategoryRow key={category.id} category={category} onEdit={() => setEditing(category)} onDelete={() => {
            if (!confirm(`Delete "${category.name}"?`)) return;
            startTransition(async () => { try { await deleteCategory(category.id); setCategories((current) => current.filter((item) => item.id !== category.id)); setMessage("Category deleted."); } catch (error) { setMessage(error instanceof Error ? error.message : "Could not delete category."); } });
          }} />)}{!scoped.length && <p className="rounded-xl border border-dashed border-stone-300 p-8 text-center text-sm text-stone-500">No {scopeLabels[scope].toLowerCase()} categories yet.</p>}</div>
          <button onClick={() => setEditing(null)} className={`mt-4 ${primaryButton}`}><Plus className="h-4 w-4" />New category</button>
        </SectionCard>}
        {section === "ai" && <SectionCard icon={Sparkles} title="AI settings" detail="Choose how Taskara's available AI features respond.">
          <div className="grid gap-4 md:grid-cols-3"><Select label="Preferred model" value={values.aiModel} options={aiModels} onChange={(value) => set("aiModel", value)} /><Select label="Default behavior" value={values.aiBehavior} options={aiBehaviors} onChange={(value) => set("aiBehavior", value)} /><Select label="Response tone" value={values.aiTone} options={aiTones} onChange={(value) => set("aiTone", value)} /></div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2"><Toggle label="AI Refine" detail="Rewrite selected note text." checked={values.aiRefineEnabled} onChange={(value) => set("aiRefineEnabled", value)} /><Toggle label="AI Diagram" detail="Generate diagrams on whiteboards." checked={values.aiDiagramEnabled} onChange={(value) => set("aiDiagramEnabled", value)} /><Toggle label="AI Assistant" detail="Coming soon" checked={false} disabled onChange={() => {}} /><Toggle label="AI Template Builder" detail="Coming soon" checked={false} disabled onChange={() => {}} /></div><SaveButton pending={pending} onClick={save} />
        </SectionCard>}
        {section === "preferences" && <SectionCard icon={Palette} title="App preferences" detail="Set useful defaults for your daily workflow.">
          <div className="grid gap-4 md:grid-cols-3"><Select label="Theme" value={values.theme} options={["system", "light", "dark"]} onChange={(value) => { set("theme", value); applyTheme(value); }} /><Select label="Default calendar view" value={values.defaultCalendarView} options={["month", "week"]} onChange={(value) => set("defaultCalendarView", value)} /><Select label="Default task priority" value={values.defaultTaskPriority} options={["low", "medium", "high"]} onChange={(value) => set("defaultTaskPriority", value)} /></div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2"><Toggle label="Note auto-save" detail="Save notes while you type." checked={values.noteAutoSave} onChange={(value) => set("noteAutoSave", value)} /><Toggle label="Reminder notifications" detail="Receive reminder updates." checked={values.notifyReminders} onChange={(value) => set("notifyReminders", value)} /><Toggle label="Daily summary" detail="Receive a daily planning summary." checked={values.notifyDailySummary} onChange={(value) => set("notifyDailySummary", value)} /><Toggle label="Collaboration updates" detail="Receive shared workspace updates." checked={values.notifyCollaboration} onChange={(value) => set("notifyCollaboration", value)} /></div><SaveButton pending={pending} onClick={save} />
        </SectionCard>}
        {section === "privacy" && <SectionCard icon={ShieldCheck} title="Privacy & security" detail="Control account security, AI processing, and your data.">
          <div className="grid gap-3"><Toggle label="Allow AI processing" detail="Required for all Gemini-powered features." checked={values.aiProcessingEnabled} onChange={(value) => set("aiProcessingEnabled", value)} /><Action icon={Lock} title="Account security" detail="Manage passwords, connected accounts, and active sessions with Clerk." button="Open security" onClick={() => setAccountOpen(true)} /><Action icon={Download} title="Export your data" detail="Download an owner-scoped JSON archive of your Taskara workspace." button="Download JSON" href="/api/settings/export" /></div><SaveButton pending={pending} onClick={save} />
        </SectionCard>}
      </main>
    </div>
    {editing !== undefined && <CategoryDialog category={editing} scope={scope} pending={pending} onClose={() => setEditing(undefined)} onSave={(input) => startTransition(async () => {
      try {
        if (editing) { await updateCategory(editing.id, input); setCategories((current) => current.map((item) => item.id === editing.id ? { ...item, ...input } : item)); }
        else { const created = await createCategory(input); setCategories((current) => [...current, created]); }
        setEditing(undefined); setMessage(editing ? "Category updated." : "Category created.");
      } catch (error) { setMessage(error instanceof Error ? error.message : "Could not save category."); }
    })} />}
    {accountOpen && <div className="fixed inset-0 z-[130] overflow-y-auto bg-stone-950/45 p-3 backdrop-blur-sm"><button onClick={() => setAccountOpen(false)} aria-label="Close account settings" className="fixed right-5 top-5 z-[140] flex h-10 w-10 items-center justify-center rounded-xl bg-white shadow-lg"><X className="h-4 w-4" /></button><div className="mx-auto mt-12 w-fit"><UserProfile routing="hash" /></div></div>}
  </div>;
}

function SectionCard({ icon: Icon, title, detail, children }: { icon: IconComponent; title: string; detail: string; children: React.ReactNode }) { return <section className="min-w-0 rounded-2xl border border-stone-200/80 bg-white/84 p-5 shadow-[0_16px_50px_rgba(120,90,60,0.07)] sm:p-6"><div className="mb-6 flex items-start gap-3"><span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-[#a54f36]"><Icon className="h-5 w-5" /></span><div><h2 className="text-xl font-semibold">{title}</h2><p className="mt-1 text-sm text-stone-500">{detail}</p></div></div>{children}</section>; }
function CategoryRow({ category, onEdit, onDelete }: { category: TaskCategory; onEdit: () => void; onDelete: () => void }) { const Icon = iconMap[category.icon] || Tag; return <div className="flex min-w-0 items-center gap-3 rounded-xl border border-stone-200 bg-white p-3"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl" style={{ color: category.color, backgroundColor: `${category.color}18` }}><Icon className="h-4 w-4" /></span><span className="min-w-0 flex-1 truncate text-sm font-medium">{category.name}</span><button onClick={onEdit} className={iconButton}><Pencil className="h-4 w-4" /></button><button onClick={onDelete} className={`${iconButton} text-rose-600`}><Trash2 className="h-4 w-4" /></button></div>; }
function Toggle({ label, detail, checked, onChange, disabled = false }: { label: string; detail: string; checked: boolean; onChange: (value: boolean) => void; disabled?: boolean }) { return <label className={`flex items-center gap-4 rounded-xl border border-stone-200 bg-white p-4 ${disabled ? "opacity-50" : ""}`}><span className="min-w-0 flex-1"><span className="block text-sm font-medium">{label}</span><span className="mt-1 block text-xs text-stone-500">{detail}</span></span><input type="checkbox" disabled={disabled} checked={checked} onChange={(event) => onChange(event.target.checked)} className="h-5 w-5 accent-[#a54f36]" /></label>; }
function Select({ label, value, options, onChange }: { label: string; value: string; options: readonly string[]; onChange: (value: string) => void }) { return <label className="text-sm font-medium">{label}<select value={value} onChange={(event) => onChange(event.target.value)} className="mt-2 h-11 w-full rounded-xl border border-stone-200 bg-white px-3 capitalize outline-none focus:ring-2 focus:ring-amber-300">{options.map((option) => <option key={option} value={option}>{option}</option>)}</select></label>; }
function SaveButton({ pending, onClick }: { pending: boolean; onClick: () => void }) { return <button disabled={pending} onClick={onClick} className={`mt-5 ${primaryButton}`}><Save className="h-4 w-4" />{pending ? "Saving..." : "Save settings"}</button>; }
function Action({ icon: Icon, title, detail, button, onClick, href }: { icon: IconComponent; title: string; detail: string; button: string; onClick?: () => void; href?: string }) { const content = <><Icon className="h-4 w-4" />{button}</>; return <div className="flex flex-col gap-4 rounded-xl border border-stone-200 bg-white p-4 sm:flex-row sm:items-center"><span className="min-w-0 flex-1"><span className="block text-sm font-medium">{title}</span><span className="mt-1 block text-xs leading-5 text-stone-500">{detail}</span></span>{href ? <a href={href} className={secondaryButton}>{content}</a> : <button onClick={onClick} className={secondaryButton}>{content}</button>}</div>; }
function CategoryDialog({ category, scope, pending, onClose, onSave }: { category: TaskCategory | null; scope: CategoryScope; pending: boolean; onClose: () => void; onSave: (input: { name: string; color: string; scope: string; icon: string }) => void }) {
  const [name, setName] = useState(category?.name || ""); const [color, setColor] = useState(category?.color || "#7c3aed"); const [icon, setIcon] = useState(category?.icon || "tag");
  return <div className="fixed inset-0 z-[125] flex items-center justify-center bg-stone-950/40 p-3 backdrop-blur-sm" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><form onSubmit={(event) => { event.preventDefault(); onSave({ name, color, scope, icon }); }} className="w-full max-w-lg rounded-2xl border border-stone-200 bg-[#fffdfa] p-5 shadow-2xl"><div className="flex items-center justify-between"><h2 className="text-xl font-semibold">{category ? "Edit category" : `New ${scopeLabels[scope]} category`}</h2><button type="button" onClick={onClose} className={iconButton}><X className="h-4 w-4" /></button></div><label className="mt-5 block text-sm font-medium">Name<input autoFocus required maxLength={40} value={name} onChange={(event) => setName(event.target.value)} className={fieldClass} /></label><label className="mt-4 block text-sm font-medium">Color<input type="color" value={color} onChange={(event) => setColor(event.target.value)} className="mt-2 h-11 w-full rounded-xl border border-stone-200 bg-white p-1" /></label><p className="mt-4 text-sm font-medium">Icon</p><div className="mt-2 grid grid-cols-6 gap-2">{categoryIcons.map((item) => { const Icon = iconMap[item]; return <button type="button" key={item} onClick={() => setIcon(item)} className={`flex h-11 items-center justify-center rounded-xl border ${icon === item ? "border-stone-900 bg-stone-900 text-white" : "border-stone-200 bg-white text-stone-500"}`}><Icon className="h-4 w-4" /></button>; })}</div><button disabled={pending} className={`mt-6 w-full ${primaryButton}`}><Check className="h-4 w-4" />{category ? "Save category" : "Create category"}</button></form></div>;
}
const primaryButton = "inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#a54f36] px-4 text-sm font-medium text-white hover:bg-[#91432e] disabled:opacity-50";
const secondaryButton = "inline-flex h-10 shrink-0 items-center justify-center gap-2 rounded-xl border border-stone-200 bg-white px-3 text-sm font-medium hover:bg-stone-50";
const iconButton = "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-stone-200 bg-white text-stone-500 hover:bg-stone-50";
const fieldClass = "mt-2 h-11 w-full rounded-xl border border-stone-200 bg-white px-3 outline-none focus:ring-2 focus:ring-amber-300";
