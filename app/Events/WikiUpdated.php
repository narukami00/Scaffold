<?php

namespace App\Events;

use App\Models\Wiki;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class WikiUpdated implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(public Wiki $wiki)
    {
    }

    public function broadcastOn(): array
    {
        return [
            new PrivateChannel('project.' . $this->wiki->project_id),
        ];
    }

    public function broadcastAs(): string
    {
        return 'WikiUpdated';
    }

    public function broadcastWith(): array
    {
        return [
            'wiki' => $this->wiki->only(['id', 'title', 'slug', 'content', 'project_id', 'user_id', 'updated_at']),
        ];
    }
}
