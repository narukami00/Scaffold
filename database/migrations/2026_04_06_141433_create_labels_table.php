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
        Schema::create("label_task", function (Blueprint $table) {
            $table->foreignId("label_id")->constrained()->onDelete("cascade");
            $table->foreignId("task_id")->constrained()->onDelete("cascade");

            // Unique index so a task can't have the same label twice
            $table->unique(["label_id", "task_id"]);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists("labels");
    }
};
