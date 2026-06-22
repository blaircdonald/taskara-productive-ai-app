"use client";

import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import {
  Bell,
  Briefcase,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock3,
  GripVertical,
  Inbox,
  Heart,
  Home,
  Lightbulb,
  Plus,
  Tag,
  Trash2,
  X,
} from "lucide-react";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { createCalendarItem, deleteCalendarItem, rescheduleCalendarItem, updateCalendarItem } from "./actions";

type Category = { id: number; name: string; color: string; scope: string; icon: string };
type Item = {
  id: number;
  title: string;
  kind: string;
  description: string | null;
  scheduledDate: string | null;
  scheduledTime: string | null;
  categoryId: number;
  categoryName: string;
  categoryColor: string;
  categoryIcon: string;
  linkedTaskId: number | null;
};
type View = "month" | "week";

const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const pad = (value: number) => String(value).padStart(2, "0");
const dateKey = (date: Date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
const fromKey = (key: string) => { const [year, month, day] = key.split("-").map(Number); return new Date(year, month - 1, day); };
const addDays = (date: Date, amount: number) => new Date(date.getFullYear(), date.getMonth(), date.getDate() + amount);
const startOfWeek = (date: Date) => addDays(date, -date.getDay());
const monthDays = (date: Date) => {
  const first = new Date(date.getFullYear(), date.getMonth(), 1);
  const start = startOfWeek(first);
  return Array.from({ length: 42 }, (_, index) => addDays(start, index));
};
const weekDays = (date: Date) => Array.from({ length: 7 }, (_, index) => addDays(startOfWeek(date), index));
const categoryIconMap = { briefcase: Briefcase, home: Home, heart: Heart, lightbulb: Lightbulb, bell: Bell, "calendar-days": CalendarDays, tag: Tag };

export function CalendarWorkspace({ initialItems, categories, defaultView, createKind }: { initialItems: Item[]; categories: Category[]; defaultView: View; createKind: "reminder" | null }) {
  const [items, setItems] = useState(initialItems);
  const [cursor, setCursor] = useState(() => new Date());
  const [view, setView] = useState<View>(defaultView);
  const [dialogDate, setDialogDate] = useState<string | null | undefined>(undefined);
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const [activeId, setActiveId] = useState<number | null>(null);
  const [message, setMessage] = useState("");
  const suppressOpenRef = useRef(false);
  const [, startTransition] = useTransition();
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }), useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 8 } }), useSensor(KeyboardSensor));
  const days = useMemo(() => view === "month" ? monthDays(cursor) : weekDays(cursor), [cursor, view]);
  const activeItem = items.find((item) => item.id === activeId);
  useEffect(() => {
    if (!message) return;
    const timeout = window.setTimeout(() => setMessage(""), 5000);
    return () => window.clearTimeout(timeout);
  }, [message]);
  useEffect(() => {
    if (createKind === "reminder") {
      setDialogDate(dateKey(new Date()));
      window.history.replaceState(null, "", "/calendar");
    }
  }, [createKind]);

  function move(amount: number) {
    setCursor((current) => view === "month" ? new Date(current.getFullYear(), current.getMonth() + amount, 1) : addDays(current, amount * 7));
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveId(null);
    window.setTimeout(() => { suppressOpenRef.current = false; }, 0);
    const itemId = Number(event.active.id);
    const destination = event.over?.id ? String(event.over.id) : null;
    if (!destination?.startsWith("date:")) return;
    const scheduledDate = destination.replace("date:", "");
    const previous = items;
    const item = items.find((candidate) => candidate.id === itemId);
    if (!item || item.scheduledDate === scheduledDate) return;
    setItems((current) => current.map((candidate) => candidate.id === itemId ? { ...candidate, scheduledDate } : candidate));
    startTransition(async () => {
      try { await rescheduleCalendarItem(itemId, scheduledDate); setMessage("Item rescheduled."); }
      catch (error) { setItems(previous); setMessage(error instanceof Error ? error.message : "Could not reschedule item."); }
    });
  }

  function openItem(item: Item) {
    if (suppressOpenRef.current) return;
    setEditingItem(item);
  }

  return <DndContext sensors={sensors} onDragStart={(event: DragStartEvent) => { suppressOpenRef.current = true; setActiveId(Number(event.active.id)); }} onDragEnd={handleDragEnd} onDragCancel={() => { suppressOpenRef.current = false; setActiveId(null); }}>
    <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-5 px-3 py-4 sm:px-5 lg:px-7">
      <header className="flex flex-col gap-4 rounded-2xl border border-stone-200/80 bg-white/82 p-4 shadow-[0_16px_50px_rgba(120,90,60,0.08)] sm:p-5 xl:flex-row xl:items-center xl:justify-between">
        <div><p className="text-sm font-medium text-teal-700">Plan with room to breathe</p><h1 className="mt-1 text-2xl font-semibold sm:text-3xl">Calendar</h1></div>
        <div className="flex flex-wrap items-center gap-2">
          <button onClick={() => setCursor(new Date())} className="h-10 rounded-xl border border-stone-200 bg-white px-3 text-sm font-medium text-stone-700 hover:bg-stone-50">Today</button>
          <button onClick={() => move(-1)} aria-label={`Previous ${view}`} className="flex h-10 w-10 items-center justify-center rounded-xl border border-stone-200 bg-white hover:bg-stone-50"><ChevronLeft className="h-4 w-4" /></button>
          <button onClick={() => move(1)} aria-label={`Next ${view}`} className="flex h-10 w-10 items-center justify-center rounded-xl border border-stone-200 bg-white hover:bg-stone-50"><ChevronRight className="h-4 w-4" /></button>
          <div className="flex rounded-xl bg-stone-100 p-1">{(["month", "week"] as View[]).map((option) => <button key={option} onClick={() => setView(option)} className={`h-8 rounded-lg px-3 text-sm font-medium capitalize ${view === option ? "bg-white text-stone-950 shadow-sm" : "text-stone-500"}`}>{option}</button>)}</div>
          <button onClick={() => setDialogDate(dateKey(new Date()))} className="inline-flex h-10 items-center gap-2 rounded-xl bg-[#a54f36] px-4 text-sm font-medium text-white hover:bg-[#91432e]"><Plus className="h-4 w-4" />New item</button>
        </div>
      </header>

      {message && <button onClick={() => setMessage("")} className="self-start rounded-lg bg-stone-800 px-3 py-2 text-left text-xs text-white">{message}</button>}

      <div className="grid min-w-0 gap-5 xl:grid-cols-[minmax(0,1fr)_310px]">
        <section className="min-w-0 overflow-hidden rounded-2xl border border-stone-200/80 bg-white/86 shadow-[0_16px_50px_rgba(120,90,60,0.08)]">
          <div className="flex items-center justify-between border-b border-stone-200/80 px-4 py-4 sm:px-5"><div><p className="text-xs font-semibold uppercase text-stone-400">{view} view</p><h2 className="mt-1 text-xl font-semibold">{view === "month" ? cursor.toLocaleDateString("en-US", { month: "long", year: "numeric" }) : `${days[0].toLocaleDateString("en-US", { month: "short", day: "numeric" })} – ${days[6].toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`}</h2></div><div className="hidden items-center gap-3 text-xs text-stone-500 sm:flex"><span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-blue-500" />Task</span><span className="flex items-center gap-1"><Bell className="h-3 w-3 text-violet-600" />Reminder</span></div></div>
          <div className="overflow-x-auto">
            <div className="min-w-[720px]">
              <div className="grid grid-cols-7 border-b border-stone-200/70 bg-stone-50/70">{dayNames.map((name) => <div key={name} className="px-2 py-2 text-center text-xs font-semibold uppercase text-stone-400">{name}</div>)}</div>
              <div className={`grid grid-cols-7 ${view === "month" ? "grid-rows-6" : ""}`}>
                {days.map((day) => <DayCell key={dateKey(day)} day={day} currentMonth={cursor.getMonth()} view={view} items={items.filter((item) => item.scheduledDate === dateKey(day))} onAdd={() => setDialogDate(dateKey(day))} onEdit={openItem} />)}
              </div>
            </div>
          </div>
        </section>
        <DraftPanel items={items.filter((item) => !item.scheduledDate)} onAdd={() => setDialogDate(null)} />
      </div>
    </div>
    {dialogDate !== undefined && <TaskDialog initialDate={dialogDate} categories={categories} initialKind={createKind ?? "task"} onClose={() => setDialogDate(undefined)} onSaved={() => window.location.reload()} />}
    {editingItem && <TaskDialog item={editingItem} initialDate={editingItem.scheduledDate} categories={categories} onClose={() => setEditingItem(null)} onSaved={() => window.location.reload()} />}
    <DragOverlay>{activeItem ? <ItemCard item={activeItem} overlay /> : null}</DragOverlay>
  </DndContext>;
}

function DayCell({ day, currentMonth, view, items, onAdd, onEdit }: { day: Date; currentMonth: number; view: View; items: Item[]; onAdd: () => void; onEdit: (item: Item) => void }) {
  const key = dateKey(day);
  const { isOver, setNodeRef } = useDroppable({ id: `date:${key}` });
  const today = key === dateKey(new Date());
  const visible = view === "month" ? items.slice(0, 3) : items;
  return <div ref={setNodeRef} className={`group min-w-0 border-b border-r border-stone-200/70 p-2 transition ${view === "month" ? "h-[138px]" : "min-h-[420px]"} ${day.getMonth() !== currentMonth && view === "month" ? "bg-stone-50/60 text-stone-400" : "bg-white"} ${isOver ? "bg-amber-100/80 ring-2 ring-inset ring-amber-400" : ""}`}>
    <div className="mb-2 flex items-center justify-between"><span className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold ${today ? "bg-[#a54f36] text-white" : ""}`}>{day.getDate()}</span><button onClick={onAdd} aria-label={`Add item on ${key}`} className="flex h-7 w-7 items-center justify-center rounded-lg text-stone-400 opacity-0 hover:bg-stone-100 hover:text-stone-900 group-hover:opacity-100 focus:opacity-100"><Plus className="h-3.5 w-3.5" /></button></div>
    <div className="space-y-1.5">{visible.map((item) => <ItemCard key={item.id} item={item} compact={view === "month"} onOpen={() => onEdit(item)} />)}{items.length > visible.length && <p className="px-1 text-[11px] font-medium text-stone-500">+{items.length - visible.length} more</p>}</div>
  </div>;
}

function ItemCard({ item, compact = false, overlay = false, onOpen }: { item: Item; compact?: boolean; overlay?: boolean; onOpen?: () => void }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: item.id });
  const CategoryIcon = categoryIconMap[item.categoryIcon as keyof typeof categoryIconMap] || Tag;
  return <button ref={setNodeRef} style={{ transform: CSS.Translate.toString(transform), borderLeftColor: item.categoryColor }} {...listeners} {...attributes} onClick={onOpen} title={`${item.title} · ${item.categoryName}${onOpen ? " · Click to edit" : ""}`} className={`flex w-full min-w-0 cursor-grab items-center gap-1.5 rounded-lg border border-stone-200/80 border-l-[3px] bg-white px-2 text-left shadow-sm touch-none active:cursor-grabbing ${compact ? "h-7" : "min-h-10 py-2"} ${isDragging && !overlay ? "opacity-30" : ""} ${overlay ? "w-56 rotate-2 shadow-xl" : ""}`}>
    <CategoryIcon className="h-3 w-3 shrink-0" />
    <span className={`min-w-0 flex-1 truncate font-medium text-stone-800 ${compact ? "text-[11px]" : "text-xs"}`}>{item.title}</span>
    {item.scheduledTime && <span className="shrink-0 text-[10px] text-stone-400">{item.scheduledTime.slice(0, 5)}</span>}
  </button>;
}

function DraftPanel({ items, onAdd }: { items: Item[]; onAdd: () => void }) {
  return <aside className="self-start rounded-2xl border border-stone-200/80 bg-[#fff8ed] p-4 shadow-[0_16px_50px_rgba(120,90,60,0.08)] xl:sticky xl:top-5">
    <div className="flex items-center justify-between"><div><p className="text-xs font-semibold uppercase text-amber-700">Unscheduled</p><h2 className="mt-1 text-lg font-semibold">Draft Task Panel</h2></div><button onClick={onAdd} aria-label="Add draft" className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#a54f36] text-white hover:bg-[#91432e]"><Plus className="h-4 w-4" /></button></div>
    <p className="mt-2 text-xs leading-5 text-stone-500">Capture it now. Drag it onto a date when the timing feels right.</p>
    <div className="mt-4 space-y-2">{items.length ? items.map((item) => <div key={item.id} className="rounded-xl border border-amber-200/70 bg-white/85 p-2"><ItemCard item={item} /><div className="mt-2 flex items-center gap-2 px-1 text-[10px] text-stone-500"><GripVertical className="h-3 w-3" /><span style={{ color: item.categoryColor }}>{item.categoryName}</span></div></div>) : <div className="rounded-xl border border-dashed border-amber-300 bg-white/55 px-4 py-8 text-center"><Inbox className="mx-auto h-6 w-6 text-amber-500" /><p className="mt-2 text-sm font-medium">No drafts waiting</p><p className="mt-1 text-xs text-stone-500">Your unscheduled ideas will live here.</p></div>}</div>
  </aside>;
}

function TaskDialog({ initialDate, categories, item, initialKind = "task", onClose, onSaved }: { initialDate: string | null; categories: Category[]; item?: Item; initialKind?: "task" | "reminder"; onClose: () => void; onSaved: () => void }) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [custom, setCustom] = useState(false);
  const [kind, setKind] = useState<"task" | "reminder">(item?.kind === "reminder" ? "reminder" : initialKind);
  const availableCategories = categories.filter((category) => category.scope === (kind === "reminder" ? "reminders" : "calendar"));
  async function submit(formData: FormData, draft: boolean) {
    setSaving(true); setError("");
    try {
      const date = String(formData.get("date") || "");
      if (!draft && !date) throw new Error("Choose a date or save this item as a draft.");
      const input = {
        title: String(formData.get("title") || ""),
        kind: (formData.get("kind") === "reminder" ? "reminder" : "task") as "task" | "reminder",
        description: String(formData.get("description") || ""),
        scheduledDate: draft ? null : date,
        scheduledTime: String(formData.get("time") || "") || null,
        categoryId: custom ? undefined : Number(formData.get("categoryId")),
        categoryName: custom ? String(formData.get("categoryName") || "") : undefined,
        categoryColor: custom ? String(formData.get("categoryColor") || "") : undefined,
      };
      if (item) {
        if (custom) throw new Error("Choose an existing category when editing an item.");
        await updateCalendarItem(item.id, { ...input, categoryId: Number(formData.get("categoryId")) });
      } else {
        await createCalendarItem(input);
      }
      onSaved();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Could not create item."); setSaving(false); }
  }
  async function remove() {
    if (!item || !window.confirm(item.linkedTaskId ? "Remove this item from Calendar? The Kanban task will remain and be unlinked." : "Delete this Calendar item?")) return;
    setSaving(true); setError("");
    try { await deleteCalendarItem(item.id); onSaved(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Could not delete item."); setSaving(false); }
  }
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/35 p-3 backdrop-blur-sm" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <form onSubmit={(event) => { event.preventDefault(); submit(new FormData(event.currentTarget), false); }} className="max-h-[94vh] w-full max-w-xl overflow-y-auto rounded-2xl border border-stone-200 bg-[#fffdfa] p-5 shadow-2xl sm:p-6">
      <div className="flex items-start justify-between gap-4"><div><p className="text-xs font-semibold uppercase text-teal-700">{item ? "Review and update" : initialDate ? "Schedule something" : "Capture for later"}</p><h2 className="mt-1 text-2xl font-semibold">{item ? "Edit task or reminder" : "New task or reminder"}</h2></div><button type="button" onClick={onClose} className="flex h-9 w-9 items-center justify-center rounded-xl border border-stone-200 bg-white"><X className="h-4 w-4" /></button></div>
      <div className="mt-5 space-y-4">
        <label className="block text-sm font-medium">Title<input name="title" required maxLength={140} autoFocus defaultValue={item?.title} placeholder="What needs your attention?" className="mt-1.5 h-11 w-full rounded-xl border border-stone-200 bg-white px-3 outline-none focus:ring-2 focus:ring-amber-400" /></label>
        <div className="grid gap-4 sm:grid-cols-2"><label className="block text-sm font-medium">Type<select name="kind" value={kind} onChange={(event) => setKind(event.target.value === "reminder" ? "reminder" : "task")} className="mt-1.5 h-11 w-full rounded-xl border border-stone-200 bg-white px-3"><option value="task">Task</option><option value="reminder">Reminder</option></select></label><label className="block text-sm font-medium">Category<select name="categoryId" defaultValue={item?.categoryId} disabled={custom} className="mt-1.5 h-11 w-full rounded-xl border border-stone-200 bg-white px-3 disabled:opacity-50">{availableCategories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label></div>
        {!item && <label className="flex items-center gap-2 text-sm text-stone-600"><input type="checkbox" checked={custom} onChange={(event) => setCustom(event.target.checked)} />Create a custom category</label>}
        {custom && <div className="grid gap-4 sm:grid-cols-[1fr_80px]"><label className="block text-sm font-medium">Category name<input name="categoryName" required className="mt-1.5 h-11 w-full rounded-xl border border-stone-200 bg-white px-3" /></label><label className="block text-sm font-medium">Color<input name="categoryColor" type="color" defaultValue="#0f766e" className="mt-1.5 h-11 w-full rounded-xl border border-stone-200 bg-white p-1" /></label></div>}
        <div className="grid gap-4 sm:grid-cols-2"><label className="block text-sm font-medium">Date<input name="date" type="date" defaultValue={initialDate ?? ""} className="mt-1.5 h-11 w-full rounded-xl border border-stone-200 bg-white px-3" /></label><label className="block text-sm font-medium">Optional time<input name="time" type="time" defaultValue={item?.scheduledTime?.slice(0, 5) ?? ""} className="mt-1.5 h-11 w-full rounded-xl border border-stone-200 bg-white px-3" /></label></div>
        <label className="block text-sm font-medium">Description<textarea name="description" rows={3} maxLength={1000} defaultValue={item?.description ?? ""} placeholder="Add a little context..." className="mt-1.5 w-full resize-none rounded-xl border border-stone-200 bg-white p-3" /></label>
      </div>
      {error && <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:items-center"><div className="flex-1">{item && <button type="button" disabled={saving} onClick={remove} className="inline-flex h-11 items-center gap-2 rounded-xl bg-rose-50 px-4 text-sm font-medium text-rose-700 hover:bg-rose-100"><Trash2 className="h-4 w-4" />{item.linkedTaskId ? "Remove from Calendar" : "Delete"}</button>}</div><button type="button" disabled={saving || Boolean(item?.linkedTaskId)} onClick={(event) => submit(new FormData(event.currentTarget.form!), true)} title={item?.linkedTaskId ? "Linked Kanban tasks must keep a due date." : undefined} className="h-11 rounded-xl border border-stone-200 bg-white px-4 text-sm font-medium hover:bg-stone-50 disabled:opacity-40">Save as draft</button><button type="submit" disabled={saving} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#a54f36] px-5 text-sm font-medium text-white hover:bg-[#91432e] disabled:opacity-50">{saving ? <Clock3 className="h-4 w-4 animate-spin" /> : <CalendarDays className="h-4 w-4" />}{item ? "Save changes" : "Schedule item"}</button></div>
    </form>
  </div>;
}
