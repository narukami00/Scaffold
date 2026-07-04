/**
 * Dependencies pointing at deleted tasks can linger in client state until the
 * next full reload. These helpers keep UI and payloads aligned with reality.
 */

export function getResolvableDependencies(task, allTasks = []) {
    const liveIds = new Set((allTasks || []).map((t) => Number(t.id)));

    return (task?.dependencies ?? []).filter((dep) =>
        liveIds.has(Number(dep.id)),
    );
}

export function isTaskBlocked(task, allTasks = []) {
    const liveTasksMap = new Map((allTasks || []).map((t) => [Number(t.id), t]));
    return getResolvableDependencies(task, allTasks).some((dep) => {
        const liveDep = liveTasksMap.get(Number(dep.id));
        return (liveDep ? liveDep.status : dep.status) !== "done";
    });
}

/**
 * Strip a deleted task from every remaining task's dependency list.
 * Keeps the deleted task in the list (for delete animations).
 */
export function pruneDependencyReferences(tasks, deletedTaskId) {
    const deletedId = Number(deletedTaskId);

    return (tasks || []).map((task) => {
        const dependencies = (task.dependencies ?? []).filter(
            (dep) => Number(dep.id) !== deletedId,
        );

        if (dependencies.length === (task.dependencies ?? []).length) {
            return task;
        }

        return { ...task, dependencies };
    });
}

/**
 * After a task is deleted, remove it from the board list and strip it from
 * every remaining task's dependency list.
 */
export function removeTaskAndPruneDependencies(tasks, deletedTaskId) {
    const deletedId = Number(deletedTaskId);

    return pruneDependencyReferences(
        (tasks || []).filter((task) => Number(task.id) !== deletedId),
        deletedId,
    );
}

export function pruneDependencyIds(depIds, allTasks = []) {
    const liveIds = new Set((allTasks || []).map((t) => Number(t.id)));

    return (depIds || []).filter((id) => liveIds.has(Number(id)));
}
