<?php

namespace App\Http\Controllers;

use App\Models\GitHubWebhookDelivery;
use App\Jobs\ProcessGitHubWebhookJob;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

class GitHubWebhookController extends Controller
{
    public function handle(Request $request)
    {
        $signature = $request->header('X-Hub-Signature-256');
        $secret = config('services.github.webhook_secret');

        if (!$secret && app()->environment('production')) {
            Log::critical('GITHUB_WEBHOOK_SECRET is missing in production.');
            return response()->json(['message' => 'Webhook is not configured.'], 503);
        }

        if ($secret) {
            if (!$signature) {
                abort(403, 'Signature header missing.');
            }
            $rawPayload = $request->getContent();
            $expectedSignature = 'sha256=' . hash_hmac('sha256', $rawPayload, $secret);
            if (!hash_equals($expectedSignature, $signature)) {
                abort(403, 'Invalid signature.');
            }
        }

        $deliveryId = $request->header('X-GitHub-Delivery');
        $eventType = $request->header('X-GitHub-Event');
        if (!$deliveryId || !$eventType) {
            return response()->json([
                'message' => 'Required GitHub webhook headers are missing.',
            ], 422);
        }

        // Check deduplication
        if (GitHubWebhookDelivery::where('delivery_id', $deliveryId)->exists()) {
            return response()->json(['success' => true, 'message' => 'Duplicate event skipped.']);
        }

        GitHubWebhookDelivery::create([
            'delivery_id' => $deliveryId,
            'event_type' => $eventType,
            'processed_at' => now(),
        ]);

        // Dispatch job for async processing
        $payload = $request->json()->all();
        ProcessGitHubWebhookJob::dispatch($eventType, $payload, $deliveryId);

        return response()->json(['success' => true, 'message' => 'Webhook received and queued.']);
    }
}
