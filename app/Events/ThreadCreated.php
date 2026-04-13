<?php

namespace App\Events;

use App\Models\Thread;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class ThreadCreated implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public $thread;

    /**
     * Create a new event instance.
     */
    public function __construct(Thread $thread)
    {
        $this->thread = $thread;
    }

    /**
     * Get the channels the event should broadcast on.
     *
     * @return array<int, \Illuminate\Broadcasting\Channel>
     */
    public function broadcastOn(): array
    {
        return [
            new PrivateChannel('project.' . $this->thread->project_id),
        ];
    }

    public function broadcastAs(): string
    {
        return 'ThreadCreated';
    }
}
