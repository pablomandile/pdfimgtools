<?php

namespace App\Http\Controllers;

use Illuminate\Auth\Events\Verified;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Confirmación del email de las cuentas creadas con contraseña. Las de Google
 * ya llegan confirmadas.
 */
class EmailVerificationController extends Controller
{
    public function notice(Request $request): Response|RedirectResponse
    {
        if ($request->user()->hasVerifiedEmail()) {
            return redirect()->intended(route('home'));
        }

        return Inertia::render('auth/VerifyEmail', [
            'email' => $request->user()->email,
            'status' => session('status'),
        ]);
    }

    /** El enlace del mail. Va firmado y tiene que coincidir con el usuario que tiene la sesión. */
    public function verify(Request $request, string $id, string $hash): RedirectResponse
    {
        $user = $request->user();

        abort_unless(
            hash_equals((string) $user->getKey(), $id) && hash_equals(sha1($user->getEmailForVerification()), $hash),
            403,
            'Este enlace es de otra cuenta. Cerrá sesión y abrilo de nuevo.',
        );

        if (! $user->hasVerifiedEmail()) {
            $user->markEmailAsVerified();
            event(new Verified($user));
        }

        return redirect()->intended(route('home'))->with('success', '¡Listo! Confirmaste tu email.');
    }

    public function resend(Request $request): RedirectResponse
    {
        if ($request->user()->hasVerifiedEmail()) {
            return redirect()->intended(route('home'));
        }

        $request->user()->sendEmailVerificationNotification();

        return back()->with('status', 'Te mandamos otro enlace de confirmación.');
    }
}
