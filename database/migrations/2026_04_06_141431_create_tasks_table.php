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
        Schema::create("tasks", function (Blueprint $table) {
            $table->id();
            $table->foreignId("project_id")->constrained()->onDelete("cascade");
            $table
                ->foreignId("assignee_id")
                ->nullable()
                ->constrained("users")
                ->onDelete("SET NULL");

            // Task Dependencies
            $table
                ->foreignId("blocked_by_id")
                ->nullable()
                ->constrained("tasks")
                ->onDelete("SET NULL");

            $table->string("title");
            $table->text("description")->nullable();

            // Kanban columns
            $table
                ->enum("status", [
                    "backlog",
                    "in_progress",
                    "in_review",
                    "done",
                ])
                ->default("backlog");
            $table
                ->enum("priority", ["low", "medium", "high", "urgent"])
                ->default("medium");

            $table->integer("position")->default(0); // For drag-and-drop ordering

            // The "Blender-style" coordinate system
            $table->integer("x_pos")->default(0);
            $table->integer("y_pos")->default(0);

            $table->date("due_date")->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists("tasks");
    }
};
