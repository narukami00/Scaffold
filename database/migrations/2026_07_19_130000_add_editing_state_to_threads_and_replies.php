<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public $withinTransaction = false;

    public function up(): void
    {
        Schema::table('threads', function (Blueprint $table) {
            $table->timestamp('edited_at')->nullable();
        });

        Schema::table('thread_replies', function (Blueprint $table) {
            $table->boolean('is_deleted')->default(false);
            $table->timestamp('edited_at')->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('thread_replies', function (Blueprint $table) {
            $table->dropColumn(['is_deleted', 'edited_at']);
        });

        Schema::table('threads', function (Blueprint $table) {
            $table->dropColumn('edited_at');
        });
    }
};
