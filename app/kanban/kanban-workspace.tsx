"use client";

import { DndContext, DragOverlay, KeyboardSensor, PointerSensor, TouchSensor, useDraggable, useDroppable, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { Composer, Thread } from "@liveblocks/react-ui";
import { LiveblocksProvider, RoomProvider, useBroadcastEvent, useEventListener, useOthers, useSelf, useThreads } from "@liveblocks/react";
import { CalendarDays, Check, ChevronRight, CirclePlus, Clock3, GripVertical, LayoutDashboard, MessageCircle, MoreHorizontal, NotebookPen, Pencil, Plus, Settings, Share2, Tag, Trash2, UserPlus, Users, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import {
  createBoard, createColumn, createLabel, createTask, deleteBoard, deleteColumn, deleteTask,
  inviteBoardMember, removeBoardMember, reorderTasks, updateBoard, updateColumn, updateTask,
} from "./actions";

type Board = { id: number; name: string; color: string; isOwner: boolean };
type Column = { id: number; boardId: number; name: string; position: number };
type Label = { id: number; name: string; color: string };
type Collaborator = { email: string; name: string | null; avatarUrl: string | null; role: string };
type Task = {
  id: number; boardId: number; columnId: number; title: string; description: string | null; dueDate: string;
  priority: string; position: number; calendarItemId: number | null; notesLinked: boolean; labels: Label[];
};
type TaskDraft = { title: string; description: string; dueDate: string; priority: "low" | "medium" | "high"; labelIds: number[]; calendarSynced: boolean; notesLinked: boolean };

const pad = (value: number) => String(value).padStart(2, "0");
const today = () => { const date = new Date(); return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`; };
const priorityStyle: Record<string, string> = { low: "bg-emerald-100 text-emerald-700", medium: "bg-amber-100 text-amber-700", high: "bg-rose-100 text-rose-700" };
type WorkspaceProps = { boards: Board[]; selectedBoardId: number | null; columns: Column[]; tasks: Task[]; labels: Label[]; collaborators: Collaborator[]; defaultPriority: string };

export function KanbanWorkspace(props: WorkspaceProps) {
  if (!props.selectedBoardId) return <KanbanWorkspaceContent {...props} />;
  return <LiveblocksProvider authEndpoint="/api/liveblocks-auth" resolveUsers={async ({ userIds }) => {
    const response = await fetch(`/api/liveblocks-users?userIds=${encodeURIComponent(userIds.join(","))}`);
    return response.ok ? response.json() : userIds.map((id) => ({ name: id, email: id, color: "#2563eb" }));
  }}><RoomProvider id={`kanban-board:${props.selectedBoardId}`} initialPresence={{}}>
    <LiveBoardRefresh />
    <KanbanWorkspaceContent {...props} />
  </RoomProvider></LiveblocksProvider>;
}

function LiveBoardRefresh() {
  const router = useRouter();
  const broadcast = useBroadcastEvent();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    const notify = () => broadcast({ type: "BOARD_UPDATED" });
    window.addEventListener("taskara-board-updated", notify);
    return () => window.removeEventListener("taskara-board-updated", notify);
  }, [broadcast]);
  useEventListener(({ event }) => {
    if (!event || typeof event !== "object" || !("type" in event) || event.type !== "BOARD_UPDATED") return;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => router.refresh(), 120);
  });
  return null;
}

function KanbanWorkspaceContent({ boards, selectedBoardId, columns: initialColumns, tasks: initialTasks, labels: initialLabels, collaborators, defaultPriority }: WorkspaceProps) {
  const router = useRouter();
  const [tasks, setTasks] = useState(initialTasks);
  const [labels, setLabels] = useState(initialLabels);
  const [boardDialog, setBoardDialog] = useState<Board | "new" | null>(null);
  const [columnDialog, setColumnDialog] = useState<Column | "new" | null>(null);
  const [taskDialog, setTaskDialog] = useState<{ columnId: number; task?: Task } | null>(null);
  const [activeId, setActiveId] = useState<number | null>(null);
  const [message, setMessage] = useState("");
  const [collaborationOpen, setCollaborationOpen] = useState(false);
  const [columnScroll, setColumnScroll] = useState({ left: 0, viewport: 1, content: 1 });
  const columnScrollRef = useRef<HTMLDivElement>(null);
  const columnScrollTrackRef = useRef<HTMLDivElement>(null);
  const [pending, startTransition] = useTransition();
  const selected = boards.find((board) => board.id === selectedBoardId) ?? null;
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }), useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 8 } }), useSensor(KeyboardSensor));
  const activeTask = tasks.find((task) => task.id === activeId);
  const canScrollColumns = columnScroll.content > columnScroll.viewport;
  const scrollThumbWidth = canScrollColumns ? Math.max(12, (columnScroll.viewport / columnScroll.content) * 100) : 100;
  const scrollThumbLeft = canScrollColumns ? (columnScroll.left / (columnScroll.content - columnScroll.viewport)) * (100 - scrollThumbWidth) : 0;

  useEffect(() => {
    if (!message) return;
    const timeout = window.setTimeout(() => setMessage(""), 5000);
    return () => window.clearTimeout(timeout);
  }, [message]);

  useEffect(() => {
    setTasks(initialTasks);
  }, [initialTasks]);

  useEffect(() => {
    setLabels(initialLabels);
  }, [initialLabels]);

  useEffect(() => {
    const element = columnScrollRef.current;
    if (!element) return;
    const measure = () => setColumnScroll({ left: element.scrollLeft, viewport: element.clientWidth, content: element.scrollWidth });
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    const content = element.firstElementChild;
    if (content) observer.observe(content);
    return () => observer.disconnect();
  }, [initialColumns.length]);

  function run(action: () => Promise<unknown>, success: string) {
    startTransition(async () => {
      try { await action(); setMessage(success); window.dispatchEvent(new Event("taskara-board-updated")); router.refresh(); }
      catch (error) { setMessage(error instanceof Error ? error.message : "Something went wrong."); }
    });
  }

  function selectBoard(id: number) { router.push(`/kanban?board=${id}`); }

  function moveColumnScroll(clientX: number) {
    const scroller = columnScrollRef.current;
    const track = columnScrollTrackRef.current;
    if (!scroller || !track || !canScrollColumns) return;
    const bounds = track.getBoundingClientRect();
    const thumbPixels = bounds.width * scrollThumbWidth / 100;
    const availableTrack = bounds.width - thumbPixels;
    const thumbLeft = Math.min(availableTrack, Math.max(0, clientX - bounds.left - thumbPixels / 2));
    scroller.scrollLeft = availableTrack ? thumbLeft / availableTrack * (scroller.scrollWidth - scroller.clientWidth) : 0;
  }

  function removeColumn(column: Column) {
    if (window.confirm(`Delete "${column.name}"? The column must be empty.`)) run(() => deleteColumn(column.id), "Column deleted.");
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveId(null);
    if (!selected) return;
    const taskId = Number(String(event.active.id).replace("task:", ""));
    const over = String(event.over?.id ?? "");
    if (!over) return;
    if (over === String(event.active.id)) return;
    const moving = tasks.find((task) => task.id === taskId);
    if (!moving) return;
    const targetTask = over.startsWith("task:") ? tasks.find((task) => task.id === Number(over.replace("task:", ""))) : undefined;
    const targetColumnId = targetTask?.columnId ?? Number(over.replace("column:", ""));
    if (!targetColumnId) return;
    const grouped = initialColumns.map((column) => ({ columnId: column.id, taskIds: tasks.filter((task) => task.columnId === column.id && task.id !== taskId).map((task) => task.id) }));
    const target = grouped.find((group) => group.columnId === targetColumnId);
    if (!target) return;
    const index = targetTask ? Math.max(0, target.taskIds.indexOf(targetTask.id)) : target.taskIds.length;
    target.taskIds.splice(index, 0, taskId);
    const previous = tasks;
    const ordered = grouped.flatMap((group) => group.taskIds.map((id, position) => ({ id, columnId: group.columnId, position })));
    setTasks((current) => current.map((task) => ({ ...task, ...ordered.find((item) => item.id === task.id) })).sort((a, b) => a.position - b.position));
    startTransition(async () => {
      try { await reorderTasks(selected.id, grouped); setMessage("Task moved."); window.dispatchEvent(new Event("taskara-board-updated")); router.refresh(); }
      catch (error) { setTasks(previous); setMessage(error instanceof Error ? error.message : "Could not move task."); }
    });
  }

  return <DndContext sensors={sensors} onDragStart={(event) => setActiveId(Number(String(event.active.id).replace("task:", "")))} onDragEnd={handleDragEnd} onDragCancel={() => setActiveId(null)}>
    <div className="mx-auto flex min-h-screen w-full max-w-[1800px] flex-col gap-5 px-3 py-4 sm:px-5 lg:px-7">
      <header className="flex flex-col gap-4 rounded-2xl border border-stone-200/80 bg-white/82 p-4 shadow-[0_16px_50px_rgba(120,90,60,0.08)] sm:p-5 lg:flex-row lg:items-center lg:justify-between">
        <div><p className="text-sm font-medium text-blue-700">Shape the work, one step at a time</p><h1 className="mt-1 text-2xl font-semibold sm:text-3xl">Task Boards</h1></div>
        <button onClick={() => setBoardDialog("new")} className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-[#a54f36] px-4 text-sm font-medium text-white hover:bg-[#91432e]"><CirclePlus className="h-4 w-4 text-amber-100" />New board</button>
      </header>
      {message && <button onClick={() => setMessage("")} className="self-start rounded-lg bg-stone-800 px-3 py-2 text-left text-xs text-white">{message}</button>}
      <div className="grid min-h-[calc(100vh-156px)] min-w-0 flex-1 items-stretch gap-5 lg:grid-cols-[240px_minmax(0,1fr)]">
        <aside className="h-full rounded-2xl border border-stone-200/80 bg-white/82 p-3 shadow-[0_16px_45px_rgba(120,90,60,0.07)]">
          <div className="flex items-center justify-between px-2 py-2"><div><p className="text-xs font-semibold uppercase text-stone-400">Workspace</p><h2 className="mt-1 font-semibold">Your boards</h2></div><LayoutDashboard className="h-5 w-5 text-blue-600" /></div>
          <div className="mt-2 flex gap-2 overflow-x-auto lg:flex-col lg:overflow-visible">{boards.map((board) => <button key={board.id} onClick={() => selectBoard(board.id)} className={`flex min-w-[170px] items-center gap-3 rounded-xl px-3 py-3 text-left text-sm transition lg:min-w-0 ${board.id === selectedBoardId ? "bg-stone-900 text-white shadow-sm" : "hover:bg-stone-100"}`}><span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: board.color }} /><span className="min-w-0 flex-1 truncate font-medium">{board.name}</span><ChevronRight className="h-4 w-4 shrink-0 opacity-50" /></button>)}</div>
          {!boards.length && <p className="px-2 py-6 text-sm leading-6 text-stone-500">Create your first board to begin organizing tasks.</p>}
        </aside>
        <section className="min-w-0 h-full">
          {selected ? <>
            <div className="flex h-full min-w-0 flex-col rounded-2xl border border-stone-200/80 bg-white/76 p-5 shadow-[0_16px_45px_rgba(120,90,60,0.07)] sm:p-6">
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-stone-200/80 pb-5">
                <div className="flex min-w-0 items-center gap-3"><span className="h-4 w-4 rounded-full" style={{ backgroundColor: selected.color }} /><div className="min-w-0"><p className="truncate text-lg font-semibold">{selected.name}</p><p className="text-xs text-stone-500">{initialColumns.length} of 5 columns</p></div></div>
                <div className="flex flex-wrap items-center justify-end gap-2"><ActiveCollaborators /><button onClick={() => setCollaborationOpen(true)} className="flex h-9 items-center gap-2 rounded-xl border border-stone-200 bg-white px-3 text-sm hover:bg-stone-50"><Users className="h-3.5 w-3.5 text-emerald-600" />Collaboration</button>{selected.isOwner && <button onClick={() => setBoardDialog(selected)} className="flex h-9 items-center gap-2 rounded-xl border border-stone-200 bg-white px-3 text-sm hover:bg-stone-50"><Settings className="h-3.5 w-3.5 text-violet-600" />Settings</button>}<button disabled={initialColumns.length >= 5} onClick={() => setColumnDialog("new")} title={initialColumns.length >= 5 ? "This board already has the maximum of 5 columns." : "Add column"} className="flex h-9 items-center gap-2 rounded-xl bg-blue-600 px-3 text-sm text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-40"><Plus className="h-3.5 w-3.5" />Column</button></div>
              </div>
              <div ref={columnScrollRef} onScroll={(event) => setColumnScroll({ left: event.currentTarget.scrollLeft, viewport: event.currentTarget.clientWidth, content: event.currentTarget.scrollWidth })} onWheel={(event) => { const element = event.currentTarget; if (element.scrollWidth <= element.clientWidth) return; event.preventDefault(); element.scrollLeft += event.deltaY + event.deltaX; }} className="kanban-column-scroll mt-5 min-h-0 min-w-0 flex-1 overflow-x-auto overflow-y-hidden">
                <div className="flex h-full min-w-max items-stretch gap-5">
                  {initialColumns.map((column) => <KanbanColumn key={column.id} column={column} tasks={tasks.filter((task) => task.columnId === column.id)} onAdd={() => setTaskDialog({ columnId: column.id })} onEditTask={(task) => setTaskDialog({ columnId: column.id, task })} onEditColumn={() => setColumnDialog(column)} onDeleteColumn={() => removeColumn(column)} />)}
                </div>
              </div>
              <div ref={columnScrollTrackRef} onPointerDown={(event) => { if (!canScrollColumns) return; event.currentTarget.setPointerCapture(event.pointerId); moveColumnScroll(event.clientX); }} onPointerMove={(event) => { if (event.currentTarget.hasPointerCapture(event.pointerId)) moveColumnScroll(event.clientX); }} onPointerUp={(event) => { if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId); }} className={`relative mt-5 h-4 touch-none cursor-ew-resize rounded-full border border-[#dfc4aa] bg-[#f0dfcc] p-[3px] shadow-inner transition-opacity ${canScrollColumns ? "opacity-100" : "cursor-default opacity-45"}`} role="scrollbar" aria-label="Scroll board columns" aria-orientation="horizontal" aria-valuemin={0} aria-valuemax={Math.max(0, columnScroll.content - columnScroll.viewport)} aria-valuenow={columnScroll.left}>
                <div className="absolute bottom-[3px] top-[3px] rounded-full bg-[#b96d52] shadow-sm transition-[width,left] duration-75 hover:bg-[#a54f36]" style={{ width: `${scrollThumbWidth}%`, left: `${scrollThumbLeft}%` }} />
              </div>
            </div>
          </> : <div className="flex h-full min-h-[520px] items-center justify-center rounded-2xl border border-dashed border-stone-300 bg-white/55 p-8 text-center"><div><LayoutDashboard className="mx-auto h-9 w-9 text-blue-500" /><h2 className="mt-4 text-xl font-semibold">A fresh board is waiting</h2><p className="mt-2 text-sm text-stone-500">Create a board and its Todo, In Progress, and Done columns will appear here.</p><button onClick={() => setBoardDialog("new")} className="mt-5 h-10 rounded-xl bg-[#a54f36] px-4 text-sm font-medium text-white">Create board</button></div></div>}
        </section>
      </div>
    </div>
    {boardDialog && <BoardDialog board={boardDialog === "new" ? undefined : boardDialog} pending={pending} onClose={() => setBoardDialog(null)} onSave={(input) => run(async () => { const id = boardDialog === "new" ? await createBoard(input) : (await updateBoard(boardDialog.id, input), boardDialog.id); setBoardDialog(null); selectBoard(id); }, boardDialog === "new" ? "Board created." : "Board updated.")} onDelete={boardDialog === "new" ? undefined : () => { if (window.confirm(`Delete "${boardDialog.name}" and all of its tasks?`)) run(async () => { await deleteBoard(boardDialog.id); setBoardDialog(null); router.push("/kanban"); }, "Board deleted."); }} />}
    {columnDialog && selected && <ColumnDialog column={columnDialog === "new" ? undefined : columnDialog} pending={pending} onClose={() => setColumnDialog(null)} onSave={(name) => run(async () => { if (columnDialog === "new") await createColumn(selected.id, name); else await updateColumn(columnDialog.id, name); setColumnDialog(null); }, columnDialog === "new" ? "Column created." : "Column updated.")} />}
    {taskDialog && selected && <TaskDialog task={taskDialog.task} labels={labels} ownerExtras={selected.isOwner} pending={pending} defaultPriority={defaultPriority} onClose={() => setTaskDialog(null)} onCreateLabel={async (input) => { const label = await createLabel(selected.id, input); setLabels((current) => [...current, label].sort((a, b) => a.name.localeCompare(b.name))); return label; }} onSave={(input) => run(async () => { if (taskDialog.task) await updateTask(taskDialog.task.id, input); else await createTask(taskDialog.columnId, input); setTaskDialog(null); }, taskDialog.task ? "Task updated." : "Task created.")} onDelete={!taskDialog.task ? undefined : () => { if (window.confirm(`Delete "${taskDialog.task!.title}"?`)) run(async () => { await deleteTask(taskDialog.task!.id); setTaskDialog(null); }, "Task deleted."); }} />}
    {collaborationOpen && selected && <CollaborationPanel board={selected} collaborators={collaborators} pending={pending} onClose={() => setCollaborationOpen(false)} onInvite={(email) => run(() => inviteBoardMember(selected.id, email), "Collaborator invited.")} onRemove={(email) => run(() => removeBoardMember(selected.id, email), "Collaborator removed.")} />}
    <DragOverlay>{activeTask ? <TaskCard task={activeTask} overlay onOpen={() => {}} /> : null}</DragOverlay>
  </DndContext>;
}

function KanbanColumn({ column, tasks, onAdd, onEditTask, onEditColumn, onDeleteColumn }: { column: Column; tasks: Task[]; onAdd: () => void; onEditTask: (task: Task) => void; onEditColumn: () => void; onDeleteColumn: () => void }) {
  const { isOver, setNodeRef } = useDroppable({ id: `column:${column.id}` });
  return <article ref={setNodeRef} className={`flex h-full min-h-[420px] w-[340px] shrink-0 flex-col rounded-2xl border bg-[var(--app-surface)] p-4 shadow-[0_12px_35px_rgba(120,90,60,0.07)] transition ${isOver ? "border-blue-400 ring-2 ring-inset ring-blue-200" : "border-stone-200/80"}`}>
    <div className="flex items-center gap-2 px-1 py-1"><span className="h-3 w-3 rounded-full bg-blue-500" /><h3 className="min-w-0 flex-1 truncate text-lg font-semibold">{column.name}</h3><span className="rounded-lg bg-stone-100 px-2.5 py-1 text-xs font-semibold text-stone-500">{tasks.length}</span><button onClick={onEditColumn} aria-label="Rename column" className="rounded-lg p-2 text-stone-400 hover:bg-stone-100 hover:text-stone-800"><Pencil className="h-4 w-4" /></button><button onClick={onDeleteColumn} aria-label="Delete column" className="rounded-lg p-2 text-stone-400 hover:bg-rose-50 hover:text-rose-600"><Trash2 className="h-4 w-4" /></button></div>
    <div className="mt-4 space-y-3">{tasks.map((task) => <TaskCard key={task.id} task={task} onOpen={() => onEditTask(task)} />)}{!tasks.length && <div className="rounded-xl border border-dashed border-stone-300 bg-white px-4 py-12 text-center text-sm text-stone-400">Drop tasks here</div>}</div>
    <button onClick={onAdd} className="mt-auto flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-dashed border-stone-300 bg-white text-sm font-medium text-stone-500 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700"><Plus className="h-4 w-4" />Add task</button>
  </article>;
}

function TaskCard({ task, onOpen, overlay = false }: { task: Task; onOpen: () => void; overlay?: boolean }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: `task:${task.id}` });
  const { setNodeRef: setDropRef, isOver } = useDroppable({ id: `task:${task.id}` });
  const { threads } = useThreads();
  const commentCount = threads?.filter((thread) => thread.metadata.taskId === task.id).reduce((sum, thread) => sum + thread.comments.length, 0) ?? 0;
  return <div ref={(node) => { setNodeRef(node); setDropRef(node); }} style={{ transform: CSS.Translate.toString(transform) }} className={`rounded-xl border bg-white p-3 shadow-sm transition ${isOver ? "border-blue-400" : "border-stone-200/80"} ${isDragging && !overlay ? "opacity-25" : ""} ${overlay ? "w-[290px] rotate-2 shadow-xl" : ""}`}>
    <div className="flex items-start gap-2"><button {...listeners} {...attributes} aria-label="Drag task" className="mt-0.5 cursor-grab touch-none text-stone-300 hover:text-stone-600"><GripVertical className="h-4 w-4" /></button><button onClick={onOpen} className="min-w-0 flex-1 text-left"><p className="font-medium leading-5 text-stone-900">{task.title}</p>{task.description && <p className="mt-1 line-clamp-2 text-xs leading-5 text-stone-500">{task.description}</p>}</button><button onClick={onOpen} aria-label="Edit task" className="text-stone-400 hover:text-stone-800"><MoreHorizontal className="h-4 w-4" /></button></div>
    <div className="mt-3 flex flex-wrap gap-1.5">{task.labels.map((label) => <span key={label.id} className="rounded-full px-2 py-1 text-[10px] font-semibold" style={{ backgroundColor: `${label.color}18`, color: label.color }}>{label.name}</span>)}</div>
    <div className="mt-3 flex items-center gap-2 border-t border-stone-100 pt-2 text-[11px] text-stone-500"><span className={`rounded-md px-1.5 py-1 font-semibold capitalize ${priorityStyle[task.priority]}`}>{task.priority}</span>{commentCount > 0 && <button onClick={onOpen} className="flex items-center gap-1 rounded-md bg-blue-50 px-1.5 py-1 font-semibold text-blue-700" aria-label={`${commentCount} comments`}><MessageCircle className="h-3.5 w-3.5" />{commentCount}</button>}<Clock3 className="ml-auto h-3.5 w-3.5 text-amber-600" />{task.dueDate}{task.calendarItemId && <CalendarDays className="h-3.5 w-3.5 text-teal-600" />}{task.notesLinked && <NotebookPen className="h-3.5 w-3.5 text-violet-600" />}</div>
  </div>;
}

function ActiveCollaborators() {
  const self = useSelf();
  const others = useOthers();
  const people = [self, ...others].filter(Boolean).slice(0, 5);
  return <div className="flex -space-x-2" aria-label={`${people.length} active collaborators`}>
    {people.map((person) => <UserAvatar key={`${person!.id}:${person!.connectionId}`} email={person!.info.email} name={person!.info.name} avatar={person!.info.avatar} color={person!.info.color} online />)}
  </div>;
}

function UserAvatar({ email, name, avatar, color, online = false }: { email: string; name?: string | null; avatar?: string | null; color?: string; online?: boolean }) {
  const initials = (name || email).split(/\s|@/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("");
  return <span title={`${name || email}${online ? " · Active now" : ""}`} className="relative flex h-9 w-9 items-center justify-center overflow-hidden rounded-full border-2 border-white text-xs font-bold text-white shadow-sm" style={{ backgroundColor: color || "#64748b" }}>
    {avatar ? <img src={avatar} alt="" className="h-full w-full object-cover" /> : initials}
    {online && <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-white bg-emerald-500" />}
  </span>;
}

function CollaborationPanel({ board, collaborators, pending, onClose, onInvite, onRemove }: { board: Board; collaborators: Collaborator[]; pending: boolean; onClose: () => void; onInvite: (email: string) => void; onRemove: (email: string) => void }) {
  const others = useOthers();
  const self = useSelf();
  const onlineEmails = new Set([self?.info.email, ...others.map((other) => other.info.email)].filter(Boolean));
  return <Modal onClose={onClose} wide><div>
    <DialogHeader eyebrow="Share this board" title="Collaboration" onClose={onClose} />
    <p className="mt-2 text-sm text-stone-500">Invite people to work together on <span className="font-medium text-stone-800">{board.name}</span>.</p>
    {board.isOwner && <form className="mt-5 flex flex-col gap-2 rounded-xl bg-stone-100 p-3 sm:flex-row" onSubmit={(event) => { event.preventDefault(); const email = String(new FormData(event.currentTarget).get("email")); onInvite(email); event.currentTarget.reset(); }}><input name="email" type="email" required placeholder="teammate@example.com" className="h-11 min-w-0 flex-1 rounded-xl border border-stone-200 bg-white px-3 text-sm" /><button disabled={pending} className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#a54f36] px-4 text-sm font-medium text-white disabled:opacity-50"><UserPlus className="h-4 w-4" />Invite</button></form>}
    <div className="mt-5 space-y-2">{collaborators.map((person) => {
      const online = onlineEmails.has(person.email);
      return <div key={person.email} className="flex items-center gap-3 rounded-xl border border-stone-200 bg-white p-3"><UserAvatar email={person.email} name={person.name} avatar={person.avatarUrl} online={online} /><div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{person.name || person.email}</p><p className="truncate text-xs text-stone-500">{person.email} · {person.role === "owner" ? "Owner" : online ? "Active now" : person.name ? "Editor" : "Invitation pending"}</p></div>{board.isOwner && person.role !== "owner" && <button disabled={pending} onClick={() => onRemove(person.email)} className="rounded-lg px-2 py-1 text-xs font-medium text-rose-600 hover:bg-rose-50">Remove</button>}</div>;
    })}</div>
    {!collaborators.length && <div className="mt-5 rounded-xl border border-dashed border-stone-300 p-8 text-center text-sm text-stone-500"><Share2 className="mx-auto mb-2 h-5 w-5" />No collaborators yet.</div>}
  </div></Modal>;
}

function BoardDialog({ board, pending, onClose, onSave, onDelete }: { board?: Board; pending: boolean; onClose: () => void; onSave: (input: { name: string; color: string }) => void; onDelete?: () => void }) {
  return <Modal onClose={onClose}><form onSubmit={(event) => { event.preventDefault(); const data = new FormData(event.currentTarget); onSave({ name: String(data.get("name")), color: String(data.get("color")) }); }}>
    <DialogHeader eyebrow={board ? "Tune your workspace" : "Start something clear"} title={board ? "Edit board" : "New Kanban board"} onClose={onClose} />
    <div className="mt-5 grid gap-4 sm:grid-cols-[1fr_90px]"><label className="text-sm font-medium">Board name<input name="name" required maxLength={80} autoFocus defaultValue={board?.name} placeholder="Website launch" className="mt-1.5 h-11 w-full rounded-xl border border-stone-200 bg-white px-3" /></label><label className="text-sm font-medium">Color<input name="color" type="color" defaultValue={board?.color ?? "#2563eb"} className="mt-1.5 h-11 w-full rounded-xl border border-stone-200 bg-white p-1" /></label></div>
    <div className="mt-6 flex flex-wrap justify-between gap-2">{onDelete ? <button type="button" onClick={onDelete} className="h-10 rounded-xl bg-rose-50 px-3 text-sm font-medium text-rose-700 hover:bg-rose-100">Delete board</button> : <span />}<button disabled={pending} className="h-10 rounded-xl bg-[#a54f36] px-5 text-sm font-medium text-white disabled:opacity-50">{pending ? "Saving..." : board ? "Save changes" : "Create board"}</button></div>
  </form></Modal>;
}

function ColumnDialog({ column, pending, onClose, onSave }: { column?: Column; pending: boolean; onClose: () => void; onSave: (name: string) => void }) {
  return <Modal onClose={onClose}><form onSubmit={(event) => { event.preventDefault(); onSave(String(new FormData(event.currentTarget).get("name"))); }}>
    <DialogHeader eyebrow={column ? "Keep the workflow clear" : "Shape the workflow"} title={column ? "Rename column" : "New column"} onClose={onClose} />
    <label className="mt-5 block text-sm font-medium">Column name<input name="name" required maxLength={80} autoFocus defaultValue={column?.name} placeholder="Review" className="mt-1.5 h-11 w-full rounded-xl border border-stone-200 bg-white px-3 outline-none focus:ring-2 focus:ring-blue-400" /></label>
    <div className="mt-6 flex justify-end"><button disabled={pending} className="h-10 rounded-xl bg-blue-600 px-5 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">{pending ? "Saving..." : column ? "Save name" : "Create column"}</button></div>
  </form></Modal>;
}

function TaskDialog({ task, labels, ownerExtras, pending, defaultPriority, onClose, onSave, onDelete, onCreateLabel }: { task?: Task; labels: Label[]; ownerExtras: boolean; pending: boolean; defaultPriority: string; onClose: () => void; onSave: (input: TaskDraft) => void; onDelete?: () => void; onCreateLabel: (input: { name: string; color: string }) => Promise<Label> }) {
  const [selected, setSelected] = useState(task?.labels.map((label) => label.id) ?? []);
  const [calendarSynced, setCalendarSynced] = useState(Boolean(task?.calendarItemId));
  const [notesLinked, setNotesLinked] = useState(Boolean(task?.notesLinked));
  const [newLabel, setNewLabel] = useState(false);
  const [labelError, setLabelError] = useState("");
  return <Modal onClose={onClose} extraWide={Boolean(task)}><div>
    <DialogHeader eyebrow={task ? "Review the details" : "Capture the next step"} title={task ? "Task details" : "New task"} onClose={onClose} />
    <div className={`mt-5 grid gap-6 ${task ? "lg:grid-cols-[minmax(0,1fr)_minmax(320px,.85fr)]" : ""}`}><form onSubmit={(event) => { event.preventDefault(); const data = new FormData(event.currentTarget); onSave({ title: String(data.get("title")), description: String(data.get("description")), dueDate: String(data.get("dueDate")), priority: String(data.get("priority")) as TaskDraft["priority"], labelIds: selected, calendarSynced, notesLinked }); }}>
    <div className="space-y-4"><label className="block text-sm font-medium">Title<input name="title" required maxLength={140} autoFocus defaultValue={task?.title} placeholder="What needs to happen?" className="mt-1.5 h-11 w-full rounded-xl border border-stone-200 bg-white px-3" /></label><label className="block text-sm font-medium">Description<textarea name="description" rows={3} maxLength={1000} defaultValue={task?.description ?? ""} className="mt-1.5 w-full resize-none rounded-xl border border-stone-200 bg-white p-3" /></label>
      <div className="grid gap-4 sm:grid-cols-2"><label className="text-sm font-medium">Due date<input name="dueDate" type="date" required defaultValue={task?.dueDate ?? today()} className="mt-1.5 h-11 w-full rounded-xl border border-stone-200 bg-white px-3" /></label><label className="text-sm font-medium">Priority<select name="priority" defaultValue={task?.priority ?? defaultPriority} className="mt-1.5 h-11 w-full rounded-xl border border-stone-200 bg-white px-3"><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option></select></label></div>
      <div><div className="flex items-center justify-between"><p className="text-sm font-medium">Labels</p>{ownerExtras && <button type="button" onClick={() => setNewLabel((value) => !value)} className="flex items-center gap-1 text-xs font-semibold text-blue-700"><Tag className="h-3.5 w-3.5" />New label</button>}</div>{newLabel && <div className="mt-2 grid gap-2 rounded-xl bg-stone-100 p-3 sm:grid-cols-[1fr_70px_auto]"><input id="new-label-name" placeholder="Label name" className="h-10 rounded-lg border border-stone-200 bg-white px-3 text-sm" /><input id="new-label-color" type="color" defaultValue="#7c3aed" className="h-10 w-full rounded-lg border border-stone-200 bg-white p-1" /><button type="button" onClick={async () => { try { const name = (document.getElementById("new-label-name") as HTMLInputElement).value; const color = (document.getElementById("new-label-color") as HTMLInputElement).value; const label = await onCreateLabel({ name, color }); setSelected((current) => [...current, label.id]); setNewLabel(false); setLabelError(""); } catch (error) { setLabelError(error instanceof Error ? error.message : "Could not create label."); } }} className="h-10 rounded-lg bg-stone-900 px-3 text-sm text-white">Add</button></div>}{labelError && <p className="mt-2 text-xs text-rose-600">{labelError}</p>}<div className="mt-2 flex flex-wrap gap-2">{labels.map((label) => <button key={label.id} disabled={!ownerExtras} type="button" onClick={() => setSelected((current) => current.includes(label.id) ? current.filter((id) => id !== label.id) : [...current, label.id])} className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1.5 text-xs font-medium disabled:cursor-default ${selected.includes(label.id) ? "border-stone-800 bg-stone-900 text-white" : "border-stone-200 bg-white text-stone-600"}`}><span className="h-2 w-2 rounded-full" style={{ backgroundColor: label.color }} />{label.name}{selected.includes(label.id) && <Check className="h-3 w-3" />}</button>)}</div></div>
      {ownerExtras ? <><Toggle checked={calendarSynced} onChange={setCalendarSynced} icon={<CalendarDays className="h-4 w-4 text-teal-600" />} title="Sync with Calendar" detail="Keep title, description, due date, and primary label linked." /><Toggle checked={notesLinked} onChange={setNotesLinked} icon={<NotebookPen className="h-4 w-4 text-violet-600" />} title="Link with Notes" detail="Save the connection indicator for the upcoming Notes workspace." /></> : <p className="rounded-xl bg-amber-50 p-3 text-xs leading-5 text-amber-800">Labels, Calendar sync, and Notes links are managed by the board owner.</p>}
    </div>
    <div className="mt-6 flex flex-wrap justify-between gap-2">{onDelete ? <button type="button" onClick={onDelete} className="h-10 rounded-xl bg-rose-50 px-3 text-sm font-medium text-rose-700">Delete task</button> : <span />}<button disabled={pending} className="h-10 rounded-xl bg-[#a54f36] px-5 text-sm font-medium text-white disabled:opacity-50">{pending ? "Saving..." : task ? "Save changes" : "Create task"}</button></div>
  </form>{task && <TaskComments taskId={task.id} />}</div></div></Modal>;
}

function TaskComments({ taskId }: { taskId: number }) {
  const { threads, isLoading } = useThreads();
  const taskThreads = threads?.filter((thread) => thread.metadata.taskId === taskId) ?? [];
  return <aside className="min-h-[320px] rounded-2xl border border-stone-200 bg-white p-4">
    <div className="flex items-center gap-2"><MessageCircle className="h-4 w-4 text-blue-600" /><h3 className="font-semibold">Comments</h3><span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-semibold text-blue-700">{taskThreads.reduce((sum, thread) => sum + thread.comments.length, 0)}</span></div>
    <div className="mt-4 max-h-[52vh] space-y-3 overflow-y-auto">{isLoading ? <p className="py-8 text-center text-sm text-stone-400">Loading discussion...</p> : taskThreads.length ? taskThreads.map((thread) => <Thread key={thread.id} thread={thread} className="rounded-xl border border-stone-200" />) : <div className="rounded-xl border border-dashed border-stone-300 px-4 py-8 text-center"><MessageCircle className="mx-auto h-5 w-5 text-stone-400" /><p className="mt-2 text-sm font-medium">Start the conversation</p><p className="mt-1 text-xs text-stone-500">Comments appear here for everyone on this board.</p></div>}</div>
    {taskThreads[0] ? <Composer threadId={taskThreads[0].id} className="mt-4 rounded-xl border border-stone-200" /> : <Composer metadata={{ taskId }} className="mt-4 rounded-xl border border-stone-200" />}
  </aside>;
}

function Toggle({ checked, onChange, icon, title, detail }: { checked: boolean; onChange: (value: boolean) => void; icon: React.ReactNode; title: string; detail: string }) {
  return <button type="button" onClick={() => onChange(!checked)} className="flex w-full items-center gap-3 rounded-xl border border-stone-200 bg-white p-3 text-left hover:bg-stone-50"><span className="flex h-9 w-9 items-center justify-center rounded-lg bg-stone-100">{icon}</span><span className="min-w-0 flex-1"><span className="block text-sm font-medium">{title}</span><span className="block text-xs text-stone-500">{detail}</span></span><span className={`relative h-6 w-11 rounded-full transition ${checked ? "bg-[#a54f36]" : "bg-stone-300"}`}><span className={`absolute top-1 h-4 w-4 rounded-full bg-white transition ${checked ? "left-6" : "left-1"}`} /></span></button>;
}

function Modal({ children, onClose, wide = false, extraWide = false }: { children: React.ReactNode; onClose: () => void; wide?: boolean; extraWide?: boolean }) {
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/35 p-3 backdrop-blur-sm" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><div className={`max-h-[94vh] w-full overflow-y-auto rounded-2xl border border-stone-200 bg-[#fffdfa] p-5 shadow-2xl sm:p-6 ${extraWide ? "max-w-5xl" : wide ? "max-w-2xl" : "max-w-lg"}`}>{children}</div></div>;
}

function DialogHeader({ eyebrow, title, onClose }: { eyebrow: string; title: string; onClose: () => void }) {
  return <div className="flex items-start justify-between gap-4"><div><p className="text-xs font-semibold uppercase text-blue-700">{eyebrow}</p><h2 className="mt-1 text-2xl font-semibold">{title}</h2></div><button type="button" onClick={onClose} className="flex h-9 w-9 items-center justify-center rounded-xl border border-stone-200 bg-white hover:bg-stone-50"><X className="h-4 w-4" /></button></div>;
}
