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
        Schema::create("reactions", function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger("user_id");
            $table->morphs("reactable");
            $table->string("emoji", 10);
            $table->timestamps();

            $table->unique(["user_id", "reactable_id", "reactable_type", "emoji"], "unique_reaction");
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists("reactions");
    }
};
