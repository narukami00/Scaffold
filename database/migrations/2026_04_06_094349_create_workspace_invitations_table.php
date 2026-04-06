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
        Schema::create("workspace_invitations", function (Blueprint $table) {
            $table->id();
            $table
                ->foreignId("workspace_id")
                ->constrained()
                ->onDelete("cascade");
            $table->string("email");
            $table->string("token")->unique();
            $table->string("role")->default("member");
            $table->timestamp("expires_at");
            $table->timestamps();

            // Note: We don't use unique(['workspace_id', 'email']) because
            // allowing someone to re-invite an expired email is a good feature.
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists("workspace_invitations");
    }
};
