<?php

use App\Http\Controllers\AccountController;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\EmailVerificationController;
use App\Http\Controllers\PasswordResetController;
use App\Http\Controllers\StatsController;
use App\Http\Controllers\ToolController;
use App\Http\Controllers\UsageController;
use App\Http\Middleware\EnsureUserIsActive;
use App\Http\Middleware\EnsureUserIsAdmin;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::middleware('guest')->group(function () {
    Route::get('login', [AuthController::class, 'login'])->name('login');
    Route::post('login', [AuthController::class, 'attempt'])->middleware('throttle:20,1')->name('login.attempt');
    Route::get('registro', [AuthController::class, 'showRegister'])->name('register');
    Route::post('registro', [AuthController::class, 'register'])->middleware('throttle:10,1')->name('register.store');

    Route::get('auth/google', [AuthController::class, 'redirect'])->name('google.redirect');
    Route::get('auth/google/callback', [AuthController::class, 'callback'])->name('google.callback');

    Route::get('olvide-mi-contrasena', [PasswordResetController::class, 'request'])->name('password.request');
    Route::post('olvide-mi-contrasena', [PasswordResetController::class, 'send'])->middleware('throttle:6,1')->name('password.email');
    Route::get('restablecer-contrasena/{token}', [PasswordResetController::class, 'edit'])->name('password.reset');
    Route::post('restablecer-contrasena', [PasswordResetController::class, 'update'])->middleware('throttle:10,1')->name('password.update');
});

Route::post('logout', [AuthController::class, 'logout'])->middleware('auth')->name('logout');

// Entrar sin Google ni contraseña durante el desarrollo (solo con APP_ENV=local).
if (app()->environment('local')) {
    require __DIR__.'/dev.php';
}

// Confirmación del email: con sesión, pero todavía sin confirmar.
Route::middleware(['auth', EnsureUserIsActive::class])->prefix('confirmar-email')->group(function () {
    Route::get('/', [EmailVerificationController::class, 'notice'])->name('verification.notice');
    Route::get('{id}/{hash}', [EmailVerificationController::class, 'verify'])->middleware(['signed', 'throttle:6,1'])->name('verification.verify');
    Route::post('reenviar', [EmailVerificationController::class, 'resend'])->middleware('throttle:6,1')->name('verification.send');
});

Route::middleware(['auth', EnsureUserIsActive::class, 'verified'])->group(function () {
    Route::get('/', fn () => Inertia::render('Home'))->name('home');

    Route::get('mi-cuenta', [AccountController::class, 'show'])->name('account');
    Route::put('mi-cuenta/nombre', [AccountController::class, 'updateName'])->name('account.name');
    Route::put('mi-cuenta/contrasena', [AccountController::class, 'updatePassword'])->name('account.password');

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
