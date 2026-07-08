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
        Schema::table("workspace_invitations", function (Blueprint $table) {
            $table->foreignId("inviter_id")->nullable()->constrained("users")->onDelete("cascade");
            $table->enum("status", ["pending", "accepted", "declined"])->default("pending");
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table("workspace_invitations", function (Blueprint $table) {
            $table->dropForeign(["inviter_id"]);
            $table->dropColumn(["inviter_id", "status"]);
        });
    }
};
