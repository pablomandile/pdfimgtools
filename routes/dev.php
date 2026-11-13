<?php

use App\Models\User;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Str;

/*
|--------------------------------------------------------------------------
| Rutas solo de desarrollo
|--------------------------------------------------------------------------
|
| Se cargan únicamente con APP_ENV=local (ver routes/web.php). Permiten
| entrar sin pasar por Google, que en local no suele estar configurado.
|
|   /dev/entrar/pablo@example.com
|
*/

Route::get('dev/entrar/{email}', function (string $email) {
    abort_unless(app()->environment('local'), 404);

    $user = User::firstOrCreate(
        ['email' => strtolower($email)],
        ['name' => Str::title(Str::before($email, '@')), 'google_id' => 'dev-'.$email],
    );
    $user->forceFill(['last_login_at' => now(), 'email_verified_at' => $user->email_verified_at ?? now()])->save();
    Auth::login($user, remember: true);

    return redirect()->route('home');
})->where('email', '.+@.+')->middleware('guest');
