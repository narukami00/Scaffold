<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create("thread_replies", function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger("thread_id");
            $table->unsignedBigInteger("user_id");
            $table->unsignedBigInteger("parent_id")->nullable();
            $table->longText("body");
            $table->boolean("is_definitive")->default(false);
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists("thread_replies");
    }
};
