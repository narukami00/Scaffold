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
        Schema::create("projects", function (Blueprint $table) {
            $table->id();
            // A project MUST belong to a workspace. If a workspace is deleted, delete its projects!
            $table
                ->foreignId("workspace_id")
                ->constrained()
                ->onDelete("cascade");

            $table->string("name");
            $table->string("slug"); // Example: "Marketing Campaign" -> "marketing-campaign"
            $table->text("description")->nullable();

            $table->timestamps();

            // Ensure sluggified URLs don't overlap inside the SAME workspace
            $table->unique(["workspace_id", "slug"]);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists("projects");
    }
};
