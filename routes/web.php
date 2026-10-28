<?php

use App\Http\Controllers\ToolController;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::get('/', fn () => Inertia::render('Home'))->name('home');

Route::post('procesar/{slug}', [ToolController::class, 'process'])->name('tools.process');

Route::get('{slug}', [ToolController::class, 'show'])
    ->where('slug', '[a-z0-9-]+')
    ->name('tools.show');
