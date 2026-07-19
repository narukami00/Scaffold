<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public $withinTransaction = false;

    public function up(): void
    {
        // Remove invalid legacy rows before enforcing ownership constraints.
        DB::table('thread_replies')
            ->whereNotIn('thread_id', DB::table('threads')->select('id'))
            ->delete();

        DB::table('threads')
            ->whereNotIn('project_id', DB::table('projects')->select('id'))
            ->delete();

        DB::table('thread_replies')
            ->whereNotIn('thread_id', DB::table('threads')->select('id'))
            ->delete();

        DB::table('thread_replies')
            ->whereNotNull('parent_id')
            ->whereNotIn('parent_id', DB::table('thread_replies')->select('id'))
            ->update(['parent_id' => null]);

        Schema::table('threads', function (Blueprint $table) {
            $table->foreign('project_id', 'threads_project_id_foreign')
                ->references('id')
                ->on('projects')
                ->cascadeOnDelete();
        });

        Schema::table('thread_replies', function (Blueprint $table) {
            $table->foreign('thread_id', 'thread_replies_thread_id_foreign')
                ->references('id')
                ->on('threads')
                ->cascadeOnDelete();

            $table->foreign('parent_id', 'thread_replies_parent_id_foreign')
                ->references('id')
                ->on('thread_replies')
                ->nullOnDelete();
        });

        Schema::table('media', function (Blueprint $table) {
            $table->foreignId('project_id')
                ->nullable()
                ->after('user_id')
                ->constrained()
                ->cascadeOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('media', function (Blueprint $table) {
            $table->dropConstrainedForeignId('project_id');
        });

        Schema::table('thread_replies', function (Blueprint $table) {
            $table->dropForeign('thread_replies_parent_id_foreign');
            $table->dropForeign('thread_replies_thread_id_foreign');
        });

        Schema::table('threads', function (Blueprint $table) {
            $table->dropForeign('threads_project_id_foreign');
        });
    }
};
