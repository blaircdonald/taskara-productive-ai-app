"use client";

import { DndContext, DragOverlay, KeyboardSensor, PointerSensor, TouchSensor, useDraggable, useDroppable, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { CalendarDays, Check, ChevronRight, CirclePlus, Clock3, GripVertical, LayoutDashboard, MoreHorizontal, NotebookPen, Pencil, Plus, Tag, Trash2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import {
  createBoard, createColumn, createLabel, createTask, deleteBoard, deleteColumn, deleteTask,
  reorderTasks, updateBoard, updateColumn, updateTask,
} from "./actions";

type Board = { id: number; name: string; color: string };
type Column = { id: number; boardId: number; name: string; position: number };
type Label = { id: number; name: string; color: string };
type Task = {
  id: number; boardId: number; columnId: number; title: string; description: string | null; dueDate: string;
  priority: string; position: number; calendarItemId: number | null; notesLinked: boolean; labels: Label[];
};
type TaskDraft = { title: string; description: string; dueDate: string; priority: "low" | "medium" | "high"; labelIds: number[]; calendarSynced: boolean; notesLinked: boolean };

const pad = (value: number) => String(value).padStart(2, "0");
const today = () => { const date = new Date(); return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`; };
const priorityStyle: Record<string, string> = { low: "bg-emerald-100 text-emerald-700", medium: "bg-amber-100 text-amber-700", high: "bg-rose-100 text-rose-700" };

export function KanbanWorkspace({ boards, selectedBoardId, columns: initialColumns, tasks: initialTasks, labels: initialLabels }: { boards: Board[]; selectedBoardId: number | null; columns: Column[]; tasks: Task[]; labels: Label[] }) {
  const router = useRouter();
  const [tasks, setTasks] = useState(initialTasks);
  const [labels, setLabels] = useState(initialLabels);
  const [boardDialog, setBoardDialog] = useState<Board | "new" | null>(null);
  const [taskDialog, setTaskDialog] = useState<{ columnId: number; task?: Task } | null>(null);
  const [activeId, setActiveId] = useState<number | null>(null);
  const [message, setMessage] = useState("");
  const [pending, startTransition] = useTransition();
  const selected = boards.find((board) => board.id === selectedBoardId) ?? null;
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }), useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 8 } }), useSensor(KeyboardSensor));
  const activeTask = tasks.find((task) => task.id === activeId);

  function run(action: () => Promise<unknown>, success: string) {
    startTransition(async () => {
      try { await action(); setMessage(success); router.refresh(); }
      catch (error) { setMessage(error instanceof Error ? error.message : "Something went wrong."); }
    });
  }

  function selectBoard(id: number) { router.push(`/kanban?board=${id}`); }

  function addColumn() {
    if (!selected || initialColumns.length >= 5) return;
    const name = window.prompt("New column name");
    if (name) run(() => createColumn(selected.id, name), "Column created.");
  }

  function editColumn(column: Column) {
    const name = window.prompt("Column name", column.name);
    if (name && name !== column.name) run(() => updateColumn(column.id, name), "Column updated.");
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
      try { await reorderTasks(selected.id, grouped); setMessage("Task moved."); router.refresh(); }
      catch (error) { setTasks(previous); setMessage(error instanceof Error ? error.message : "Could not move task."); }
    });
  }

  return <DndContext sensors={sensors} onDragStart={(event) => setActiveId(Number(String(event.active.id).replace("task:", "")))} onDragEnd={handleDragEnd} onDragCancel={() => setActiveId(null)}>
    <div className="mx-auto flex w-full max-w-[1800px] flex-col gap-5 px-3 py-4 sm:px-5 lg:px-7">
      <header className="flex flex-col gap-4 rounded-2xl border border-stone-200/80 bg-white/82 p-4 shadow-[0_16px_50px_rgba(120,90,60,0.08)] sm:p-5 lg:flex-row lg:items-center lg:justify-between">
        <div><p className="text-sm font-medium text-blue-700">Shape the work, one step at a time</p><h1 className="mt-1 text-2xl font-semibold sm:text-3xl">Task Boards</h1></div>
        <button onClick={() => setBoardDialog("new")} className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-[#a54f36] px-4 text-sm font-medium text-white hover:bg-[#91432e]"><CirclePlus className="h-4 w-4 text-amber-100" />New board</button>
      </header>
      {message && <button onClick={() => setMessage("")} className="self-start rounded-lg bg-stone-800 px-3 py-2 text-left text-xs text-white">{message}</button>}
      <div className="grid min-w-0 gap-5 lg:grid-cols-[240px_minmax(0,1fr)]">
        <aside className="self-start rounded-2xl border border-stone-200/80 bg-white/82 p-3 shadow-[0_16px_45px_rgba(120,90,60,0.07)] lg:sticky lg:top-5">
          <div className="flex items-center justify-between px-2 py-2"><div><p className="text-xs font-semibold uppercase text-stone-400">Workspace</p><h2 className="mt-1 font-semibold">Your boards</h2></div><LayoutDashboard className="h-5 w-5 text-blue-600" /></div>
          <div className="mt-2 flex gap-2 overflow-x-auto lg:flex-col lg:overflow-visible">{boards.map((board) => <button key={board.id} onClick={() => selectBoard(board.id)} className={`flex min-w-[170px] items-center gap-3 rounded-xl px-3 py-3 text-left text-sm transition lg:min-w-0 ${board.id === selectedBoardId ? "bg-stone-900 text-white shadow-sm" : "hover:bg-stone-100"}`}><span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: board.color }} /><span className="min-w-0 flex-1 truncate font-medium">{board.name}</span><ChevronRight className="h-4 w-4 shrink-0 opacity-50" /></button>)}</div>
          {!boards.length && <p className="px-2 py-6 text-sm leading-6 text-stone-500">Create your first board to begin organizing tasks.</p>}
        </aside>
        <section className="min-w-0">
          {selected ? <>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-stone-200/80 bg-white/76 p-4">
              <div className="flex min-w-0 items-center gap-3"><span className="h-4 w-4 rounded-full" style={{ backgroundColor: selected.color }} /><div className="min-w-0"><p className="truncate text-lg font-semibold">{selected.name}</p><p className="text-xs text-stone-500">{initialColumns.length} of 5 columns</p></div></div>
              <div className="flex gap-2"><button onClick={() => setBoardDialog(selected)} className="flex h-9 items-center gap-2 rounded-xl border border-stone-200 bg-white px-3 text-sm hover:bg-stone-50"><Pencil className="h-3.5 w-3.5 text-violet-600" />Edit</button><button disabled={initialColumns.length >= 5} onClick={addColumn} className="flex h-9 items-center gap-2 rounded-xl bg-blue-600 px-3 text-sm text-white hover:bg-blue-700 disabled:opacity-40"><Plus className="h-3.5 w-3.5" />Column</button></div>
            </div>
            <div className="min-w-0 overflow-x-auto pb-4"><div className="flex min-h-[520px] min-w-max gap-4">
              {initialColumns.map((column) => <KanbanColumn key={column.id} column={column} tasks={tasks.filter((task) => task.columnId === column.id)} onAdd={() => setTaskDialog({ columnId: column.id })} onEditTask={(task) => setTaskDialog({ columnId: column.id, task })} onEditColumn={() => editColumn(column)} onDeleteColumn={() => removeColumn(column)} />)}
            </div></div>
          </> : <div className="flex min-h-[520px] items-center justify-center rounded-2xl border border-dashed border-stone-300 bg-white/55 p-8 text-center"><div><LayoutDashboard className="mx-auto h-9 w-9 text-blue-500" /><h2 className="mt-4 text-xl font-semibold">A fresh board is waiting</h2><p className="mt-2 text-sm text-stone-500">Create a board and its Todo, In Progress, and Done columns will appear here.</p><button onClick={() => setBoardDialog("new")} className="mt-5 h-10 rounded-xl bg-[#a54f36] px-4 text-sm font-medium text-white">Create board</button></div></div>}
        </section>
      </div>
    </div>
    {boardDialog && <BoardDialog board={boardDialog === "new" ? undefined : boardDialog} pending={pending} onClose={() => setBoardDialog(null)} onSave={(input) => run(async () => { const id = boardDialog === "new" ? await createBoard(input) : (await updateBoard(boardDialog.id, input), boardDialog.id); setBoardDialog(null); selectBoard(id); }, boardDialog === "new" ? "Board created." : "Board updated.")} onDelete={boardDialog === "new" ? undefined : () => { if (window.confirm(`Delete "${boardDialog.name}" and all of its tasks?`)) run(async () => { await deleteBoard(boardDialog.id); setBoardDialog(null); router.push("/kanban"); }, "Board deleted."); }} />}
    {taskDialog && <TaskDialog task={taskDialog.task} labels={labels} pending={pending} onClose={() => setTaskDialog(null)} onCreateLabel={async (input) => { const label = await createLabel(input); setLabels((current) => [...current, label].sort((a, b) => a.name.localeCompare(b.name))); return label; }} onSave={(input) => run(async () => { if (taskDialog.task) await updateTask(taskDialog.task.id, input); else await createTask(taskDialog.columnId, input); setTaskDialog(null); }, taskDialog.task ? "Task updated." : "Task created.")} onDelete={!taskDialog.task ? undefined : () => { if (window.confirm(`Delete "${taskDialog.task!.title}"?`)) run(async () => { await deleteTask(taskDialog.task!.id); setTaskDialog(null); }, "Task deleted."); }} />}
    <DragOverlay>{activeTask ? <TaskCard task={activeTask} overlay onOpen={() => {}} /> : null}</DragOverlay>
  </DndContext>;
}

function KanbanColumn({ column, tasks, onAdd, onEditTask, onEditColumn, onDeleteColumn }: { column: Column; tasks: Task[]; onAdd: () => void; onEditTask: (task: Task) => void; onEditColumn: () => void; onDeleteColumn: () => void }) {
  const { isOver, setNodeRef } = useDroppable({ id: `column:${column.id}` });
  return <article ref={setNodeRef} className={`w-[290px] shrink-0 rounded-2xl border bg-[#fffdfa]/90 p-3 shadow-[0_12px_35px_rgba(120,90,60,0.07)] transition ${isOver ? "border-blue-400 bg-blue-50/80" : "border-stone-200/80"}`}>
    <div className="flex items-center gap-2 px-1 py-1"><span className="h-2.5 w-2.5 rounded-full bg-blue-500" /><h3 className="min-w-0 flex-1 truncate font-semibold">{column.name}</h3><span className="rounded-lg bg-stone-100 px-2 py-1 text-[11px] font-semibold text-stone-500">{tasks.length}</span><button onClick={onEditColumn} aria-label="Rename column" className="rounded-lg p-1.5 text-stone-400 hover:bg-stone-100 hover:text-stone-800"><Pencil className="h-3.5 w-3.5" /></button><button onClick={onDeleteColumn} aria-label="Delete column" className="rounded-lg p-1.5 text-stone-400 hover:bg-rose-50 hover:text-rose-600"><Trash2 className="h-3.5 w-3.5" /></button></div>
    <div className="mt-3 space-y-3">{tasks.map((task) => <TaskCard key={task.id} task={task} onOpen={() => onEditTask(task)} />)}{!tasks.length && <div className="rounded-xl border border-dashed border-stone-300 px-3 py-8 text-center text-xs text-stone-400">Drop tasks here</div>}</div>
    <button onClick={onAdd} className="mt-3 flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-dashed border-stone-300 text-sm font-medium text-stone-500 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700"><Plus className="h-4 w-4" />Add task</button>
  </article>;
}

function TaskCard({ task, onOpen, overlay = false }: { task: Task; onOpen: () => void; overlay?: boolean }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: `task:${task.id}` });
  const { setNodeRef: setDropRef, isOver } = useDroppable({ id: `task:${task.id}` });
  return <div ref={(node) => { setNodeRef(node); setDropRef(node); }} style={{ transform: CSS.Translate.toString(transform) }} className={`rounded-xl border bg-white p-3 shadow-sm transition ${isOver ? "border-blue-400" : "border-stone-200/80"} ${isDragging && !overlay ? "opacity-25" : ""} ${overlay ? "w-[290px] rotate-2 shadow-xl" : ""}`}>
    <div className="flex items-start gap-2"><button {...listeners} {...attributes} aria-label="Drag task" className="mt-0.5 cursor-grab touch-none text-stone-300 hover:text-stone-600"><GripVertical className="h-4 w-4" /></button><button onClick={onOpen} className="min-w-0 flex-1 text-left"><p className="font-medium leading-5 text-stone-900">{task.title}</p>{task.description && <p className="mt-1 line-clamp-2 text-xs leading-5 text-stone-500">{task.description}</p>}</button><button onClick={onOpen} aria-label="Edit task" className="text-stone-400 hover:text-stone-800"><MoreHorizontal className="h-4 w-4" /></button></div>
    <div className="mt-3 flex flex-wrap gap-1.5">{task.labels.map((label) => <span key={label.id} className="rounded-full px-2 py-1 text-[10px] font-semibold" style={{ backgroundColor: `${label.color}18`, color: label.color }}>{label.name}</span>)}</div>
    <div className="mt-3 flex items-center gap-2 border-t border-stone-100 pt-2 text-[11px] text-stone-500"><span className={`rounded-md px-1.5 py-1 font-semibold capitalize ${priorityStyle[task.priority]}`}>{task.priority}</span><Clock3 className="ml-auto h-3.5 w-3.5 text-amber-600" />{task.dueDate}{task.calendarItemId && <CalendarDays className="h-3.5 w-3.5 text-teal-600" />}{task.notesLinked && <NotebookPen className="h-3.5 w-3.5 text-violet-600" />}</div>
  </div>;
}

function BoardDialog({ board, pending, onClose, onSave, onDelete }: { board?: Board; pending: boolean; onClose: () => void; onSave: (input: { name: string; color: string }) => void; onDelete?: () => void }) {
  return <Modal onClose={onClose}><form onSubmit={(event) => { event.preventDefault(); const data = new FormData(event.currentTarget); onSave({ name: String(data.get("name")), color: String(data.get("color")) }); }}>
    <DialogHeader eyebrow={board ? "Tune your workspace" : "Start something clear"} title={board ? "Edit board" : "New Kanban board"} onClose={onClose} />
    <div className="mt-5 grid gap-4 sm:grid-cols-[1fr_90px]"><label className="text-sm font-medium">Board name<input name="name" required maxLength={80} autoFocus defaultValue={board?.name} placeholder="Website launch" className="mt-1.5 h-11 w-full rounded-xl border border-stone-200 bg-white px-3" /></label><label className="text-sm font-medium">Color<input name="color" type="color" defaultValue={board?.color ?? "#2563eb"} className="mt-1.5 h-11 w-full rounded-xl border border-stone-200 bg-white p-1" /></label></div>
    <div className="mt-6 flex flex-wrap justify-between gap-2">{onDelete ? <button type="button" onClick={onDelete} className="h-10 rounded-xl bg-rose-50 px-3 text-sm font-medium text-rose-700 hover:bg-rose-100">Delete board</button> : <span />}<button disabled={pending} className="h-10 rounded-xl bg-[#a54f36] px-5 text-sm font-medium text-white disabled:opacity-50">{pending ? "Saving..." : board ? "Save changes" : "Create board"}</button></div>
  </form></Modal>;
}

function TaskDialog({ task, labels, pending, onClose, onSave, onDelete, onCreateLabel }: { task?: Task; labels: Label[]; pending: boolean; onClose: () => void; onSave: (input: TaskDraft) => void; onDelete?: () => void; onCreateLabel: (input: { name: string; color: string }) => Promise<Label> }) {
  const [selected, setSelected] = useState(task?.labels.map((label) => label.id) ?? []);
  const [calendarSynced, setCalendarSynced] = useState(Boolean(task?.calendarItemId));
  const [notesLinked, setNotesLinked] = useState(Boolean(task?.notesLinked));
  const [newLabel, setNewLabel] = useState(false);
  const [labelError, setLabelError] = useState("");
  return <Modal onClose={onClose} wide><form onSubmit={(event) => { event.preventDefault(); const data = new FormData(event.currentTarget); onSave({ title: String(data.get("title")), description: String(data.get("description")), dueDate: String(data.get("dueDate")), priority: String(data.get("priority")) as TaskDraft["priority"], labelIds: selected, calendarSynced, notesLinked }); }}>
    <DialogHeader eyebrow={task ? "Review the details" : "Capture the next step"} title={task ? "Edit task" : "New task"} onClose={onClose} />
    <div className="mt-5 space-y-4"><label className="block text-sm font-medium">Title<input name="title" required maxLength={140} autoFocus defaultValue={task?.title} placeholder="What needs to happen?" className="mt-1.5 h-11 w-full rounded-xl border border-stone-200 bg-white px-3" /></label><label className="block text-sm font-medium">Description<textarea name="description" rows={3} maxLength={1000} defaultValue={task?.description ?? ""} className="mt-1.5 w-full resize-none rounded-xl border border-stone-200 bg-white p-3" /></label>
      <div className="grid gap-4 sm:grid-cols-2"><label className="text-sm font-medium">Due date<input name="dueDate" type="date" required defaultValue={task?.dueDate ?? today()} className="mt-1.5 h-11 w-full rounded-xl border border-stone-200 bg-white px-3" /></label><label className="text-sm font-medium">Priority<select name="priority" defaultValue={task?.priority ?? "medium"} className="mt-1.5 h-11 w-full rounded-xl border border-stone-200 bg-white px-3"><option value="low">Low</option><option value="medium">Medium</option><option value="high">High</option></select></label></div>
      <div><div className="flex items-center justify-between"><p className="text-sm font-medium">Labels</p><button type="button" onClick={() => setNewLabel((value) => !value)} className="flex items-center gap-1 text-xs font-semibold text-blue-700"><Tag className="h-3.5 w-3.5" />New label</button></div>{newLabel && <div className="mt-2 grid gap-2 rounded-xl bg-stone-100 p-3 sm:grid-cols-[1fr_70px_auto]"><input id="new-label-name" placeholder="Label name" className="h-10 rounded-lg border border-stone-200 bg-white px-3 text-sm" /><input id="new-label-color" type="color" defaultValue="#7c3aed" className="h-10 w-full rounded-lg border border-stone-200 bg-white p-1" /><button type="button" onClick={async () => { try { const name = (document.getElementById("new-label-name") as HTMLInputElement).value; const color = (document.getElementById("new-label-color") as HTMLInputElement).value; const label = await onCreateLabel({ name, color }); setSelected((current) => [...current, label.id]); setNewLabel(false); setLabelError(""); } catch (error) { setLabelError(error instanceof Error ? error.message : "Could not create label."); } }} className="h-10 rounded-lg bg-stone-900 px-3 text-sm text-white">Add</button></div>}{labelError && <p className="mt-2 text-xs text-rose-600">{labelError}</p>}<div className="mt-2 flex flex-wrap gap-2">{labels.map((label) => <button key={label.id} type="button" onClick={() => setSelected((current) => current.includes(label.id) ? current.filter((id) => id !== label.id) : [...current, label.id])} className={`flex items-center gap-1.5 rounded-full border px-2.5 py-1.5 text-xs font-medium ${selected.includes(label.id) ? "border-stone-800 bg-stone-900 text-white" : "border-stone-200 bg-white text-stone-600"}`}><span className="h-2 w-2 rounded-full" style={{ backgroundColor: label.color }} />{label.name}{selected.includes(label.id) && <Check className="h-3 w-3" />}</button>)}</div></div>
      <Toggle checked={calendarSynced} onChange={setCalendarSynced} icon={<CalendarDays className="h-4 w-4 text-teal-600" />} title="Sync with Calendar" detail="Keep title, description, due date, and primary label linked." /><Toggle checked={notesLinked} onChange={setNotesLinked} icon={<NotebookPen className="h-4 w-4 text-violet-600" />} title="Link with Notes" detail="Save the connection indicator for the upcoming Notes workspace." />
    </div>
    <div className="mt-6 flex flex-wrap justify-between gap-2">{onDelete ? <button type="button" onClick={onDelete} className="h-10 rounded-xl bg-rose-50 px-3 text-sm font-medium text-rose-700">Delete task</button> : <span />}<button disabled={pending} className="h-10 rounded-xl bg-[#a54f36] px-5 text-sm font-medium text-white disabled:opacity-50">{pending ? "Saving..." : task ? "Save changes" : "Create task"}</button></div>
  </form></Modal>;
}

function Toggle({ checked, onChange, icon, title, detail }: { checked: boolean; onChange: (value: boolean) => void; icon: React.ReactNode; title: string; detail: string }) {
  return <button type="button" onClick={() => onChange(!checked)} className="flex w-full items-center gap-3 rounded-xl border border-stone-200 bg-white p-3 text-left hover:bg-stone-50"><span className="flex h-9 w-9 items-center justify-center rounded-lg bg-stone-100">{icon}</span><span className="min-w-0 flex-1"><span className="block text-sm font-medium">{title}</span><span className="block text-xs text-stone-500">{detail}</span></span><span className={`relative h-6 w-11 rounded-full transition ${checked ? "bg-[#a54f36]" : "bg-stone-300"}`}><span className={`absolute top-1 h-4 w-4 rounded-full bg-white transition ${checked ? "left-6" : "left-1"}`} /></span></button>;
}

function Modal({ children, onClose, wide = false }: { children: React.ReactNode; onClose: () => void; wide?: boolean }) {
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-stone-950/35 p-3 backdrop-blur-sm" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><div className={`max-h-[94vh] w-full overflow-y-auto rounded-2xl border border-stone-200 bg-[#fffdfa] p-5 shadow-2xl sm:p-6 ${wide ? "max-w-2xl" : "max-w-lg"}`}>{children}</div></div>;
}

function DialogHeader({ eyebrow, title, onClose }: { eyebrow: string; title: string; onClose: () => void }) {
  return <div className="flex items-start justify-between gap-4"><div><p className="text-xs font-semibold uppercase text-blue-700">{eyebrow}</p><h2 className="mt-1 text-2xl font-semibold">{title}</h2></div><button type="button" onClick={onClose} className="flex h-9 w-9 items-center justify-center rounded-xl border border-stone-200 bg-white hover:bg-stone-50"><X className="h-4 w-4" /></button></div>;
}
