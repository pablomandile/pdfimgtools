<?php

namespace App\Http\Controllers;

use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\Rules\Password;
use Inertia\Inertia;
use Inertia\Response;

/**
 * «Mi cuenta»: nombre, y crear o cambiar la contraseña. Una cuenta de Google
 * puede crearse una contraseña para entrar también con email.
 */
class AccountController extends Controller
{
    public function show(Request $request): Response
    {
        $user = $request->user();

        return Inertia::render('account/Show', [
            'account' => [
                'name' => $user->name,
                'email' => $user->email,
                'hasPassword' => $user->password !== null,
                'hasGoogle' => $user->google_id !== null,
            ],
        ]);
    }

    public function updateName(Request $request): RedirectResponse
    {
        $data = $request->validate(['name' => ['required', 'string', 'max:120']]);
        $request->user()->update(['name' => trim($data['name'])]);

        return back()->with('success', 'Guardaste tu nombre.');
    }

    public function updatePassword(Request $request): RedirectResponse
    {
        $user = $request->user();

        $request->validate([
            // si ya tiene contraseña, hay que saber la actual para cambiarla
            'current_password' => $user->password !== null ? ['required', 'current_password'] : ['nullable'],
            'password' => ['required', 'confirmed', Password::min(8)],
        ], [
            'current_password.current_password' => 'La contraseña actual no es correcta.',
        ]);

        $had = $user->password !== null;
        $user->forceFill(['password' => $request->input('password'), 'remember_token' => Str::random(60)])->save();

        // Cierra las otras sesiones (otros navegadores o equipos) y renueva el
        // «recordarme» de esta, que quedó invalidado con el token nuevo.
        DB::table('sessions')->where('user_id', $user->id)->where('id', '!=', $request->session()->getId())->delete();
        Auth::login($user, remember: true);

        return back()->with('success', $had ? 'Cambiaste tu contraseña.' : 'Listo: ya podés entrar también con tu email y esta contraseña.');
    }
}
