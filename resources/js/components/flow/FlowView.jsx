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
import axios from "axios";
import { Plus, LayoutGrid, Zap, Minimize2, Map, HelpCircle } from "lucide-react";
import TaskNode from "@/components/flow/TaskNode";
import { wouldCreateCycle } from "@/utils/cycleDetection";
import { getResolvableDependencies } from "@/utils/taskDependencies";

// ── Palette tokens ────────────────────────────────────────────────────────────
const C = {
    bg:      "#ede0c8",
    card:    "#f3e4c9",
    navy:    "#0a2947",
    brown:   "#8b5e3c",
    sage:    "#d3d4c0",
    border:  "rgba(139,94,60,0.18)",
    muted:   "rgba(10,41,71,0.45)",
    faint:   "rgba(10,41,71,0.25)",
};

const nodeTypes = { customTaskNode: TaskNode };

const STATUS_ORDER = { backlog: 0, in_progress: 1, in_review: 2, done: 3 };
const COL_WIDTH = 320;
const ROW_HEIGHT = 220;
const COL_OFFSET = 40;

const STATUS_OPTIONS = [
    { status: "backlog", label: "Backlog" },
    { status: "in_progress", label: "In Progress" },
    { status: "in_review", label: "In Review" },
    { status: "done", label: "Done" },
];

function getAutoPosition(task, indexInColumn) {
    const col = STATUS_ORDER[task.status] ?? 0;
    return {
        x: col * COL_WIDTH + indexInColumn * COL_OFFSET,
        y: indexInColumn * ROW_HEIGHT + 60,
    };
}

function buildNodes(
    tasks,
    onTaskClick,
    onTaskDelete,
    locks = {},
    workspace = null,
    recentTaskIds = [],
    deletingTaskIds = [],
    density = "informed",
) {
    const colIndex = {};

    return tasks.map((task) => {
        const s = task.status;
        const idx = colIndex[s] ?? 0;
        colIndex[s] = idx + 1;

        const hasStoredPos = task.x_pos !== 0 || task.y_pos !== 0;
        const position = hasStoredPos
            ? { x: task.x_pos, y: task.y_pos }
            : getAutoPosition(task, idx);

        const userId = locks[task.id];
        const occupantMember = workspace?.members?.find((m) => m.id === userId);

        return {
            id: task.id.toString(),
            type: "customTaskNode",
            position,
            data: { 
                task, 
                onTaskClick,
                onTaskDelete,
                isLocked: !!userId,
                occupantName: occupantMember?.name || "Someone",
                occupantColor: occupantMember?.pivot?.color || "#8b5e3c",
                isRecent: recentTaskIds.includes(task.id),
                isDeleting: deletingTaskIds.includes(task.id),
                isBlocked: getResolvableDependencies(task, tasks).some(
                    (dep) => dep.status !== "done",
                ),
                density,
            },
        };
    });
}

function buildEdges(tasks) {
    const edges = [];

    tasks.forEach((task) => {
        getResolvableDependencies(task, tasks).forEach((dep) => {
            const isDone = dep.status === "done";
            const edgeColor = isDone ? "#2d6a4f" : "#8b5e3c";
            edges.push({
                id: `e${dep.id}-${task.id}`,
                source: dep.id.toString(),
                target: task.id.toString(),
                type: "smoothstep",
                animated: !isDone,
                style: {
                    stroke: edgeColor,
                    strokeWidth: 2.5,
                },
                markerEnd: {
                    type: MarkerType.ArrowClosed,
                    color: edgeColor,
                    width: 16,
                    height: 16,
                },
            });
        });
    });

    return edges;
}

// ─── Inner canvas (must live inside ReactFlowProvider) ────────────────────────

function FlowViewInner({
    workspace,
    project,
    tasks,
    onTaskClick,
    onTaskUpdated,
    onTaskDelete,
    locks = {},
    presenceMembers = [],
    recentTaskIds = [],
    deletingTaskIds = [],
    density = "informed",
}) {
    const { screenToFlowPosition, fitView } = useReactFlow();

    const [nodes, setNodes, onNodesChange] = useNodesState([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState([]);
    const [contextMenu, setContextMenu] = useState(null);
    const [isCreating, setIsCreating] = useState(false);
    const [errorToast, setErrorToast] = useState(null);
    const [isMiniMapOpen, setIsMiniMapOpen] = useState(true);
    const [isTipOpen, setIsTipOpen] = useState(true);

    const patchTask = useCallback(
        async (taskId, payload) => {
            const { data } = await axios.patch(
                `/workspaces/${workspace.slug}/projects/${project.slug}/tasks/${taskId}`,
                payload,
                {
                    headers: {
                        Accept: "application/json",
                        "X-Requested-With": "XMLHttpRequest",
                    },
                }
            );

            return data;
        },
        [project.slug, workspace.slug],
    );

    // Rebuild nodes/edges whenever the tasks prop changes
    useEffect(() => {
        setNodes(
            buildNodes(
                tasks,
                onTaskClick,
                onTaskDelete,
                locks,
                workspace,
                recentTaskIds,
                deletingTaskIds,
                density,
            ),
        );
        setEdges(buildEdges(tasks));
    }, [
        tasks,
        onTaskClick,
        onTaskDelete,
        setNodes,
        setEdges,
        locks,
        workspace,
        recentTaskIds,
        deletingTaskIds,
    ]);

    const onNodeDragStart = useCallback(
        (_event, node) => {
            axios.post(
                `/workspaces/${workspace.slug}/projects/${project.slug}/tasks/${node.id}/lock`,
            );
        },
        [workspace.slug, project.slug],
    );

    const onNodeDragStop = useCallback(
        (_event, node) => {
            const nextPosition = {
                x_pos: Math.round(node.position.x),
                y_pos: Math.round(node.position.y),
            };

            onTaskUpdated(Number(node.id), nextPosition);

            patchTask(node.id, nextPosition)
                .then(({ task }) => {
                    if (task) {
                        onTaskUpdated(task.id, task);
                    }
                })
                .catch((error) => {
                    console.error("Failed to persist node position", error);
                })
                .finally(() => {
                    axios.post(
                        `/workspaces/${workspace.slug}/projects/${project.slug}/tasks/${node.id}/unlock`,
                    ).catch(console.error);
                });
        },
        [onTaskUpdated, patchTask, workspace.slug, project.slug],
    );

    const onConnect = useCallback(
        (params) => {
            const { source, target } = params;

            if (source === target) return;

            const targetTask = tasks.find((t) => t.id.toString() === target);
            if (!targetTask) return;

            const existingDepIds = (targetTask.dependencies ?? []).map(
                (d) => d.id,
            );
            const sourceId = parseInt(source, 10);

            if (existingDepIds.includes(sourceId)) return;

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
                return () => clearTimeout(timer);
            }

            const nextDeps = [...existingDepIds, sourceId];
            const dependencyTasks = tasks.filter((task) =>
                nextDeps.includes(task.id),
            );

            setEdges((currentEdges) => [
                ...currentEdges,
                {
                    id: `e${source}-${target}`,
                    source,
                    target,
                    type: "smoothstep",
                    animated: true,
                    style: {
                        stroke: C.brown,
                        strokeWidth: 2.5,
                    },
                    markerEnd: {
                        type: MarkerType.ArrowClosed,
                        color: C.brown,
                        width: 16,
                        height: 16,
                    },
                },
            ]);

            onTaskUpdated(parseInt(target, 10), {
                dependencies: dependencyTasks,
            });

            patchTask(target, { dependencies: nextDeps })
                .then(({ task }) => {
                    if (task) {
                        onTaskUpdated(task.id, task);
                    }
                })
                .catch((error) => {
                    console.error("Failed to create dependency", error);
                    setEdges((currentEdges) =>
                        currentEdges.filter((edge) => edge.id !== `e${source}-${target}`),
                    );
                    onTaskUpdated(parseInt(target, 10), {
                        dependencies: targetTask.dependencies ?? [],
                    });
                });
        },
        [tasks, onTaskUpdated, patchTask],
    );

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

                const previousDeps = targetTask.dependencies ?? [];

                onTaskUpdated(parseInt(edge.target, 10), {
                    dependencies: previousDeps.filter((d) => d.id !== sourceId),
                });

                patchTask(edge.target, { dependencies: newDeps })
                    .then(({ task }) => {
                        if (task) {
                            onTaskUpdated(task.id, task);
                        }
                    })
                    .catch((error) => {
                        console.error("Failed to remove dependency", error);
                        onTaskUpdated(parseInt(edge.target, 10), {
                            dependencies: previousDeps,
                        });
                    });
            });
        },
        [tasks, onTaskUpdated, patchTask],
    );

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

    const createTaskAtPosition = useCallback(
        (status) => {
            if (!contextMenu || isCreating) return;
            setIsCreating(true);

            axios
                .post(
                    `/workspaces/${workspace.slug}/projects/${project.slug}/tasks`,
                    {
                        title: "New Task",
                        status,
                        x_pos: contextMenu.flowX,
                        y_pos: contextMenu.flowY,
                    },
                    {
                        headers: {
                            Accept: "application/json",
                            "X-Requested-With": "XMLHttpRequest",
                        },
                    },
                )
                .then(({ data }) => {
                    if (data?.task) {
                        onTaskUpdated(data.task.id, data.task);
                    }
                })
                .catch((error) => {
                    console.error("Failed to create task in flow", error);
                })
                .finally(() => {
                    setIsCreating(false);
                });
            setContextMenu(null);
        },
        [contextMenu, isCreating, onTaskUpdated, workspace.slug, project.slug],
    );

    const handleFitView = useCallback(() => {
        fitView({ padding: 0.15, duration: 600 });
    }, [fitView]);

    return (
        <div className="relative h-full w-full" onClick={closeContextMenu}>
            {/* ── Cycle detection error toast ── */}
            {errorToast && (
                <div className="pointer-events-none absolute inset-x-0 top-6 z-50 flex justify-center px-6">
                    <div className="flex items-center gap-3 rounded-2xl border px-5 py-3 shadow-2xl backdrop-blur-sm"
                        style={{ borderColor: "rgba(192,57,43,0.25)", background: "rgba(192,57,43,0.08)", color: "#c0392b" }}>
                        <div className="h-2 w-2 shrink-0 rounded-full bg-red-600 animate-pulse" />
                        <p className="text-xs font-black uppercase tracking-widest">
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
                onNodeDragStart={onNodeDragStart}
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
                style={{ background: C.bg }}
                proOptions={{ hideAttribution: true }}
            >
                {/* Dot-grid background matching the parchment theme */}
                <Background
                    variant={BackgroundVariant.Dots}
                    gap={28}
                    size={1.2}
                    color="rgba(139,94,60,0.18)"
                />




            </ReactFlow>

            {/* ── Canvas toolbar overlay ── */}
            <div className="pointer-events-none absolute left-4 top-4 z-10 flex items-center gap-2">
                <div className="pointer-events-auto flex items-center gap-2 rounded-2xl border px-4 py-2 shadow-sm backdrop-blur-sm"
                    style={{ background: "rgba(243,228,201,0.9)", borderColor: C.border }}>
                    <Zap size={13} style={{ color: C.brown }} strokeWidth={2.5} />
                    <span className="text-[10px] font-black uppercase tracking-[0.2em]" style={{ color: C.muted }}>
                        Flow Canvas
                    </span>
                    <span className="mx-1 h-4 w-px" style={{ background: C.border }} />
                    <button
                        onClick={handleFitView}
                        className="flex items-center gap-1.5 rounded-xl border px-3 py-1 text-[10px] font-black uppercase tracking-widest transition-all"
                        style={{ borderColor: "rgba(139,94,60,0.2)", bg: "transparent", color: C.muted }}
                        onMouseEnter={e => { e.currentTarget.style.borderColor = C.brown; e.currentTarget.style.color = C.brown; }}
                        onMouseLeave={e => { e.currentTarget.style.borderColor = "rgba(139,94,60,0.2)"; e.currentTarget.style.color = C.muted; }}
                    >
                        <LayoutGrid size={11} strokeWidth={2.5} />
                        Fit
                    </button>
                </div>

                <div className="pointer-events-auto rounded-2xl border px-4 py-2 shadow-sm backdrop-blur-sm"
                    style={{ background: "rgba(243,228,201,0.9)", borderColor: C.border }}>
                    <p className="text-[10px] font-black uppercase tracking-[0.18em]" style={{ color: C.muted }}>
                        <span style={{ color: C.brown }}>{tasks.length}</span>{" "}
                        tasks ·{" "}
                        <span style={{ color: C.brown }}>{edges.length}</span>{" "}
                        links
                    </p>
                </div>
            </div>

            {/* ── Legend overlay ── */}
            {isTipOpen ? (
                <div className="pointer-events-none absolute bottom-4 left-4 z-10">
                    <div className="pointer-events-auto rounded-2xl border px-4 py-3 shadow-sm backdrop-blur-sm"
                        style={{ background: "rgba(243,228,201,0.9)", borderColor: C.border }}>
                        <div className="flex items-center justify-between mb-2">
                            <p className="text-[9px] font-black uppercase tracking-[0.2em]" style={{ color: C.brown }}>
                                Tips & Legend
                            </p>
                            <button onClick={() => setIsTipOpen(false)} className="ml-4 hover:text-[#8b5e3c]" style={{ color: C.navy }}>
                                <Minimize2 size={10} style={{ color: C.brown }} strokeWidth={2.5} />
                            </button>
                        </div>
                        <ul className="space-y-1 text-[10px]" style={{ color: C.muted }}>
                            <li>
                                <span style={{ color: C.brown }}>Drag handle</span> →
                                dependency
                            </li>
                            <li>
                                <span style={{ color: C.brown }}>Right-click</span> →
                                new task
                            </li>
                            <li>
                                <span style={{ color: C.brown }}>Delete</span> → remove link
                            </li>
                            <li>
                                <span style={{ color: C.brown }}>Open</span> → edit details
                            </li>
                        </ul>
                    </div>
                </div>
            ) : (
                <button
                    onClick={() => setIsTipOpen(true)}
                    className="pointer-events-auto absolute bottom-4 left-4 z-10 flex h-8 w-8 items-center justify-center rounded-full border shadow-md transition-all hover:scale-110"
                    style={{ background: C.card, borderColor: C.border, color: C.navy }}
                    title="Show Tips"
                >
                    <HelpCircle size={14} style={{ color: C.brown }} />
                </button>
            )}

            {/* ── Mini-map overlay ── */}
            {isMiniMapOpen ? (
                <div className="pointer-events-none absolute bottom-4 right-4 z-10 flex flex-col items-end gap-1.5 animate-in slide-in-from-bottom-2 duration-200">
                    <div className="pointer-events-auto flex w-[150px] items-center justify-between rounded-t-2xl border px-3 py-1.5 text-[8px] font-black uppercase tracking-wider shadow-sm"
                         style={{ background: C.card, borderColor: C.border, color: C.navy }}>
                        <span>Navigator</span>
                        <button onClick={() => setIsMiniMapOpen(false)} className="hover:opacity-75 transition-opacity">
                            <Minimize2 size={10} style={{ color: C.brown }} strokeWidth={2.5} />
                        </button>
                    </div>
                    <div className="pointer-events-auto overflow-hidden rounded-b-2xl shadow-lg border-x border-b"
                         style={{ borderColor: C.border, background: C.card }}>
                        <MiniMap
                            style={{
                                background: 'transparent',
                                width: 150,
                                height: 110,
                                margin: 0,
                                border: 'none',
                                position: 'relative'
                            }}
                            nodeBorderRadius={14}
                            nodeColor={(node) => {
                                const status = node.data?.task?.status;
                                if (status === "done") return "#2d6a4f";
                                if (status === "in_progress") return "#b45309";
                                if (status === "in_review") return "#7c5c1e";
                                return "#0a2947";
                            }}
                            maskColor="rgba(237,224,200,0.4)"
                        />
                    </div>
                </div>
            ) : (
                <button
                    onClick={() => setIsMiniMapOpen(true)}
                    className="pointer-events-auto absolute bottom-4 right-4 z-10 flex h-8 w-8 items-center justify-center rounded-full border shadow-md transition-all hover:scale-110"
                    style={{ background: C.card, borderColor: C.border, color: C.navy }}
                    title="Open Navigator"
                >
                    <Map size={14} style={{ color: C.brown }} />
                </button>
            )}

            {/* ── Right-click context menu ── */}
            {contextMenu && (
                <div
                    className="fixed z-50 min-w-[220px] overflow-hidden rounded-2xl border shadow-2xl"
                    style={{
                        top: contextMenu.screenY,
                        left: contextMenu.screenX,
                        transform: "translate(-4px, -4px)",
                        background: C.card,
                        borderColor: C.border
                    }}
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Header */}
                    <div className="border-b px-4 py-3" style={{ borderColor: C.border }}>
                        <p className="text-[10px] font-black uppercase tracking-[0.22em]" style={{ color: C.muted }}>
                            Create Task
                        </p>
                        <p className="mt-0.5 text-[9px] font-mono" style={{ color: C.muted }}>
                            at ({contextMenu.flowX}, {contextMenu.flowY})
                        </p>
                    </div>

                    {/* Status options */}
                    <div className="p-2">
                        {STATUS_OPTIONS.map(({ status, label }) => {
                            const dotColor =
                                status === "done"
                                    ? "bg-[#2d6a4f]"
                                    : status === "in_progress"
                                      ? "bg-[#b45309]"
                                      : status === "in_review"
                                        ? "bg-[#7c5c1e]"
                                        : "bg-slate-400";

                            return (
                                <button
                                    key={status}
                                    disabled={isCreating}
                                    onClick={() => createTaskAtPosition(status)}
                                    className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-bold transition-colors hover:bg-black/5 disabled:opacity-40"
                                    style={{ color: C.navy }}
                                >
                                    <div
                                        className={`h-2 w-2 shrink-0 rounded-full ${dotColor}`}
                                    />
                                    {label}
                                    <Plus
                                        size={13}
                                        className="ml-auto opacity-0 transition-opacity group-hover:opacity-100"
                                        style={{ color: C.brown }}
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
