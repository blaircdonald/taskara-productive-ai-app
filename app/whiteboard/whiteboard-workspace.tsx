"use client";

import { Excalidraw, convertToExcalidrawElements, exportToBlob } from "@excalidraw/excalidraw";
import type { BinaryFiles, ExcalidrawImperativeAPI } from "@excalidraw/excalidraw/types";
import type { ExcalidrawElement } from "@excalidraw/excalidraw/element/types";
import { Check, Download, Menu, MoreHorizontal, Palette, Pencil, Plus, Sparkles, StickyNote, Trash2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import {
  clearWhiteboard, createWhiteboard, deleteWhiteboard, renameWhiteboard, saveWhiteboard, updateWhiteboardColor,
} from "./actions";
import "@excalidraw/excalidraw/index.css";

type Summary = { id: number; name: string; color: string; updatedAt: string };
type Board = Summary & { elements: unknown; appState: unknown; files: unknown; createdAt: string; ownerId: string };
type Scene = { elements: readonly ExcalidrawElement[]; appState: Record<string, unknown>; files: BinaryFiles };
type Diagram = { nodes: { id: string; label: string; x: number; y: number; color?: string }[]; edges: { from: string; to: string; label?: string }[] };

const colors = ["#db2777", "#d97706", "#2563eb", "#16a34a", "#7c3aed", "#ea580c", "#64748b"];
const stickyColors = ["#fef3c7", "#dbeafe", "#dcfce7", "#fce7f3", "#ede9fe", "#ffedd5"];
const diagramTypes = [["flowchart", "Flowchart"], ["mind-map", "Mind map"], ["system-architecture", "System architecture"], ["user-journey", "User journey"], ["process", "Process"]] as const;

export function WhiteboardWorkspace({ boards, selected }: { boards: Summary[]; selected: Board | null }) {
  const router = useRouter();
  const apiRef = useRef<ExcalidrawImperativeAPI | null>(null);
  const sceneRef = useRef<Scene | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const ignoreChanges = useRef(true);
  const [status, setStatus] = useState<"saved" | "saving" | "error">("saved");
  const [message, setMessage] = useState("");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  const [aiPending, setAiPending] = useState(false);
  const [pending, startTransition] = useTransition();

  function persist(boardId = selected?.id) {
    if (!boardId || !sceneRef.current) return Promise.resolve();
    if (saveTimer.current) clearTimeout(saveTimer.current);
    setStatus("saving");
    const scene = sceneRef.current;
    return saveWhiteboard(boardId, scene).then(() => setStatus("saved")).catch(() => setStatus("error"));
  }

  function scheduleSave(elements: readonly ExcalidrawElement[], appState: Record<string, unknown>, files: BinaryFiles) {
    const cleanAppState = {
      viewBackgroundColor: appState.viewBackgroundColor,
      gridSize: appState.gridSize,
      gridStep: appState.gridStep,
      gridModeEnabled: appState.gridModeEnabled,
      objectsSnapModeEnabled: appState.objectsSnapModeEnabled,
    };
    sceneRef.current = { elements, appState: cleanAppState, files };
    if (ignoreChanges.current) return;
    setStatus("saving");
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => void persist(), 800);
  }

  useEffect(() => {
    ignoreChanges.current = true;
    sceneRef.current = selected ? {
      elements: selected.elements as ExcalidrawElement[],
      appState: selected.appState as Record<string, unknown>,
      files: selected.files as BinaryFiles,
    } : null;
    const timeout = setTimeout(() => { ignoreChanges.current = false; }, 500);
    return () => clearTimeout(timeout);
  }, [selected?.id]);

  useEffect(() => () => { if (selected?.id && sceneRef.current) void saveWhiteboard(selected.id, sceneRef.current); }, [selected?.id]);
  useEffect(() => {
    if (!message) return;
    const timeout = setTimeout(() => setMessage(""), 5000);
    return () => clearTimeout(timeout);
  }, [message]);

  function run(action: () => Promise<unknown>, success: string, after?: (value: unknown) => void) {
    startTransition(async () => {
      try { const value = await action(); setMessage(success); after?.(value); router.refresh(); }
      catch (error) { setMessage(error instanceof Error ? error.message : "Something went wrong."); }
    });
  }

  async function selectBoard(id: number) {
    if (selected?.id) await persist(selected.id);
    setMobileOpen(false);
    router.push(`/whiteboard?board=${id}`);
  }

  function insertSticky(color: string) {
    if (!apiRef.current) return;
    const appState = apiRef.current.getAppState();
    const x = -appState.scrollX + appState.width / 2 - 120;
    const y = -appState.scrollY + appState.height / 2 - 80;
    const elements = convertToExcalidrawElements([{ type: "rectangle", x, y, width: 240, height: 160, backgroundColor: color, strokeColor: "#a16207", fillStyle: "solid", roundness: { type: 3 }, label: { text: "Sticky note", fontSize: 22 } }]);
    apiRef.current.updateScene({ elements: [...apiRef.current.getSceneElementsIncludingDeleted(), ...elements] });
    apiRef.current.scrollToContent(elements, { fitToViewport: false });
  }

  async function exportPng() {
    if (!apiRef.current || !selected) return;
    try {
      const blob = await exportToBlob({ elements: apiRef.current.getSceneElements(), appState: { ...apiRef.current.getAppState(), exportBackground: true }, files: apiRef.current.getFiles(), mimeType: "image/png" });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `${selected.name.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "") || "whiteboard"}.png`;
      link.click();
      URL.revokeObjectURL(link.href);
      setMessage("PNG exported.");
    } catch { setMessage("Could not export this whiteboard."); }
  }

  async function addDiagram(prompt: string, type: string) {
    if (!apiRef.current) return;
    setAiPending(true);
    try {
      const response = await fetch("/api/whiteboard/diagram", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ prompt, type }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "AI diagram generation failed.");
      const diagram = data as Diagram;
      const appState = apiRef.current.getAppState();
      const originX = -appState.scrollX + 120;
      const originY = -appState.scrollY + 120;
      const nodeById = new Map(diagram.nodes.map((node) => [node.id, node]));
      const skeletons: Parameters<typeof convertToExcalidrawElements>[0] = [];
      diagram.nodes.forEach((node) => skeletons.push({ id: node.id, type: "rectangle", x: originX + node.x, y: originY + node.y, width: 210, height: 90, backgroundColor: node.color || "#fef3c7", strokeColor: "#57534e", fillStyle: "solid", roundness: { type: 3 }, label: { text: node.label, fontSize: 18 } }));
      diagram.edges.forEach((edge) => {
        const from = nodeById.get(edge.from); const to = nodeById.get(edge.to);
        if (from && to) {
          const x = originX + from.x + 105;
          const y = originY + from.y + 45;
          const width = to.x - from.x;
          const height = to.y - from.y;
          skeletons.push({
            type: "arrow",
            x,
            y,
            width,
            height,
            points: [[0, 0], [width, height]],
            start: { id: edge.from, type: "rectangle" },
            end: { id: edge.to, type: "rectangle" },
            strokeColor: "#78716c",
            strokeWidth: 2,
            roundness: { type: 2 },
            label: edge.label ? { text: edge.label, fontSize: 14 } : undefined,
          });
        }
      });
      const generated = convertToExcalidrawElements(skeletons, { regenerateIds: true });
      apiRef.current.updateScene({ elements: [...apiRef.current.getSceneElementsIncludingDeleted(), ...generated] });
      apiRef.current.scrollToContent(generated, { fitToViewport: true });
      setAiOpen(false); setMessage("AI diagram added.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "AI diagram generation failed."); }
    finally { setAiPending(false); }
  }

  const initialData = selected ? { elements: selected.elements as ExcalidrawElement[], appState: selected.appState as Record<string, unknown>, files: selected.files as BinaryFiles } : undefined;
  return <div className="flex h-screen min-h-0 min-w-0 flex-col overflow-hidden p-2 sm:p-3">
    {message && <button onClick={() => setMessage("")} className="fixed bottom-5 right-5 z-[100] max-w-sm rounded-xl bg-stone-900 px-4 py-3 text-left text-sm text-white shadow-xl">{message}</button>}
    <div className="mx-auto flex h-full w-full max-w-[1900px] min-w-0 overflow-hidden rounded-2xl border border-stone-200/80 bg-white shadow-[0_20px_60px_rgba(120,90,60,0.12)]">
      <BoardPanel boards={boards} selectedId={selected?.id ?? null} pending={pending} mobileOpen={mobileOpen} onClose={() => setMobileOpen(false)} onSelect={selectBoard} onCreate={() => run(createWhiteboard, "Whiteboard created.", (id) => router.push(`/whiteboard?board=${id}`))} onRename={(board) => { const name = window.prompt("Rename whiteboard", board.name); if (name !== null) run(() => renameWhiteboard(board.id, name), "Whiteboard renamed."); }} onDelete={(board) => { if (window.confirm(`Permanently delete "${board.name}"?`)) run(() => deleteWhiteboard(board.id), "Whiteboard deleted.", () => router.push("/whiteboard")); }} />
      <main className="relative flex min-w-0 flex-1 flex-col bg-[#fffdfa]">
        <header className="z-20 flex min-h-16 shrink-0 items-center gap-2 border-b border-stone-200/80 bg-white/95 px-3 py-2 backdrop-blur sm:px-4">
          <button onClick={() => setMobileOpen(true)} className="flex h-9 w-9 items-center justify-center rounded-xl border border-stone-200 lg:hidden"><Menu className="h-4 w-4" /></button>
          <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: selected?.color || "#db2777" }} />
          <h1 className="min-w-0 flex-1 truncate text-sm font-semibold sm:text-base">{selected?.name || "Whiteboards"}</h1>
          {selected && <><div className="hidden items-center gap-1 rounded-xl border border-stone-200 bg-white p-1 sm:flex"><span className="px-2 text-[11px] font-semibold text-stone-400">Sticky</span>{stickyColors.map((color) => <button key={color} onClick={() => insertSticky(color)} aria-label={`Add ${color} sticky note`} className="h-6 w-6 rounded-lg border border-black/10" style={{ backgroundColor: color }} />)}</div>
          <button onClick={() => setAiOpen(true)} className="flex h-9 items-center gap-2 rounded-xl bg-amber-50 px-2.5 text-xs font-semibold text-amber-800 hover:bg-amber-100 sm:px-3"><Sparkles className="h-4 w-4" /><span className="hidden sm:inline">AI Diagram</span></button>
          <button onClick={exportPng} className="flex h-9 items-center gap-2 rounded-xl border border-stone-200 px-2.5 text-xs font-semibold hover:bg-stone-50 sm:px-3"><Download className="h-4 w-4 text-blue-600" /><span className="hidden md:inline">Export PNG</span></button>
          <span className={`hidden text-xs sm:flex sm:items-center sm:gap-1 ${status === "error" ? "text-rose-600" : "text-stone-400"}`}>{status === "saving" ? "Saving..." : status === "error" ? "Save failed" : <><Check className="h-3.5 w-3.5 text-emerald-600" />Saved</>}</span>
          <div className="relative"><button onClick={() => setMoreOpen(!moreOpen)} className="flex h-9 w-9 items-center justify-center rounded-xl border border-stone-200 hover:bg-stone-50"><MoreHorizontal className="h-4 w-4" /></button>{moreOpen && <MoreMenu selected={selected} onClose={() => setMoreOpen(false)} onRename={() => { const name = window.prompt("Rename whiteboard", selected.name); if (name !== null) run(() => renameWhiteboard(selected.id, name), "Whiteboard renamed."); }} onColor={(color) => run(() => updateWhiteboardColor(selected.id, color), "Whiteboard color updated.")} onClear={() => { if (window.confirm("Clear every element from this whiteboard?")) { apiRef.current?.resetScene(); run(() => clearWhiteboard(selected.id), "Whiteboard cleared."); } }} onDelete={() => { if (window.confirm(`Permanently delete "${selected.name}"?`)) run(() => deleteWhiteboard(selected.id), "Whiteboard deleted.", () => router.push("/whiteboard")); }} />}</div></>}
        </header>
        <section className="relative min-h-0 min-w-0 flex-1 overflow-hidden">
          {selected ? <Excalidraw key={selected.id} initialData={initialData} excalidrawAPI={(api) => { apiRef.current = api; }} onChange={(elements, appState, files) => scheduleSave(elements, appState as unknown as Record<string, unknown>, files)} name={selected.name} autoFocus UIOptions={{ canvasActions: { saveToActiveFile: false, loadScene: false, export: false } }} /> : <Empty onCreate={() => run(createWhiteboard, "Whiteboard created.", (id) => router.push(`/whiteboard?board=${id}`))} />}
          {selected && <div className="absolute bottom-3 left-3 z-10 flex gap-1 rounded-xl border border-stone-200 bg-white/95 p-1 shadow-lg sm:hidden"><StickyNote className="m-1 h-4 w-4 text-amber-600" />{stickyColors.slice(0, 4).map((color) => <button key={color} onClick={() => insertSticky(color)} className="h-7 w-7 rounded-lg border border-black/10" style={{ backgroundColor: color }} />)}</div>}
        </section>
      </main>
    </div>
    {aiOpen && <AiDialog pending={aiPending} onClose={() => setAiOpen(false)} onGenerate={addDiagram} />}
  </div>;
}

function BoardPanel({ boards, selectedId, pending, mobileOpen, onClose, onSelect, onCreate, onRename, onDelete }: { boards: Summary[]; selectedId: number | null; pending: boolean; mobileOpen: boolean; onClose: () => void; onSelect: (id: number) => void; onCreate: () => void; onRename: (board: Summary) => void; onDelete: (board: Summary) => void }) {
  return <aside className={`${mobileOpen ? "fixed inset-y-0 left-0 z-[90] flex shadow-2xl" : "hidden"} w-[290px] shrink-0 flex-col border-r border-stone-200/80 bg-[#fffaf3] lg:relative lg:flex lg:w-[300px] lg:shadow-none`}>
    <div className="border-b border-stone-200/80 p-4"><div className="flex items-center justify-between"><div><p className="text-xs font-semibold uppercase text-pink-700">Visual workspace</p><h2 className="mt-1 text-xl font-semibold">Whiteboards</h2></div><button onClick={onClose} className="flex h-9 w-9 items-center justify-center rounded-xl border border-stone-200 lg:hidden"><X className="h-4 w-4" /></button></div><button disabled={pending} onClick={onCreate} className="mt-4 flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-[#a54f36] text-sm font-medium text-white disabled:opacity-50"><Plus className="h-4 w-4" />New Whiteboard</button></div>
    <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-3">{boards.map((board) => <div key={board.id} className="group relative"><button onClick={() => onSelect(board.id)} className={`flex w-full items-center gap-3 rounded-xl border p-3 pr-10 text-left ${selectedId === board.id ? "border-pink-200 bg-white shadow-sm" : "border-transparent hover:bg-white/75"}`}><span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: board.color }} /><span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium">{board.name}</span><span className="mt-1 block text-xs text-stone-400">{relativeTime(board.updatedAt)}</span></span></button><div className="absolute right-2 top-2 hidden gap-0.5 group-hover:flex"><button onClick={() => onRename(board)} className="rounded-lg bg-white p-1.5 text-stone-400 shadow-sm hover:text-stone-900"><Pencil className="h-3.5 w-3.5" /></button><button onClick={() => onDelete(board)} className="rounded-lg bg-white p-1.5 text-stone-400 shadow-sm hover:text-rose-600"><Trash2 className="h-3.5 w-3.5" /></button></div></div>)}{!boards.length && <p className="rounded-xl border border-dashed border-stone-300 px-4 py-8 text-center text-sm leading-6 text-stone-500">Create your first whiteboard to start mapping ideas.</p>}</div>
  </aside>;
}

function MoreMenu({ selected, onClose, onRename, onColor, onClear, onDelete }: { selected: Board; onClose: () => void; onRename: () => void; onColor: (color: string) => void; onClear: () => void; onDelete: () => void }) {
  return <div className="absolute right-0 top-11 z-50 w-56 rounded-xl border border-stone-200 bg-white p-1.5 shadow-xl"><button onClick={() => { onRename(); onClose(); }} className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm hover:bg-stone-50"><Pencil className="h-4 w-4" />Rename</button><p className="px-2 pb-1 pt-2 text-[11px] font-semibold uppercase text-stone-400">Indicator color</p><div className="flex gap-1 px-2 pb-2">{colors.map((color) => <button key={color} onClick={() => onColor(color)} className={`h-5 w-5 rounded-full ${selected.color === color ? "ring-2 ring-stone-900 ring-offset-2" : ""}`} style={{ backgroundColor: color }} />)}</div><button onClick={() => { onClear(); onClose(); }} className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm hover:bg-stone-50"><Palette className="h-4 w-4" />Clear canvas</button><button onClick={() => { onDelete(); onClose(); }} className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm text-rose-600 hover:bg-rose-50"><Trash2 className="h-4 w-4" />Delete whiteboard</button></div>;
}

function AiDialog({ pending, onClose, onGenerate }: { pending: boolean; onClose: () => void; onGenerate: (prompt: string, type: string) => void }) {
  const [prompt, setPrompt] = useState(""); const [type, setType] = useState("flowchart");
  return <div className="fixed inset-0 z-[110] flex items-center justify-center bg-stone-950/35 p-3 backdrop-blur-sm" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><form onSubmit={(event) => { event.preventDefault(); if (prompt.trim()) onGenerate(prompt, type); }} className="w-full max-w-lg rounded-2xl border border-stone-200 bg-[#fffdfa] p-5 shadow-2xl sm:p-6"><div className="flex items-start justify-between"><div><p className="text-xs font-semibold uppercase text-violet-700">Turn ideas into shapes</p><h2 className="mt-1 text-2xl font-semibold">AI Diagram</h2></div><button type="button" onClick={onClose} className="flex h-9 w-9 items-center justify-center rounded-xl border border-stone-200"><X className="h-4 w-4" /></button></div><label className="mt-5 block text-sm font-medium">Diagram type<select value={type} onChange={(event) => setType(event.target.value)} className="mt-2 h-11 w-full rounded-xl border border-stone-200 bg-white px-3 outline-none">{diagramTypes.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><label className="mt-4 block text-sm font-medium">What should the diagram explain?<textarea autoFocus value={prompt} maxLength={2000} onChange={(event) => setPrompt(event.target.value)} placeholder="Example: Customer onboarding from signup through first successful project" className="mt-2 min-h-32 w-full resize-y rounded-xl border border-stone-200 bg-white p-3 text-sm outline-none focus:border-violet-300" /></label><button disabled={pending || !prompt.trim()} className="mt-5 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-violet-600 text-sm font-medium text-white disabled:opacity-50"><Sparkles className="h-4 w-4" />{pending ? "Generating diagram..." : "Generate diagram"}</button></form></div>;
}

function Empty({ onCreate }: { onCreate: () => void }) { return <div className="flex h-full items-center justify-center p-8 text-center"><div><StickyNote className="mx-auto h-10 w-10 text-pink-500" /><h2 className="mt-4 text-xl font-semibold">A blank canvas is waiting</h2><p className="mt-2 text-sm text-stone-500">Create a whiteboard for diagrams, sketches, and sticky-note thinking.</p><button onClick={onCreate} className="mt-5 inline-flex h-10 items-center gap-2 rounded-xl bg-[#a54f36] px-4 text-sm font-medium text-white"><Plus className="h-4 w-4" />Create whiteboard</button></div></div>; }
function relativeTime(value: string) { const seconds = Math.max(1, Math.floor((Date.now() - new Date(value).getTime()) / 1000)); if (seconds < 60) return "Just now"; if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`; if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`; if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`; return new Date(value).toLocaleDateString(); }
