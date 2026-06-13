"use client";

import { ArrowUp, Bot, CalendarDays, Check, CheckSquare, FileText, LayoutTemplate, Menu, MessageSquarePlus, Mic, MicOff, MoreHorizontal, PenTool, Sparkles, StickyNote, Trash2, X } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { assistantTools } from "@/lib/assistant-client";
import { useAssistantVoice } from "@/hooks/use-assistant-voice";

type Thread = { id: number; title: string; createdAt: string; updatedAt: string };
type Result = { title: string; detail: string; href?: string; pendingActionId?: number };
type Message = { id: number | string; role: string; content: string; source: string; metadata?: { results?: Result[] }; createdAt: string };
type Action = { id: number; summary: string; status: string };

const suggestions = [
  ["Create a task for tomorrow", CheckSquare],
  ["Add meeting reminder on calendar", CalendarDays],
  ["Summarize my notes", StickyNote],
  ["Create a Kanban board", LayoutTemplate],
  ["Plan my week", Sparkles],
  ["Generate a habit tracker template", FileText],
] as const;

export function AssistantWorkspace({ initialThreads, initialPrompt = "" }: { initialThreads: Thread[]; initialPrompt?: string }) {
  const [threads, setThreads] = useState(initialThreads);
  const [threadId, setThreadId] = useState<number | null>(initialThreads[0]?.id ?? null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [actions, setActions] = useState<Action[]>([]);
  const [prompt, setPrompt] = useState(initialPrompt);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [menuId, setMenuId] = useState<number | null>(null);
  const [startVoiceAfterThread, setStartVoiceAfterThread] = useState(false);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  const reloadThreads = useCallback(async () => {
    const response = await fetch("/api/assistant/threads");
    if (response.ok) setThreads((await response.json()).threads.map((thread: Thread & { createdAt: string; updatedAt: string }) => ({ ...thread, createdAt: String(thread.createdAt), updatedAt: String(thread.updatedAt) })));
  }, []);

  const loadThread = useCallback(async (id: number) => {
    const response = await fetch(`/api/assistant/threads/${id}`);
    const data = await response.json();
    if (!response.ok) { setError(data.error || "Could not load conversation."); return; }
    setMessages(data.messages);
    setActions(data.actions);
    setThreadId(id);
    setMobileOpen(false);
  }, []);

  useEffect(() => { if (threadId) void loadThread(threadId); }, [loadThread, threadId]);
  useEffect(() => { if (initialPrompt) window.history.replaceState(null, "", "/assistant"); }, [initialPrompt]);
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, pending, actions]);

  async function newThread() {
    const response = await fetch("/api/assistant/threads", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" });
    const data = await response.json();
    if (!response.ok) return setError(data.error || "Could not create conversation.");
    await reloadThreads();
    setThreadId(data.thread.id);
    setMessages([]);
    setActions([]);
    setMobileOpen(false);
    return data.thread.id as number;
  }

  async function send(value = prompt) {
    const text = value.trim();
    if (!text || pending) return;
    setPrompt("");
    setError("");
    setPending(true);
    const optimistic: Message = { id: `temp-${Date.now()}`, role: "user", content: text, source: "text", createdAt: new Date().toISOString() };
    setMessages((current) => [...current, optimistic]);
    try {
      const response = await fetch("/api/assistant/chat", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ threadId, message: text, timezone: Intl.DateTimeFormat().resolvedOptions().timeZone }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "AI Assistant could not respond.");
      setThreadId(data.threadId);
      setMessages((current) => [...current.filter((message) => message.id !== optimistic.id), data.userMessage, data.assistantMessage]);
      await Promise.all([reloadThreads(), loadThread(data.threadId)]);
    } catch (cause) {
      setMessages((current) => current.filter((message) => message.id !== optimistic.id));
      setError(cause instanceof Error ? cause.message : "AI Assistant could not respond.");
    } finally { setPending(false); }
  }

  async function resolve(actionId: number, decision: "approve" | "reject") {
    setPending(true);
    const response = await fetch(`/api/assistant/actions/${actionId}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ decision }) });
    const data = await response.json();
    if (!response.ok) setError(data.error || "Could not resolve this action.");
    if (threadId) await loadThread(threadId);
    setPending(false);
  }

  async function rename(thread: Thread) {
    const title = window.prompt("Rename conversation", thread.title);
    if (!title?.trim()) return;
    await fetch(`/api/assistant/threads/${thread.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title }) });
    setMenuId(null);
    await reloadThreads();
  }

  async function remove(thread: Thread) {
    if (!window.confirm(`Delete "${thread.title}"?`)) return;
    await fetch(`/api/assistant/threads/${thread.id}`, { method: "DELETE" });
    const remaining = threads.filter((item) => item.id !== thread.id);
    setThreads(remaining);
    setThreadId(remaining[0]?.id ?? null);
    setMessages([]);
    setActions([]);
    setMenuId(null);
  }

  const voiceContext = useMemo(() => messages.slice(-12).map((message) => `${message.role}: ${message.content}`).join("\n"), [messages]);
  const voice = useAssistantVoice({
    threadId,
    context: voiceContext,
    tools: assistantTools,
    onTranscript: (role, text) => setMessages((current) => [...current, { id: `voice-${Date.now()}-${role}`, role, content: text, source: "voice", createdAt: new Date().toISOString() }]),
    onResult: () => { if (threadId) void loadThread(threadId); },
  });
  useEffect(() => {
    if (startVoiceAfterThread && threadId) {
      setStartVoiceAfterThread(false);
      void voice.start();
    }
  }, [startVoiceAfterThread, threadId, voice]);

  async function toggleVoice() {
    if (voice.status !== "idle" && voice.status !== "error") return voice.stop();
    if (!threadId) {
      setStartVoiceAfterThread(true);
      await newThread();
      return;
    }
    await voice.start();
  }

  const pendingActions = actions.filter((action) => action.status === "pending");
  return <div className="flex h-screen min-h-0 bg-[#fffaf2]">
    <aside className={`${mobileOpen ? "fixed inset-y-0 left-[68px] z-50 flex w-[280px]" : "hidden"} shrink-0 flex-col border-r border-stone-200 bg-white/95 p-3 shadow-xl lg:flex lg:w-[270px] lg:shadow-none`}>
      <div className="flex items-center gap-2"><button onClick={newThread} className="flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-[#a54f36] px-4 text-sm font-semibold text-white"><MessageSquarePlus className="h-4 w-4" />New chat</button><button onClick={() => setMobileOpen(false)} className="rounded-xl border p-2 lg:hidden"><X className="h-4 w-4" /></button></div>
      <p className="mb-2 mt-6 px-2 text-[11px] font-semibold uppercase tracking-wider text-stone-400">Conversations</p>
      <div className="flex-1 space-y-1 overflow-y-auto">{threads.map((thread) => <div key={thread.id} className="relative">
        <button onClick={() => loadThread(thread.id)} className={`w-full truncate rounded-xl px-3 py-2.5 pr-10 text-left text-sm ${thread.id === threadId ? "bg-amber-50 font-semibold text-[#8c432f]" : "text-stone-600 hover:bg-stone-100"}`}>{thread.title}</button>
        <button onClick={() => setMenuId(menuId === thread.id ? null : thread.id)} className="absolute right-1 top-1.5 rounded-lg p-2 text-stone-400 hover:bg-white"><MoreHorizontal className="h-4 w-4" /></button>
        {menuId === thread.id && <div className="absolute right-1 top-10 z-20 w-36 rounded-xl border bg-white p-1 text-sm shadow-xl"><button onClick={() => rename(thread)} className="w-full rounded-lg px-3 py-2 text-left hover:bg-stone-50">Rename</button><button onClick={() => remove(thread)} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-rose-600 hover:bg-rose-50"><Trash2 className="h-3.5 w-3.5" />Delete</button></div>}
      </div>)}</div>
    </aside>

    <main className="flex min-w-0 flex-1 flex-col">
      <header className="flex h-16 shrink-0 items-center gap-3 border-b border-stone-200/80 bg-white/80 px-4 backdrop-blur sm:px-6">
        <button onClick={() => setMobileOpen(true)} className="rounded-xl border border-stone-200 p-2 lg:hidden"><Menu className="h-4 w-4" /></button>
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-100 text-violet-700"><Bot className="h-5 w-5" /></span>
        <div className="min-w-0 flex-1"><h1 className="truncate font-semibold">AI Assistant</h1><p className="text-xs text-stone-500">Your command center for Taskara</p></div>
        <span className={`hidden rounded-full px-3 py-1 text-xs font-medium sm:inline-flex ${voice.status === "error" ? "bg-rose-50 text-rose-700" : voice.status !== "idle" ? "bg-emerald-50 text-emerald-700" : "bg-stone-100 text-stone-500"}`}>{voice.status === "idle" ? "Voice ready" : voice.status}</span>
      </header>

      <section className="min-h-0 flex-1 overflow-y-auto">
        <div className="mx-auto flex min-h-full w-full max-w-4xl flex-col px-4 py-6 sm:px-7">
          {!messages.length && !pending ? <EmptyState onSelect={(suggestion) => send(suggestion)} /> : <div className="space-y-6">
            {messages.map((message) => <MessageBubble key={message.id} message={message} />)}
            {pending && <div className="flex items-center gap-3 text-sm text-stone-500"><span className="flex h-8 w-8 items-center justify-center rounded-xl bg-violet-100 text-violet-700"><Bot className="h-4 w-4" /></span><span className="flex gap-1"><i className="h-2 w-2 animate-bounce rounded-full bg-stone-400" /><i className="h-2 w-2 animate-bounce rounded-full bg-stone-400 [animation-delay:120ms]" /><i className="h-2 w-2 animate-bounce rounded-full bg-stone-400 [animation-delay:240ms]" /></span></div>}
            {pendingActions.map((action) => <div key={action.id} className="ml-11 rounded-2xl border border-amber-200 bg-amber-50 p-4"><p className="text-xs font-semibold uppercase text-amber-700">Confirmation needed</p><p className="mt-2 text-sm text-stone-700">{action.summary}</p><div className="mt-4 flex gap-2"><button disabled={pending} onClick={() => resolve(action.id, "approve")} className="flex h-9 items-center gap-2 rounded-xl bg-[#a54f36] px-3 text-sm font-semibold text-white"><Check className="h-4 w-4" />Approve</button><button disabled={pending} onClick={() => resolve(action.id, "reject")} className="h-9 rounded-xl border border-stone-200 bg-white px-3 text-sm font-semibold">Cancel</button></div></div>)}
            <div ref={bottomRef} />
          </div>}
        </div>
      </section>

      <footer className="shrink-0 bg-gradient-to-t from-[#fffaf2] via-[#fffaf2] to-transparent px-3 pb-4 pt-2 sm:px-6">
        <div className="mx-auto max-w-4xl">
          {(error || voice.error) && <button onClick={() => { setError(""); voice.stop(); }} className="mb-2 w-full rounded-xl bg-rose-50 px-3 py-2 text-left text-sm text-rose-700">{error || voice.error}</button>}
          <div className="rounded-2xl border border-stone-200 bg-white p-2 shadow-[0_15px_50px_rgba(120,90,60,0.13)]">
            <textarea value={prompt} onChange={(event) => setPrompt(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); void send(); } }} placeholder="Ask anything or tell Taskara what to do..." rows={2} className="max-h-40 min-h-14 w-full resize-none bg-transparent px-3 py-2 text-sm outline-none" />
            <div className="flex items-center justify-between px-1 pb-1">
              <button onClick={toggleVoice} title="Talk to AI Assistant" className={`flex h-10 items-center gap-2 rounded-xl px-3 text-sm font-semibold ${voice.status !== "idle" && voice.status !== "error" ? "bg-rose-100 text-rose-700" : "bg-stone-100 text-stone-600 hover:bg-violet-50 hover:text-violet-700"}`}>{voice.status !== "idle" && voice.status !== "error" ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}<span className="hidden sm:inline">{voice.status !== "idle" && voice.status !== "error" ? "End voice" : "Talk"}</span></button>
              <button disabled={!prompt.trim() || pending} onClick={() => send()} className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#a54f36] text-white disabled:opacity-40"><ArrowUp className="h-4 w-4" /></button>
            </div>
          </div>
          <p className="mt-2 text-center text-[11px] text-stone-400">Taskara may make mistakes. Important updates require your confirmation.</p>
        </div>
      </footer>
    </main>
  </div>;
}

function EmptyState({ onSelect }: { onSelect: (value: string) => void }) {
  return <div className="m-auto w-full py-8 text-center"><span className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-100 to-amber-100 text-violet-700 shadow-sm"><Sparkles className="h-7 w-7" /></span><h2 className="mt-5 text-3xl font-semibold">AI Assistant</h2><p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-stone-500">Ask questions, plan your day, or tell me what to create across your Taskara workspace.</p><div className="mt-8 grid gap-3 text-left sm:grid-cols-2 lg:grid-cols-3">{suggestions.map(([label, Icon]) => <button key={label} onClick={() => onSelect(label)} className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-violet-200 hover:shadow-md"><Icon className="h-5 w-5 text-violet-600" /><span className="mt-3 block text-sm font-medium">{label}</span></button>)}</div></div>;
}

function MessageBubble({ message }: { message: Message }) {
  const results = Array.isArray(message.metadata?.results) ? message.metadata.results : [];
  return <div className={`flex gap-3 ${message.role === "user" ? "justify-end" : "justify-start"}`}>
    {message.role !== "user" && <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-violet-700"><Bot className="h-4 w-4" /></span>}
    <div className={`max-w-[86%] ${message.role === "user" ? "rounded-2xl rounded-br-md bg-[#a54f36] px-4 py-3 text-white" : "min-w-0"}`}>
      <p className="whitespace-pre-wrap text-sm leading-6">{message.content}</p>
      {message.source === "voice" && <p className={`mt-1 text-[10px] ${message.role === "user" ? "text-white/60" : "text-stone-400"}`}>Voice transcript</p>}
      {results.map((result, index) => <div key={`${result.title}-${index}`} className="mt-3 rounded-xl border border-stone-200 bg-white p-3 text-stone-800 shadow-sm"><p className="text-sm font-semibold">{result.title}</p><p className="mt-1 whitespace-pre-wrap text-xs leading-5 text-stone-500">{result.detail}</p>{result.href && <Link href={result.href} className="mt-2 inline-flex text-xs font-semibold text-[#a54f36]">Open in Taskara</Link>}</div>)}
    </div>
  </div>;
}
