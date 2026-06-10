"use client";

import CharacterCount from "@tiptap/extension-character-count";
import Placeholder from "@tiptap/extension-placeholder";
import TaskItem from "@tiptap/extension-task-item";
import TaskList from "@tiptap/extension-task-list";
import { EditorContent, useEditor, type Editor } from "@tiptap/react";
import { BubbleMenu } from "@tiptap/react/menus";
import StarterKit from "@tiptap/starter-kit";
import {
  ArrowLeft, Bold, Check, CheckSquare, ChevronDown, Code, Copy, FileText, Heading1, Heading2,
  Italic, Link2, List, ListOrdered, MoreHorizontal, Palette, Pin, Plus, Quote, Redo2, RotateCcw,
  Search, Sparkles, Strikethrough, Trash2, Undo2, WandSparkles,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import {
  createNote, duplicateNote, permanentlyDeleteNote, renameNote, restoreNote, saveNote,
  setNotePinned, trashNote, updateNoteColor,
} from "./actions";

type Summary = { id: number; title: string; color: string; isPinned: boolean; trashedAt: string | null; updatedAt: string };
type FullNote = Summary & { content: unknown };
const colors = ["#d97706", "#2563eb", "#16a34a", "#7c3aed", "#db2777", "#ea580c", "#64748b"];
const tones = ["Professional", "Friendly", "Confident", "Casual", "Concise"];
const refinements = [
  ["grammar", "Improve grammar"], ["rephrase", "Rephrase"], ["shorter", "Make shorter"],
  ["longer", "Make longer"], ["simplify", "Simplify language"],
] as const;

export function NotesWorkspace({ notes, trash, selected, trashOpen }: { notes: Summary[]; trash: Summary[]; selected: FullNote | null; trashOpen: boolean }) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [menuId, setMenuId] = useState<number | null>(null);
  const [message, setMessage] = useState("");
  const [pending, startTransition] = useTransition();
  const filtered = useMemo(() => notes.filter((note) => note.title.toLowerCase().includes(search.toLowerCase())), [notes, search]);
  useEffect(() => {
    if (!message) return;
    const timeout = window.setTimeout(() => setMessage(""), 5000);
    return () => window.clearTimeout(timeout);
  }, [message]);
  const navigate = (href: string) => { setMenuId(null); router.push(href); };
  const run = (action: () => Promise<unknown>, success: string, after?: (value: unknown) => void) => startTransition(async () => {
    try { const value = await action(); setMessage(success); after?.(value); router.refresh(); }
    catch (error) { setMessage(error instanceof Error ? error.message : "Something went wrong."); }
  });

  return <div className="flex min-h-screen min-w-0 flex-col p-3 sm:p-5 lg:p-6">
    {message && <button onClick={() => setMessage("")} className="fixed bottom-5 right-5 z-[80] rounded-xl bg-stone-900 px-4 py-3 text-sm text-white shadow-xl">{message}</button>}
    <div className="mx-auto flex min-h-[calc(100vh-24px)] w-full max-w-[1700px] min-w-0 overflow-hidden rounded-2xl border border-stone-200/80 bg-white/75 shadow-[0_20px_60px_rgba(120,90,60,0.1)] sm:min-h-[calc(100vh-40px)]">
      <aside className={`${selected && !trashOpen ? "hidden lg:flex" : "flex"} w-full shrink-0 flex-col border-r border-stone-200/80 bg-[#fffaf3] lg:w-[330px]`}>
        <div className="border-b border-stone-200/80 p-4">
          <div className="flex items-center justify-between"><div><p className="text-xs font-semibold uppercase text-amber-700">Your thinking space</p><h1 className="mt-1 text-2xl font-semibold">Notes</h1></div><button disabled={pending} onClick={() => run(createNote, "Note created.", (id) => navigate(`/notes?note=${id}`))} className="flex h-10 items-center gap-2 rounded-xl bg-[#a54f36] px-3 text-sm font-medium text-white disabled:opacity-50"><Plus className="h-4 w-4" />New</button></div>
          {!trashOpen && <label className="mt-4 flex h-10 items-center gap-2 rounded-xl border border-stone-200 bg-white px-3 text-stone-500"><Search className="h-4 w-4" /><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search notes" className="min-w-0 flex-1 bg-transparent text-sm outline-none" /></label>}
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-3">
          {trashOpen ? <TrashList notes={trash} pending={pending} onRestore={(note) => run(() => restoreNote(note.id), "Note restored.", () => navigate(`/notes?note=${note.id}`))} onDelete={(note) => { if (window.confirm(`Permanently delete "${note.title}"? This cannot be undone.`)) run(() => permanentlyDeleteNote(note.id), "Note permanently deleted."); }} /> :
          <div className="space-y-2">{filtered.map((note) => <NoteRow key={note.id} note={note} selected={selected?.id === note.id} menuOpen={menuId === note.id} onSelect={() => navigate(`/notes?note=${note.id}`)} onMenu={() => setMenuId(menuId === note.id ? null : note.id)} onRename={() => { const title = window.prompt("Rename note", note.title); if (title !== null) run(() => renameNote(note.id, title), "Note renamed."); }} onDuplicate={() => run(() => duplicateNote(note.id), "Note duplicated.", (id) => navigate(`/notes?note=${id}`))} onPin={() => run(() => setNotePinned(note.id, !note.isPinned), note.isPinned ? "Note unpinned." : "Note pinned.")} onColor={(color) => run(() => updateNoteColor(note.id, color), "Note color updated.")} onTrash={() => { if (window.confirm(`Move "${note.title}" to Trash?`)) run(() => trashNote(note.id), "Note moved to Trash.", () => navigate("/notes")); }} />)}{!filtered.length && <Empty text={search ? "No notes match your search." : "Create your first note and start writing."} />}</div>}
        </div>
        <button onClick={() => navigate(trashOpen ? "/notes" : "/notes?trash=1")} className={`m-3 flex h-11 items-center gap-3 rounded-xl px-3 text-sm font-medium ${trashOpen ? "bg-stone-900 text-white" : "text-stone-600 hover:bg-stone-100"}`}><Trash2 className="h-4 w-4" /><span className="flex-1 text-left">Trash</span><span className="rounded-full bg-stone-200 px-2 py-0.5 text-xs text-stone-700">{trash.length}</span></button>
      </aside>
      <main className={`${trashOpen || !selected ? "hidden lg:flex" : "flex"} min-w-0 flex-1 flex-col`}>
        {selected ? <NoteEditor key={selected.id} note={selected} onBack={() => navigate("/notes")} /> : <div className="flex h-full flex-1 items-center justify-center p-8"><Empty text="Choose a note or create a new one." /></div>}
      </main>
    </div>
  </div>;
}

function NoteRow({ note, selected, menuOpen, onSelect, onMenu, onRename, onDuplicate, onPin, onColor, onTrash }: { note: Summary; selected: boolean; menuOpen: boolean; onSelect: () => void; onMenu: () => void; onRename: () => void; onDuplicate: () => void; onPin: () => void; onColor: (color: string) => void; onTrash: () => void }) {
  return <div className="relative"><button onClick={onSelect} className={`flex w-full items-center gap-3 rounded-xl border p-3 text-left transition ${selected ? "border-amber-300 bg-white shadow-sm" : "border-transparent hover:bg-white/80"}`}><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg" style={{ backgroundColor: `${note.color}18`, color: note.color }}><FileText className="h-4 w-4" /></span><span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium">{note.title}</span><span className="mt-0.5 block text-xs text-stone-400">{relativeTime(note.updatedAt)}</span></span>{note.isPinned && <Pin className="h-3.5 w-3.5 fill-current" style={{ color: note.color }} />}</button><button onClick={onMenu} aria-label={`Actions for ${note.title}`} className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-lg text-stone-400 hover:bg-stone-100 hover:text-stone-900"><MoreHorizontal className="h-4 w-4" /></button>
    {menuOpen && <div className="absolute right-2 top-11 z-40 w-52 rounded-xl border border-stone-200 bg-white p-1.5 shadow-xl"><MenuButton onClick={onRename} icon={<FileText />} label="Rename" /><MenuButton onClick={onDuplicate} icon={<Copy />} label="Duplicate" /><MenuButton onClick={onPin} icon={<Pin />} label={note.isPinned ? "Unpin" : "Pin note"} /><div className="my-1 border-t border-stone-100" /><p className="px-2 py-1 text-[11px] font-semibold uppercase text-stone-400">Color</p><div className="flex gap-1 px-2 py-1">{colors.map((color) => <button key={color} onClick={() => onColor(color)} aria-label={`Set color ${color}`} className="h-5 w-5 rounded-full ring-offset-2 hover:ring-2" style={{ backgroundColor: color }} />)}</div><div className="my-1 border-t border-stone-100" /><MenuButton onClick={onTrash} icon={<Trash2 />} label="Move to Trash" danger /></div>}
  </div>;
}

function TrashList({ notes, pending, onRestore, onDelete }: { notes: Summary[]; pending: boolean; onRestore: (note: Summary) => void; onDelete: (note: Summary) => void }) {
  return <div><div className="px-2 pb-3"><p className="text-sm font-semibold">Trash</p><p className="mt-1 text-xs leading-5 text-stone-500">Restore notes or remove them permanently.</p></div><div className="space-y-2">{notes.map((note) => <div key={note.id} className="rounded-xl border border-stone-200 bg-white p-3"><div className="flex items-center gap-2"><FileText className="h-4 w-4" style={{ color: note.color }} /><p className="min-w-0 flex-1 truncate text-sm font-medium">{note.title}</p></div><div className="mt-3 flex gap-2"><button disabled={pending} onClick={() => onRestore(note)} className="flex h-8 flex-1 items-center justify-center gap-1 rounded-lg bg-stone-100 text-xs font-medium"><RotateCcw className="h-3.5 w-3.5" />Restore</button><button disabled={pending} onClick={() => onDelete(note)} className="flex h-8 flex-1 items-center justify-center gap-1 rounded-lg bg-rose-50 text-xs font-medium text-rose-700"><Trash2 className="h-3.5 w-3.5" />Delete</button></div></div>)}{!notes.length && <Empty text="Trash is empty." />}</div></div>;
}

function NoteEditor({ note, onBack }: { note: FullNote; onBack: () => void }) {
  const [title, setTitle] = useState(note.title);
  const [status, setStatus] = useState<"saved" | "saving" | "error">("saved");
  const [slashOpen, setSlashOpen] = useState(false);
  const [slashIndex, setSlashIndex] = useState(0);
  const [aiOpen, setAiOpen] = useState(false);
  const [aiPending, setAiPending] = useState(false);
  const [message, setMessage] = useState("");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const titleRef = useRef(title);
  titleRef.current = title;
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [StarterKit.configure({ link: { openOnClick: false } }), Placeholder.configure({ placeholder: "Press / for commands" }), TaskList, TaskItem.configure({ nested: true }), CharacterCount],
    content: note.content as object,
    editorProps: { attributes: { class: "notes-prose min-h-[55vh] outline-none" } },
    onUpdate: ({ editor }) => { scheduleSave(editor); const before = editor.state.doc.textBetween(Math.max(0, editor.state.selection.from - 1), editor.state.selection.from); setSlashOpen(before === "/"); },
  });

  function persist(activeEditor = editor) {
    if (!activeEditor) return;
    if (timer.current) clearTimeout(timer.current);
    setStatus("saving");
    saveNote(note.id, { title: titleRef.current, content: activeEditor.getJSON() }).then(() => setStatus("saved")).catch(() => setStatus("error"));
  }
  function scheduleSave(activeEditor = editor) {
    if (!activeEditor) return;
    setStatus("saving");
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => persist(activeEditor), 700);
  }
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); if (editor && !editor.isDestroyed) void saveNote(note.id, { title: titleRef.current, content: editor.getJSON() }); }, [editor, note.id]);
  useEffect(() => {
    if (!message) return;
    const timeout = window.setTimeout(() => setMessage(""), 5000);
    return () => window.clearTimeout(timeout);
  }, [message]);
  if (!editor) return <div className="flex flex-1 items-center justify-center text-sm text-stone-500">Opening your note...</div>;

  const commands = [
    { label: "Text", icon: FileText, run: () => editor.chain().focus().setParagraph().run() },
    { label: "Heading 1", icon: Heading1, run: () => editor.chain().focus().toggleHeading({ level: 1 }).run() },
    { label: "Heading 2", icon: Heading2, run: () => editor.chain().focus().toggleHeading({ level: 2 }).run() },
    { label: "Bullet list", icon: List, run: () => editor.chain().focus().toggleBulletList().run() },
    { label: "Numbered list", icon: ListOrdered, run: () => editor.chain().focus().toggleOrderedList().run() },
    { label: "Task list", icon: CheckSquare, run: () => editor.chain().focus().toggleTaskList().run() },
    { label: "Quote", icon: Quote, run: () => editor.chain().focus().toggleBlockquote().run() },
    { label: "Code block", icon: Code, run: () => editor.chain().focus().toggleCodeBlock().run() },
    { label: "Divider", icon: MoreHorizontal, run: () => editor.chain().focus().setHorizontalRule().run() },
  ];
  function runSlash(index: number) {
    if (!editor) return;
    editor.chain().focus().deleteRange({ from: editor.state.selection.from - 1, to: editor.state.selection.from }).run();
    commands[index].run();
    setSlashOpen(false);
    setSlashIndex(0);
  }
  async function refine(action: string, tone?: string) {
    if (!editor) return;
    const { from, to } = editor.state.selection;
    const original = editor.state.doc.textBetween(from, to, " ");
    if (!original) return;
    setAiPending(true); setMessage("");
    try {
      const response = await fetch("/api/notes/refine", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text: original, action, tone }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "AI Refine failed.");
      if (editor.state.doc.textBetween(from, to, " ") !== original) throw new Error("The selection changed while AI Refine was working. Select it again and retry.");
      editor.chain().focus().insertContentAt({ from, to }, data.text).run(); setAiOpen(false);
    } catch (error) { setMessage(error instanceof Error ? error.message : "AI Refine failed."); }
    finally { setAiPending(false); }
  }
  return <div className="relative flex min-h-0 flex-1 flex-col bg-[#fffdfa]">
    <header className="border-b border-stone-200/80 px-4 py-4 sm:px-7"><div className="mx-auto flex max-w-5xl items-center gap-3"><button onClick={() => { persist(); onBack(); }} className="flex h-9 items-center gap-1 rounded-lg border border-stone-200 px-2 text-xs font-medium lg:hidden"><ArrowLeft className="h-4 w-4" />Notes</button><span className="h-3 w-3 rounded-full" style={{ backgroundColor: note.color }} /><input value={title} maxLength={160} onChange={(event) => { setTitle(event.target.value); titleRef.current = event.target.value; scheduleSave(); }} onBlur={() => persist()} className="min-w-0 flex-1 bg-transparent text-xl font-semibold outline-none sm:text-2xl" placeholder="Untitled note" /><span className={`shrink-0 text-xs ${status === "error" ? "text-rose-600" : "text-stone-400"}`}>{status === "saving" ? "Saving..." : status === "error" ? "Save failed" : <span className="flex items-center gap-1"><Check className="h-3.5 w-3.5 text-emerald-600" />Saved</span>}</span></div></header>
    <Toolbar editor={editor} />
    <div className="min-h-0 flex-1 overflow-y-auto px-4 py-8 sm:px-8"><div onKeyDownCapture={(event) => {
      if (!slashOpen) return;
      if (event.key === "ArrowDown") { event.preventDefault(); setSlashIndex((slashIndex + 1) % commands.length); }
      if (event.key === "ArrowUp") { event.preventDefault(); setSlashIndex((slashIndex - 1 + commands.length) % commands.length); }
      if (event.key === "Enter") { event.preventDefault(); runSlash(slashIndex); }
      if (event.key === "Escape") { event.preventDefault(); setSlashOpen(false); }
    }} className="relative mx-auto max-w-3xl">
      <BubbleMenu editor={editor} options={{ placement: "top" }}><div className="flex items-center gap-1 rounded-xl border border-stone-200 bg-white p-1 shadow-xl"><Tool icon={<Bold />} active={editor.isActive("bold")} onClick={() => editor.chain().focus().toggleBold().run()} /><Tool icon={<Italic />} active={editor.isActive("italic")} onClick={() => editor.chain().focus().toggleItalic().run()} /><Tool icon={<Strikethrough />} active={editor.isActive("strike")} onClick={() => editor.chain().focus().toggleStrike().run()} /><div className="mx-1 h-5 border-l border-stone-200" /><button disabled={aiPending} onClick={() => setAiOpen(!aiOpen)} className="flex h-8 items-center gap-1.5 rounded-lg bg-amber-50 px-2 text-xs font-semibold text-amber-800"><WandSparkles className="h-3.5 w-3.5" />{aiPending ? "Refining..." : "AI Refine"}<ChevronDown className="h-3 w-3" /></button></div></BubbleMenu>
      {aiOpen && <AiMenu pending={aiPending} onRefine={refine} />}
      {slashOpen && <div className="absolute left-3 top-8 z-30 grid w-64 gap-1 rounded-xl border border-stone-200 bg-white p-2 shadow-xl">{commands.map((command, index) => <button key={command.label} onClick={() => runSlash(index)} className={`flex items-center gap-3 rounded-lg px-3 py-2 text-left text-sm ${index === slashIndex ? "bg-amber-50 text-amber-900" : "hover:bg-stone-50"}`}><command.icon className="h-4 w-4 text-stone-500" />{command.label}</button>)}</div>}
      {message && <button onClick={() => setMessage("")} className="mb-4 w-full rounded-xl bg-rose-50 p-3 text-left text-sm text-rose-700">{message}</button>}
      <EditorContent editor={editor} />
    </div></div>
    <footer className="border-t border-stone-200/80 px-5 py-2 text-right text-xs text-stone-400">{editor.storage.characterCount.words()} words</footer>
  </div>;
}

function Toolbar({ editor }: { editor: Editor }) {
  const setLink = () => {
    const current = String(editor.getAttributes("link").href || "");
    const href = window.prompt("Link URL", current || "https://");
    if (href === null) return;
    const value = href.trim();
    if (!value) {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }
    const normalized = /^[a-z][a-z0-9+.-]*:/i.test(value) ? value : `https://${value}`;
    editor.chain().focus().extendMarkRange("link").setLink({ href: normalized }).run();
  };
  return <div className="sticky top-0 z-20 overflow-x-auto border-b border-stone-200/80 bg-white/90 px-4 py-2 backdrop-blur"><div className="mx-auto flex w-max max-w-5xl items-center gap-1"><Tool icon={<Heading1 />} active={editor.isActive("heading", { level: 1 })} onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} /><Tool icon={<Heading2 />} active={editor.isActive("heading", { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} /><Tool icon={<Bold />} active={editor.isActive("bold")} onClick={() => editor.chain().focus().toggleBold().run()} /><Tool icon={<Italic />} active={editor.isActive("italic")} onClick={() => editor.chain().focus().toggleItalic().run()} /><Tool icon={<Strikethrough />} active={editor.isActive("strike")} onClick={() => editor.chain().focus().toggleStrike().run()} /><Tool icon={<Code />} active={editor.isActive("code")} onClick={() => editor.chain().focus().toggleCode().run()} /><Tool icon={<Link2 />} active={editor.isActive("link")} onClick={setLink} /><Tool icon={<List />} active={editor.isActive("bulletList")} onClick={() => editor.chain().focus().toggleBulletList().run()} /><Tool icon={<ListOrdered />} active={editor.isActive("orderedList")} onClick={() => editor.chain().focus().toggleOrderedList().run()} /><Tool icon={<CheckSquare />} active={editor.isActive("taskList")} onClick={() => editor.chain().focus().toggleTaskList().run()} /><Tool icon={<Quote />} active={editor.isActive("blockquote")} onClick={() => editor.chain().focus().toggleBlockquote().run()} /><Tool icon={<Undo2 />} onClick={() => editor.chain().focus().undo().run()} /><Tool icon={<Redo2 />} onClick={() => editor.chain().focus().redo().run()} /></div></div>;
}

function AiMenu({ pending, onRefine }: { pending: boolean; onRefine: (action: string, tone?: string) => void }) {
  return <div className="absolute right-0 top-0 z-50 w-56 rounded-xl border border-stone-200 bg-white p-1.5 shadow-xl"><p className="px-2 py-1 text-[11px] font-semibold uppercase text-amber-700">AI Refine</p>{refinements.map(([action, label]) => <button key={action} disabled={pending} onClick={() => onRefine(action)} className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm hover:bg-amber-50 disabled:opacity-50"><Sparkles className="h-3.5 w-3.5 text-amber-600" />{label}</button>)}<div className="my-1 border-t border-stone-100" /><p className="px-2 py-1 text-[11px] font-semibold uppercase text-stone-400">Change tone</p><div className="flex flex-wrap gap-1 px-2 pb-2">{tones.map((tone) => <button key={tone} disabled={pending} onClick={() => onRefine("tone", tone)} className="rounded-full bg-stone-100 px-2 py-1 text-[11px] font-medium hover:bg-amber-100">{tone}</button>)}</div></div>;
}

function Tool({ icon, active = false, onClick }: { icon: React.ReactElement; active?: boolean; onClick: () => void }) { return <button onClick={onClick} className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg [&_svg]:h-4 [&_svg]:w-4 ${active ? "bg-stone-900 text-white" : "text-stone-500 hover:bg-stone-100 hover:text-stone-900"}`}>{icon}</button>; }
function MenuButton({ icon, label, onClick, danger = false }: { icon: React.ReactElement; label: string; onClick: () => void; danger?: boolean }) { return <button onClick={onClick} className={`flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm [&_svg]:h-4 [&_svg]:w-4 ${danger ? "text-rose-600 hover:bg-rose-50" : "text-stone-700 hover:bg-stone-50"}`}>{icon}{label}</button>; }
function Empty({ text }: { text: string }) { return <div className="rounded-xl border border-dashed border-stone-300 px-5 py-10 text-center"><FileText className="mx-auto h-6 w-6 text-amber-500" /><p className="mt-2 text-sm text-stone-500">{text}</p></div>; }
function relativeTime(value: string) { const seconds = Math.max(1, Math.floor((Date.now() - new Date(value).getTime()) / 1000)); if (seconds < 60) return "Just now"; if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`; if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`; if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`; return new Date(value).toLocaleDateString(); }
