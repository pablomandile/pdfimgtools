<?php

namespace App\Providers;

use Illuminate\Auth\Notifications\ResetPassword;
use Illuminate\Auth\Notifications\VerifyEmail;
use Illuminate\Notifications\Messages\MailMessage;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        //
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        // Los dos mails de cuenta, en español (los de Laravel vienen en inglés).
        VerifyEmail::toMailUsing(fn (object $user, string $url) => (new MailMessage)
            ->subject('Confirmá tu email en PDFImgTools')
            ->greeting('¡Hola!')
            ->line('Creaste una cuenta en PDFImgTools. Tocá el botón para confirmar que este email es tuyo y empezar a usar las herramientas.')
            ->action('Confirmar mi email', $url)
            ->line('El enlace vence en 60 minutos. Si no fuiste vos, ignorá este mensaje.'));

        ResetPassword::toMailUsing(fn (object $user, string $token) => (new MailMessage)
            ->subject('Elegí tu contraseña de PDFImgTools')
            ->greeting('¡Hola!')
            ->line('Pediste elegir una contraseña nueva para tu cuenta de PDFImgTools.')
            ->action('Elegir contraseña', route('password.reset', ['token' => $token, 'email' => $user->getEmailForPasswordReset()]))
            ->line('El enlace vence en '.config('auth.passwords.users.expire').' minutos. Si no lo pediste vos, ignorá este mensaje: tu contraseña no cambia.'));
    }
}
