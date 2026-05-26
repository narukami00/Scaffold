<?php

namespace App\Events;

use App\Models\Task;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PresenceChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class TaskControlTransferred implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public $task;
    public $newEditorId;

    /**
     * Create a new event instance.
     */
    public function __construct(Task $task, $newEditorId)
    {
        $this->task = $task;
        $this->newEditorId = $newEditorId;
    }

    /**
     * Get the channels the event should broadcast on.
     *
     * @return array<int, \Illuminate\Broadcasting\Channel>
     */
    public function broadcastOn(): array
    {
        return [
            new PresenceChannel("task." . $this->task->id),
        ];
    }

    public function broadcastAs(): string
    {
        return "ControlTransferred";
    }

    public function broadcastWith(): array
    {
        return [
            "taskId" => $this->task->id,
            "newEditorId" => $this->newEditorId,
        ];
    }
}
