"use client";

import { X } from "lucide-react";
import type { ReactNode } from "react";

export const colors = ["#7c3aed", "#2563eb", "#16a34a", "#db2777", "#ea580c", "#64748b"];
export const relativeTime = (value: string) => {
  const seconds = Math.max(1, Math.floor((Date.now() - new Date(value).getTime()) / 1000));
  if (seconds < 60) return "Just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  return new Date(value).toLocaleDateString();
};
export function Avatar({ person }: { person: { name: string | null; email: string; avatarUrl: string | null } }) {
  return <span title={person.name || person.email} className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full border-2 border-white bg-violet-100 text-[10px] font-semibold text-violet-700">{person.avatarUrl ? <img src={person.avatarUrl} alt="" className="h-full w-full object-cover" /> : (person.name || person.email).split(/\s|@/).slice(0, 2).map((part) => part[0]).join("").toUpperCase()}</span>;
}
export function Modal({ title, children, onClose }: { title: string; children: ReactNode; onClose: () => void }) {
  return <div className="fixed inset-0 z-[90] flex items-center justify-center bg-stone-950/35 p-4" onMouseDown={(event) => event.target === event.currentTarget && onClose()}><div role="dialog" aria-modal="true" aria-label={title} className="w-full max-w-lg rounded-2xl border border-violet-100 bg-white p-5 shadow-2xl"><div className="mb-5 flex items-center justify-between"><h2 className="text-xl font-semibold">{title}</h2><button onClick={onClose} aria-label="Close" className="rounded-lg p-2 hover:bg-stone-100"><X className="h-4 w-4" /></button></div>{children}</div></div>;
}
export function Empty({ title, detail }: { title: string; detail: string }) {
  return <div className="rounded-2xl border border-dashed border-violet-200 bg-violet-50/40 px-6 py-16 text-center"><p className="font-semibold">{title}</p><p className="mt-2 text-sm text-stone-500">{detail}</p></div>;
}
export const fieldClass = "h-11 w-full rounded-xl border border-stone-200 bg-white px-3 text-sm outline-none focus:border-violet-400";
