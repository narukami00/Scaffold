<?php

namespace App\Events;

use App\Models\Task;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PresenceChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class TaskUpdated implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public $task;

    /**
     * Create a new event instance.
     */
    public function __construct(Task $task)
    {
        $this->task = $task;
    }

    /**
     * Get the channels the event should broadcast on.
     *
     * @return array<int, \Illuminate\Broadcasting\Channel>
     */
    public function broadcastOn(): array
    {
        // Broadcast to both the project and task specific channels
        return [
            new PresenceChannel("project." . $this->task->project_id),
            new PresenceChannel("task." . $this->task->id),
        ];
    }

    /**
     * The event's broadcast name.
     */
    public function broadcastAs(): string
    {
        return 'TaskUpdated';
    }

    /**
     * Data to broadcast.
     */
    public function broadcastWith(): array
    {
        // Load all relationships needed for the modal and board
        $this->task->load([
            "assignee",
            "labels",
            "dependencies",
            "attachments.user",
        ]);

        return [
            "task" => $this->task,
        ];
    }
}
