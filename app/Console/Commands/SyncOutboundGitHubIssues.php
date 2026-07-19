<?php

namespace App\Console\Commands;

use App\Jobs\SyncOutboundGitHubIssueJob;
use App\Models\GitHubIssue;
use Illuminate\Console\Command;

class SyncOutboundGitHubIssues extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'github:sync-outbound';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Sync pending local task updates to GitHub Issues';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $this->info("Starting outbound GitHub Issues synchronization...");

        $pending = GitHubIssue::where('needs_sync', true)->pluck('id');

        if ($pending->isEmpty()) {
            $this->info("No pending issue updates found.");
            return 0;
        }

        $this->info("Queueing {$pending->count()} pending updates.");

        foreach ($pending as $id) {
            SyncOutboundGitHubIssueJob::dispatch($id);
        }

        $this->info("Outbound sync jobs dispatched.");
        return 0;
    }
}
