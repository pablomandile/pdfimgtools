<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Un registro por cada vez que alguien usa una herramienta. Nunca se guarda
     * el contenido ni el nombre de los archivos: solo cuántos y cuánto pesan.
     */
    public function up(): void
    {
        Schema::create('tool_usages', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->cascadeOnDelete();
            $table->string('tool', 64);
            $table->boolean('ok');
            $table->string('error', 500)->nullable();
            $table->unsignedInteger('files')->default(0);
            $table->unsignedBigInteger('bytes')->default(0);
            $table->unsignedInteger('duration_ms')->default(0);
            $table->timestamp('created_at')->index();

            $table->index(['user_id', 'created_at']);
            $table->index(['tool', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('tool_usages');
    }
};
