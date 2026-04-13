<?php

namespace App\Events;

use App\Models\ThreadReply;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class ThreadReplyCreated implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public $reply;
    public $projectId;

    /**
     * Create a new event instance.
     */
    public function __construct(ThreadReply $reply, int $projectId)
    {
        $this->reply = $reply;
        $this->projectId = $projectId;
    }

    /**
     * Get the channels the event should broadcast on.
     *
     * @return array<int, \Illuminate\Broadcasting\Channel>
     */
    public function broadcastOn(): array
    {
        return [
            new PrivateChannel('project.' . $this->projectId),
        ];
    }

    public function broadcastAs(): string
    {
        return 'ThreadReplyCreated';
    }
}
