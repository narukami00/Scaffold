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
        Schema::table("projects", function (Blueprint $table) {
            $table->string("git_repo_path")->nullable()->after("description");
            $table->string("git_last_synced_commit")->nullable()->after("git_repo_path");
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table("projects", function (Blueprint $table) {
            $table->dropColumn(["git_repo_path", "git_last_synced_commit"]);
        });
    }
};
