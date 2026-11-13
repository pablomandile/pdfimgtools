<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            // Se entra solo con Google: la contraseña queda vacía.
            $table->string('password')->nullable()->change();
            $table->string('google_id')->nullable()->unique()->after('email');
            $table->string('avatar', 500)->nullable()->after('google_id');
            $table->timestamp('last_login_at')->nullable();
            $table->timestamp('blocked_at')->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropUnique(['google_id']);
            $table->dropColumn(['google_id', 'avatar', 'last_login_at', 'blocked_at']);
        });
    }
};
