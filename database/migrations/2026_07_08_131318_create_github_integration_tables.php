<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public $withinTransaction = false;

    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('github_installations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('workspace_id')->constrained()->cascadeOnDelete();
            $table->unsignedBigInteger('github_installation_id')->unique();
            $table->string('account_login');
            $table->string('account_type');
            $table->string('avatar_url')->nullable();
            $table->timestamps();
        });

        Schema::create('github_repositories', function (Blueprint $table) {
            $table->id();
            $table->foreignId('project_id')->unique()->constrained()->cascadeOnDelete();
            $table->foreignId('github_installation_id')->constrained('github_installations')->cascadeOnDelete();
            $table->unsignedBigInteger('github_repo_id');
            $table->string('full_name');
            $table->string('default_branch');
            $table->string('html_url');
            $table->timestamps();
        });

        Schema::create('github_issues', function (Blueprint $table) {
            $table->id();
            $table->foreignId('task_id')->unique()->constrained()->cascadeOnDelete();
            $table->foreignId('github_repo_id')->constrained('github_repositories')->cascadeOnDelete();
            $table->unsignedBigInteger('github_issue_id')->nullable();
            $table->integer('issue_number')->nullable();
            $table->string('html_url')->nullable();
            $table->string('last_synced_hash')->nullable();
            $table->boolean('needs_sync')->default(false);
            $table->timestamp('needs_sync_since')->nullable();
            $table->timestamp('synced_at')->nullable();
            $table->timestamps();
        });

        Schema::create('github_pull_requests', function (Blueprint $table) {
            $table->id();
            $table->foreignId('task_id')->nullable()->constrained()->cascadeOnDelete();
            $table->foreignId('github_repo_id')->constrained('github_repositories')->cascadeOnDelete();
            $table->integer('pr_number');
            $table->string('title');
            $table->string('state');
            $table->string('head_branch');
            $table->string('base_branch');
            $table->string('html_url');
            $table->boolean('is_draft')->default(false);
            $table->timestamps();
        });

        Schema::create('github_branches', function (Blueprint $table) {
            $table->id();
            $table->foreignId('github_repo_id')->constrained('github_repositories')->cascadeOnDelete();
            $table->string('name');
            $table->string('last_commit_sha');
            $table->timestamps();
        });

        Schema::create('github_webhook_deliveries', function (Blueprint $table) {
            $table->string('delivery_id')->primary();
            $table->string('event_type');
            $table->timestamp('processed_at');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('github_webhook_deliveries');
        Schema::dropIfExists('github_branches');
        Schema::dropIfExists('github_pull_requests');
        Schema::dropIfExists('github_issues');
        Schema::dropIfExists('github_repositories');
        Schema::dropIfExists('github_installations');
    }
};
