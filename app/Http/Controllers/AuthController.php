<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Auth\Events\Registered;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Validation\Rules\Password;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;
use Laravel\Socialite\Facades\Socialite;
use Symfony\Component\HttpFoundation\RedirectResponse as SymfonyRedirect;
use Throwable;

/**
 * Ingreso con Google (la cuenta se crea sola la primera vez) o con email y
 * contraseña (hay que registrarse y confirmar el email). Las dos formas
 * conviven: una cuenta de Google puede crearse una contraseña y viceversa.
 */
class AuthController extends Controller
{
    public function login(): Response
    {
        return Inertia::render('auth/Login', [
            'googleConfigured' => $this->googleConfigured(),
            'status' => session('status'),
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

        // Alguien pudo registrar este email con contraseña sin confirmarlo
        // nunca. Google prueba que el email es de quien entra ahora: esa
        // contraseña no es suya y se descarta.
        if ($user->exists && ! $user->hasVerifiedEmail() && $user->password !== null) {
            $user->forceFill(['password' => null, 'remember_token' => null]);
        }

        $user->fill([
            'name' => $user->name ?: ($google->getName() ?: $google->getNickname() ?: $email),
            'email' => $email,
            'google_id' => $google->getId(),
            'avatar' => $google->getAvatar(),
            'last_login_at' => now(),
        ]);
        $user->email_verified_at ??= now();
        $user->save();

        return $this->start($request, $user);
    }

    /**
     * Ingreso con email y contraseña. Con 5 intentos fallidos seguidos para el
     * mismo email desde la misma IP, hay que esperar un minuto.
     */
    public function attempt(Request $request): RedirectResponse
    {
        $credentials = $request->validate([
            'email' => ['required', 'string', 'email'],
            'password' => ['required', 'string'],
        ]);
        $email = strtolower(trim($credentials['email']));
        $key = 'login:'.$email.'|'.$request->ip();

        if (RateLimiter::tooManyAttempts($key, 5)) {
            $seconds = RateLimiter::availableIn($key);

            throw ValidationException::withMessages([
                'email' => "Demasiados intentos. Probá de nuevo en {$seconds} segundos.",
            ]);
        }

        $user = User::where('email', $email)->first();

        if (! $user || $user->password === null || ! Hash::check($credentials['password'], $user->password)) {
            RateLimiter::hit($key, 60);

            throw ValidationException::withMessages([
                'email' => $user && $user->password === null
                    ? 'Esta cuenta entra con Google. Usá «Continuar con Google» o creá una contraseña con «¿Olvidaste tu contraseña?».'
                    : 'El email o la contraseña no son correctos.',
            ]);
        }

        RateLimiter::clear($key);
        $user->forceFill(['last_login_at' => now()])->save();

        return $this->start($request, $user, $request->boolean('remember'));
    }

    /** Alta con email y contraseña: después hay que confirmar el email. */
    public function register(Request $request): RedirectResponse
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:120'],
            'email' => ['required', 'string', 'email', 'max:255'],
            'password' => ['required', 'confirmed', Password::min(8)],
        ]);
        $email = strtolower(trim($data['email']));

        if (User::where('email', $email)->exists()) {
            throw ValidationException::withMessages([
                'email' => 'Ya hay una cuenta con ese email. Iniciá sesión, o usá «¿Olvidaste tu contraseña?» si no la recordás.',
            ]);
        }

        $user = User::create([
            'name' => trim($data['name']),
            'email' => $email,
            'password' => $data['password'],
            'last_login_at' => now(),
        ]);

        event(new Registered($user)); // manda el mail de confirmación

        return $this->start($request, $user);
    }

    public function showRegister(): Response
    {
        return Inertia::render('auth/Register', [
            'googleConfigured' => $this->googleConfigured(),
        ]);
    }

    private function start(Request $request, User $user, bool $remember = true): RedirectResponse
    {
        if ($user->isBlocked()) {
            return to_route('login')->with('error', 'Tu cuenta está bloqueada. Si creés que es un error, escribile al administrador.');
        }

        Auth::login($user, $remember);
        $request->session()->regenerate();

        return redirect()->intended(route('home'));
    }

    private function googleConfigured(): bool
    {
        return filled(config('services.google.client_id')) && filled(config('services.google.client_secret'));
    }

    public function logout(Request $request): RedirectResponse
    {
        Auth::logout();
        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return to_route('login');
    }
}
