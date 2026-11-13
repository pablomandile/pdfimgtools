<?php

use App\Http\Controllers\AuthController;
use App\Http\Controllers\StatsController;
use App\Http\Controllers\ToolController;
use App\Http\Controllers\UsageController;
use App\Http\Middleware\EnsureUserIsActive;
use App\Http\Middleware\EnsureUserIsAdmin;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::middleware('guest')->group(function () {
    Route::get('login', [AuthController::class, 'login'])->name('login');
    Route::get('auth/google', [AuthController::class, 'redirect'])->name('google.redirect');
    Route::get('auth/google/callback', [AuthController::class, 'callback'])->name('google.callback');
});

Route::post('logout', [AuthController::class, 'logout'])->middleware('auth')->name('logout');

// Entrar sin Google durante el desarrollo (solo con APP_ENV=local).
if (app()->environment('local')) {
    require __DIR__.'/dev.php';
}

Route::middleware(['auth', EnsureUserIsActive::class])->group(function () {
    Route::get('/', fn () => Inertia::render('Home'))->name('home');

    Route::post('uso', [UsageController::class, 'store'])->name('usage.store');
    Route::post('procesar/{slug}', [ToolController::class, 'process'])->name('tools.process');

    Route::middleware(EnsureUserIsAdmin::class)->prefix('estadisticas')->group(function () {
        Route::get('/', [StatsController::class, 'index'])->name('stats.index');
        Route::get('usuarios/{user}', [StatsController::class, 'show'])->name('stats.user');
        Route::post('usuarios/{user}/bloquear', [StatsController::class, 'block'])->name('stats.block');
        Route::post('usuarios/{user}/desbloquear', [StatsController::class, 'unblock'])->name('stats.unblock');
    });

    // Al final: atrapa cualquier /{slug} que no sea una ruta de las de arriba.
    Route::get('{slug}', [ToolController::class, 'show'])
        ->where('slug', '[a-z0-9-]+')
        ->name('tools.show');
});
