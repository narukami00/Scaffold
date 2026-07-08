<?php

namespace App\Jobs;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

class ProcessGitHubWebhookJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    protected $eventType;
    protected $payload;
    protected $deliveryId;

    public function __construct(string $eventType, array $payload, ?string $deliveryId = null)
    {
        $this->eventType = $eventType;
        $this->payload = $payload;
        $this->deliveryId = $deliveryId;
    }

    public function handle()
    {
        Log::info("Processing GitHub webhook event: {$this->eventType} (Delivery: {$this->deliveryId})");
        
        // This will be filled in Phase 2 with detailed handlers!
    }
}
