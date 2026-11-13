<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpFoundation\Response;

/**
 * Si el admin bloqueó la cuenta mientras la sesión estaba abierta, la cierra.
 */
class EnsureUserIsActive
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if ($user?->isBlocked()) {
            Auth::logout();
            $request->session()->invalidate();
            $request->session()->regenerateToken();

            $message = 'Tu cuenta está bloqueada.';

            // fetch() de las herramientas y del registro de uso: sin redirección.
            if ($request->expectsJson() && ! $request->header('X-Inertia')) {
                abort(403, $message);
            }

            return to_route('login')->with('error', $message);
        }

        return $next($request);
    }
}
