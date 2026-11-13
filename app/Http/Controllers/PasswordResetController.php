<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Auth\Events\PasswordReset;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Str;
use Illuminate\Validation\Rules\Password as PasswordRule;
use Illuminate\Validation\ValidationException;
use Inertia\Inertia;
use Inertia\Response;

/**
 * «¿Olvidaste tu contraseña?»: manda un enlace por mail y permite elegir una
 * nueva. También sirve para que una cuenta de Google se cree contraseña.
 */
class PasswordResetController extends Controller
{
    public function request(): Response
    {
        return Inertia::render('auth/ForgotPassword', ['status' => session('status')]);
    }

    public function send(Request $request): RedirectResponse
    {
        $request->validate(['email' => ['required', 'string', 'email']]);

        $status = Password::sendResetLink(['email' => strtolower(trim($request->input('email')))]);

        if ($status === Password::RESET_THROTTLED) {
            throw ValidationException::withMessages(['email' => __($status)]);
        }

        // La misma respuesta exista o no la cuenta: no revela qué emails están registrados.
        return back()->with('status', 'Si hay una cuenta con ese email, te mandamos un enlace para elegir una contraseña nueva. Revisá también el correo no deseado.');
    }

    public function edit(Request $request, string $token): Response
    {
        return Inertia::render('auth/ResetPassword', [
            'token' => $token,
            'email' => (string) $request->query('email', ''),
        ]);
    }

    public function update(Request $request): RedirectResponse
    {
        $request->validate([
            'token' => ['required'],
            'email' => ['required', 'email'],
            'password' => ['required', 'confirmed', PasswordRule::min(8)],
        ]);

        $status = Password::reset(
            [...$request->only('password', 'password_confirmation', 'token'), 'email' => strtolower(trim($request->input('email')))],
            function (User $user, string $password) {
                $user->forceFill([
                    'password' => $password,
                    'remember_token' => Str::random(60),
                    // el enlace llegó a su casilla: el email es suyo
                    'email_verified_at' => $user->email_verified_at ?? now(),
                ])->save();

                event(new PasswordReset($user));
            },
        );

        if ($status !== Password::PASSWORD_RESET) {
            throw ValidationException::withMessages([
                'email' => $status === Password::INVALID_TOKEN
                    ? 'El enlace venció o ya se usó. Pedí uno nuevo.'
                    : __($status),
            ]);
        }

        return to_route('login')->with('status', 'Listo: ya podés entrar con tu contraseña nueva.');
    }
}
