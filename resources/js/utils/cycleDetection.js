/**
 * Detects whether adding `proposedDepId` as a dependency of `taskId` would
 * introduce a circular dependency (deadlock) in the task graph.
 *
 * Algorithm — BFS starting from `proposedDepId`:
 *   Follow the existing dependency chain of proposedDepId (what it depends on,
 *   what those depend on, …). If we ever reach `taskId`, then taskId is already
 *   an upstream ancestor of proposedDepId, so the reverse link would close a loop.
 *
 * @param {Array}  tasks          Full flat array of project tasks.
 *                                Each task has: { id: number, dependencies: Array<{id, status, …}> }
 * @param {number} taskId         The task being updated (the one that would gain the new dep).
 * @param {number} proposedDepId  The candidate dependency being added.
 * @returns {boolean}             true → cycle would be created, false → safe to add.
 */
export function wouldCreateCycle(tasks, taskId, proposedDepId) {
    // Quick sanity check — self-dependency is always invalid
    if (taskId === proposedDepId) return true;

    const taskMap = new Map(tasks.map((t) => [t.id, t]));
    const visited = new Set();
    const queue   = [proposedDepId];

    while (queue.length > 0) {
        const currentId = queue.shift();

        // If we've looped back to the task being updated → cycle confirmed
        if (currentId === taskId) return true;
        if (visited.has(currentId)) continue;
        visited.add(currentId);

        const current = taskMap.get(currentId);
        if (!current) continue;

        for (const dep of (current.dependencies ?? [])) {
            if (!visited.has(dep.id)) {
                queue.push(dep.id);
            }
        }
    }

    return false;
}
