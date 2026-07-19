<?php

namespace App\Events;

use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class GitHubActivityUpdated implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public function __construct(public int $projectId, public string $eventType)
    {
    }

    public function broadcastOn(): array
    {
        return [new PrivateChannel('project.'.$this->projectId)];
    }

    public function broadcastAs(): string
    {
        return 'GitHubActivityUpdated';
    }
}
