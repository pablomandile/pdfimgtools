<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use Inertia\Inertia;
use Inertia\Response;
use Laravel\Socialite\Facades\Socialite;
use Symfony\Component\HttpFoundation\RedirectResponse as SymfonyRedirect;
use Throwable;

/**
 * Login con Google: es la única forma de entrar. La cuenta se crea sola la
 * primera vez.
 */
class AuthController extends Controller
{
    public function login(): Response
    {
        return Inertia::render('auth/Login', [
            'googleConfigured' => filled(config('services.google.client_id')) && filled(config('services.google.client_secret')),
        ]);
    }

    public function redirect(): SymfonyRedirect|RedirectResponse
    {
        if (blank(config('services.google.client_id'))) {
            return to_route('login')->with('error', 'El inicio de sesión con Google no está configurado.');
        }

        return Socialite::driver('google')->redirect();
    }

    public function callback(Request $request): RedirectResponse
    {
        if ($request->has('error')) {
            return to_route('login')->with('error', 'Cancelaste el inicio de sesión con Google.');
        }

        try {
            $google = Socialite::driver('google')->user();
        } catch (Throwable $e) {
            Log::warning('Login con Google falló: '.$e->getMessage());

            return to_route('login')->with('error', 'No se pudo iniciar sesión con Google. Probá de nuevo.');
        }

        $email = strtolower((string) $google->getEmail());
        if ($email === '') {
            return to_route('login')->with('error', 'Tu cuenta de Google no tiene un email asociado.');
        }

        $user = User::where('google_id', $google->getId())->first()
            ?? User::where('email', $email)->first()
            ?? new User(['email' => $email]);

        $user->fill([
            'name' => $google->getName() ?: $google->getNickname() ?: $email,
            'email' => $email,
            'google_id' => $google->getId(),
            'avatar' => $google->getAvatar(),
            'last_login_at' => now(),
        ]);
        $user->email_verified_at ??= now();
        $user->save();

        if ($user->isBlocked()) {
            return to_route('login')->with('error', 'Tu cuenta está bloqueada. Si creés que es un error, escribile al administrador.');
        }

        Auth::login($user, remember: true);
        $request->session()->regenerate();

        return redirect()->intended(route('home'));
    }

    public function logout(Request $request): RedirectResponse
    {
        Auth::logout();
        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return to_route('login');
    }
}
