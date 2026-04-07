import { useCallback, useEffect, useState } from "react";
import {
    ReactFlow,
    useNodesState,
    useEdgesState,
    ReactFlowProvider,
    useReactFlow,
    Controls,
    Background,
    BackgroundVariant,
    MiniMap,
    MarkerType,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { router } from "@inertiajs/react";
import { Plus, LayoutGrid, Zap } from "lucide-react";
import TaskNode from "@/components/flow/TaskNode";
import { wouldCreateCycle } from "@/utils/cycleDetection";

// ─── Constants ────────────────────────────────────────────────────────────────

const nodeTypes = { customTaskNode: TaskNode };

const STATUS_ORDER = { backlog: 0, in_progress: 1, in_review: 2, done: 3 };
const COL_WIDTH = 320;
const ROW_HEIGHT = 220;
const COL_OFFSET = 40; // slight diagonal cascade per row

const STATUS_OPTIONS = [
    { status: "backlog", label: "Backlog" },
    { status: "in_progress", label: "In Progress" },
    { status: "in_review", label: "In Review" },
    { status: "done", label: "Done" },
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getAutoPosition(task, indexInColumn) {
    const col = STATUS_ORDER[task.status] ?? 0;
    return {
        x: col * COL_WIDTH + indexInColumn * COL_OFFSET,
        y: indexInColumn * ROW_HEIGHT + 60,
    };
}

function buildNodes(tasks, onTaskClick) {
    const colIndex = {};

    return tasks.map((task) => {
        const s = task.status;
        const idx = colIndex[s] ?? 0;
        colIndex[s] = idx + 1;

        const hasStoredPos = task.x_pos !== 0 || task.y_pos !== 0;
        const position = hasStoredPos
            ? { x: task.x_pos, y: task.y_pos }
            : getAutoPosition(task, idx);

        return {
            id: task.id.toString(),
            type: "customTaskNode",
            position,
            data: { task, onTaskClick },
        };
    });
}

function buildEdges(tasks) {
    const edges = [];

    tasks.forEach((task) => {
        (task.dependencies ?? []).forEach((dep) => {
            const isDone = dep.status === "done";
            edges.push({
                id: `e${dep.id}-${task.id}`,
                source: dep.id.toString(),
                target: task.id.toString(),
                type: "smoothstep",
                animated: !isDone,
                style: {
                    stroke: isDone ? "#4fffb0" : "#7c6aff",
                    strokeWidth: 2,
                },
                markerEnd: {
                    type: MarkerType.ArrowClosed,
                    color: isDone ? "#4fffb0" : "#7c6aff",
                    width: 16,
                    height: 16,
                },
            });
        });
    });

    return edges;
}

// ─── Inner canvas (must live inside ReactFlowProvider) ────────────────────────

function FlowViewInner({ workspace, project, tasks, onTaskClick }) {
    const { screenToFlowPosition, fitView } = useReactFlow();

    const [nodes, setNodes, onNodesChange] = useNodesState([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState([]);
    const [contextMenu, setContextMenu] = useState(null);
    const [isCreating, setIsCreating] = useState(false);
    const [errorToast, setErrorToast] = useState(null);

    // Rebuild nodes/edges whenever the tasks prop changes
    useEffect(() => {
        setNodes(buildNodes(tasks, onTaskClick));
        setEdges(buildEdges(tasks));
    }, [tasks, onTaskClick, setNodes, setEdges]);

    // ── Drag-stop: persist position silently via fetch (no Inertia re-render)
    const onNodeDragStop = useCallback(
        (_event, node) => {
            const csrfToken = document.cookie
                .split("; ")
                .find((row) => row.startsWith("XSRF-TOKEN="))
                ?.split("=")[1];

            fetch(
                `/workspaces/${workspace.slug}/projects/${project.slug}/tasks/${node.id}`,
                {
                    method: "PATCH",
                    headers: {
                        "Content-Type": "application/json",
                        Accept: "application/json",
                        "X-Requested-With": "XMLHttpRequest",
                        ...(csrfToken
                            ? { "X-XSRF-TOKEN": decodeURIComponent(csrfToken) }
                            : {}),
                    },
                    body: JSON.stringify({
                        x_pos: Math.round(node.position.x),
                        y_pos: Math.round(node.position.y),
                    }),
                },
            ).catch(console.error);
        },
        [workspace.slug, project.slug],
    );

    // ── Connect: drag from one handle to another → create dependency
    const onConnect = useCallback(
        (params) => {
            const { source, target } = params;

            // Prevent self-loops
            if (source === target) return;

            const targetTask = tasks.find((t) => t.id.toString() === target);
            if (!targetTask) return;

            const existingDepIds = (targetTask.dependencies ?? []).map(
                (d) => d.id,
            );
            const sourceId = parseInt(source, 10);

            if (existingDepIds.includes(sourceId)) return; // already linked

            // Frontend cycle guard — immediate feedback without a server round-trip
            if (
                wouldCreateCycle(
                    tasks,
                    parseInt(target, 10),
                    parseInt(source, 10),
                )
            ) {
                setErrorToast(
                    "Circular dependency detected — this connection would create a deadlock.",
                );
                const timer = setTimeout(() => setErrorToast(null), 4500);
                // Clean up the timer reference if the component unmounts
                return () => clearTimeout(timer);
            }

            router.patch(
                `/workspaces/${workspace.slug}/projects/${project.slug}/tasks/${target}`,
                { dependencies: [...existingDepIds, sourceId] },
                { preserveScroll: true, preserveState: true },
            );
        },
        [tasks, workspace.slug, project.slug],
    );

    // ── Edge delete: remove the dependency from the database
    const onEdgesDelete = useCallback(
        (deletedEdges) => {
            deletedEdges.forEach((edge) => {
                const targetTask = tasks.find(
                    (t) => t.id.toString() === edge.target,
                );
                if (!targetTask) return;

                const sourceId = parseInt(edge.source, 10);
                const newDeps = (targetTask.dependencies ?? [])
                    .filter((d) => d.id !== sourceId)
                    .map((d) => d.id);

                router.patch(
                    `/workspaces/${workspace.slug}/projects/${project.slug}/tasks/${edge.target}`,
                    { dependencies: newDeps },
                    { preserveScroll: true, preserveState: true },
                );
            });
        },
        [tasks, workspace.slug, project.slug],
    );

    // ── Right-click context menu
    const onPaneContextMenu = useCallback(
        (event) => {
            event.preventDefault();
            const flowPos = screenToFlowPosition({
                x: event.clientX,
                y: event.clientY,
            });
            setContextMenu({
                screenX: event.clientX,
                screenY: event.clientY,
                flowX: Math.round(flowPos.x),
                flowY: Math.round(flowPos.y),
            });
        },
        [screenToFlowPosition],
    );

    const closeContextMenu = useCallback(() => setContextMenu(null), []);

    // ── Create task from context menu at canvas position
    const createTaskAtPosition = useCallback(
        (status) => {
            if (!contextMenu || isCreating) return;
            setIsCreating(true);

            router.post(
                `/workspaces/${workspace.slug}/projects/${project.slug}/tasks`,
                {
                    title: "New Task",
                    status,
                    x_pos: contextMenu.flowX,
                    y_pos: contextMenu.flowY,
                },
                {
                    preserveScroll: true,
                    preserveState: true,
                    onFinish: () => setIsCreating(false),
                },
            );
            setContextMenu(null);
        },
        [contextMenu, isCreating, workspace.slug, project.slug],
    );

    // ── Auto-layout (fit-to-screen shortcut)
    const handleFitView = useCallback(() => {
        fitView({ padding: 0.15, duration: 600 });
    }, [fitView]);

    // ─────────────────────────────────────────────────────────────────────────

    return (
        <div className="relative h-full w-full" onClick={closeContextMenu}>
            {/* ── Cycle detection error toast ── */}
            {errorToast && (
                <div className="pointer-events-none absolute inset-x-0 top-6 z-50 flex justify-center px-6">
                    <div className="flex items-center gap-3 rounded-2xl border border-red-500/30 bg-red-500/10 px-5 py-3 shadow-2xl backdrop-blur-sm">
                        <div className="h-2 w-2 shrink-0 rounded-full bg-red-400 animate-pulse" />
                        <p className="text-xs font-black uppercase tracking-widest text-red-300">
                            {errorToast}
                        </p>
                    </div>
                </div>
            )}
            <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onNodeDragStop={onNodeDragStop}
                onConnect={onConnect}
                onEdgesDelete={onEdgesDelete}
                onPaneContextMenu={onPaneContextMenu}
                onPaneClick={closeContextMenu}
                nodeTypes={nodeTypes}
                fitView
                fitViewOptions={{ padding: 0.2, duration: 400 }}
                minZoom={0.15}
                maxZoom={2.5}
                deleteKeyCode={["Delete", "Backspace"]}
                style={{ background: "#0a0a0b" }}
                proOptions={{ hideAttribution: true }}
            >
                {/* Dot-grid background matching the dark theme */}
                <Background
                    variant={BackgroundVariant.Dots}
                    gap={28}
                    size={1.2}
                    color="#252528"
                />

                {/* Controls — dark-styled */}
                <Controls
                    showInteractive={false}
                    style={{
                        background: "#111113",
                        border: "1px solid #252528",
                        borderRadius: "16px",
                        padding: "4px",
                        boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
                    }}
                />

                {/* Mini-map — dark-styled */}
                <MiniMap
                    style={{
                        background: "#111113",
                        border: "1px solid #252528",
                        borderRadius: "16px",
                        boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
                    }}
                    nodeColor={(node) => {
                        const status = node.data?.task?.status;
                        if (status === "done") return "#4fffb0";
                        if (status === "in_progress") return "#40c8ff";
                        if (status === "in_review") return "#ffa040";
                        return "#7c6aff";
                    }}
                    maskColor="rgba(0,0,0,0.65)"
                />
            </ReactFlow>

            {/* ── Canvas toolbar overlay ── */}
            <div className="pointer-events-none absolute left-4 top-4 z-10 flex items-center gap-2">
                <div className="pointer-events-auto flex items-center gap-2 rounded-2xl border border-border bg-surface/90 px-4 py-2 shadow-xl backdrop-blur-sm">
                    <Zap size={13} className="text-accent" strokeWidth={2.5} />
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted">
                        Flow Canvas
                    </span>
                    <span className="mx-1 h-4 w-px bg-border" />
                    <button
                        onClick={handleFitView}
                        className="flex items-center gap-1.5 rounded-xl border border-border/60 bg-surface2/80 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-muted transition-all hover:border-accent/40 hover:text-accent"
                    >
                        <LayoutGrid size={11} strokeWidth={2.5} />
                        Fit
                    </button>
                </div>

                <div className="pointer-events-auto rounded-2xl border border-border bg-surface/90 px-4 py-2 shadow-xl backdrop-blur-sm">
                    <p className="text-[10px] font-black uppercase tracking-[0.18em] text-muted">
                        <span className="text-accent">{tasks.length}</span>{" "}
                        tasks ·{" "}
                        <span className="text-accent">{edges.length}</span>{" "}
                        links
                    </p>
                </div>
            </div>

            {/* ── Legend overlay ── */}
            <div className="pointer-events-none absolute bottom-4 left-4 z-10">
                <div className="rounded-2xl border border-border bg-surface/80 px-4 py-3 shadow-xl backdrop-blur-sm">
                    <p className="mb-2 text-[9px] font-black uppercase tracking-[0.2em] text-muted">
                        Tip
                    </p>
                    <ul className="space-y-1 text-[10px] text-muted">
                        <li>
                            <span className="text-accent">Drag handle</span> →
                            create dependency
                        </li>
                        <li>
                            <span className="text-accent">Right-click</span> →
                            new task here
                        </li>
                        <li>
                            <span className="text-accent">Delete</span> → remove
                            selected edge
                        </li>
                        <li>
                            <span className="text-accent">Open</span> → edit
                            task details
                        </li>
                    </ul>
                </div>
            </div>

            {/* ── Right-click context menu ── */}
            {contextMenu && (
                <div
                    className="fixed z-50 min-w-[220px] overflow-hidden rounded-2xl border border-border bg-surface shadow-2xl"
                    style={{
                        top: contextMenu.screenY,
                        left: contextMenu.screenX,
                        // Nudge left/up if near the right/bottom edge
                        transform: "translate(-4px, -4px)",
                    }}
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Header */}
                    <div className="border-b border-border px-4 py-3">
                        <p className="text-[10px] font-black uppercase tracking-[0.22em] text-muted">
                            Create Task
                        </p>
                        <p className="mt-0.5 text-[9px] text-muted/60 font-mono">
                            at ({contextMenu.flowX}, {contextMenu.flowY})
                        </p>
                    </div>

                    {/* Status options */}
                    <div className="p-2">
                        {STATUS_OPTIONS.map(({ status, label }) => {
                            const dotColor =
                                status === "done"
                                    ? "bg-[#4fffb0]"
                                    : status === "in_progress"
                                      ? "bg-[#40c8ff]"
                                      : status === "in_review"
                                        ? "bg-[#ffa040]"
                                        : "bg-muted";

                            return (
                                <button
                                    key={status}
                                    disabled={isCreating}
                                    onClick={() => createTaskAtPosition(status)}
                                    className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-bold text-white transition-colors hover:bg-surface2 disabled:opacity-40"
                                >
                                    <div
                                        className={`h-2 w-2 shrink-0 rounded-full ${dotColor}`}
                                    />
                                    {label}
                                    <Plus
                                        size={13}
                                        className="ml-auto text-accent opacity-0 transition-opacity group-hover:opacity-100"
                                    />
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}

// ─── Public export — wraps the inner canvas in the required provider ───────────

export default function FlowView(props) {
    return (
        <ReactFlowProvider>
            <FlowViewInner {...props} />
        </ReactFlowProvider>
    );
}
