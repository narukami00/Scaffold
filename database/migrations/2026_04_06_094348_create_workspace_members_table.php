<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create("workspace_members", function (Blueprint $table) {
            $table->id();
            $table
                ->foreignId("workspace_id")
                ->constrained()
                ->onDelete("cascade");
            $table->foreignId("user_id")->constrained()->onDelete("cascade");
            $table->string("role")->default("member"); // 'admin' or 'member'
            $table->timestamp("joined_at")->useCurrent();
            $table->timestamps();

            // Ensure a user can only be added to a workspace once
            $table->unique(["workspace_id", "user_id"]);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists("workspace_members");
    }
};
