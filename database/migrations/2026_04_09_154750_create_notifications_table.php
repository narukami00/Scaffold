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
        Schema::create("notifications", function (Blueprint $table) {
            $table->id();
            $table->foreignId("user_id")->constrained()->onDelete("cascade");
            $table->string("type"); // 'workspace.invitation', 'task.assigned', etc.
            $table->string("notifiable_type")->nullable();
            $table->unsignedBigInteger("notifiable_id")->nullable();
            $table->json("data"); // { message, link, actor_name, etc. }
            $table->timestamp("read_at")->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('notifications');
    }
};
