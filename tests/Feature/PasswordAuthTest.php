<?php

use App\Models\User;
use Illuminate\Auth\Notifications\ResetPassword;
use Illuminate\Auth\Notifications\VerifyEmail;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Facades\URL;
use Inertia\Testing\AssertableInertia;
use Laravel\Socialite\Facades\Socialite;
use Laravel\Socialite\Two\User as GoogleUser;

beforeEach(fn () => Notification::fake());

function withPassword(array $attrs = []): User
{
    return User::factory()->create(['email' => 'ana@example.com', 'password' => 'secreta123', ...$attrs]);
}

// --- registro y confirmación ---

test('registrarse crea la cuenta, entra y manda el mail de confirmación', function () {
    $this->post('/registro', [
        'name' => 'Ana', 'email' => 'Ana@Example.com', 'password' => 'secreta123', 'password_confirmation' => 'secreta123',
    ])->assertRedirect('/');

    $user = User::sole();
    expect($user->email)->toBe('ana@example.com')
        ->and($user->hasVerifiedEmail())->toBeFalse()
        ->and(Hash::check('secreta123', $user->password))->toBeTrue();
    $this->assertAuthenticatedAs($user);
    Notification::assertSentTo($user, VerifyEmail::class);
});

test('el mail de confirmación sale en español', function () {
    $user = User::factory()->unverified()->create();
    $mail = (new VerifyEmail)->toMail($user);

    expect($mail->subject)->toBe('Confirmá tu email en PDFImgTools')
        ->and($mail->actionText)->toBe('Confirmar mi email');
});

test('valida el registro', function () {
    withPassword();

    $this->post('/registro', ['name' => '', 'email' => 'no-es-email', 'password' => 'corta', 'password_confirmation' => 'otra'])
        ->assertSessionHasErrors(['name', 'email', 'password']);
    $this->post('/registro', ['name' => 'Otra', 'email' => 'ana@example.com', 'password' => 'secreta123', 'password_confirmation' => 'secreta123'])
        ->assertSessionHasErrors(['email' => 'Ya hay una cuenta con ese email. Iniciá sesión, o usá «¿Olvidaste tu contraseña?» si no la recordás.']);
});

test('sin confirmar el email no puede usar las herramientas', function () {
    $this->actingAs(User::factory()->unverified()->create());

    $this->get('/')->assertRedirect('/confirmar-email');
    $this->get('/unir-pdf')->assertRedirect('/confirmar-email');
    $this->postJson('/uso', [])->assertForbidden();
    $this->get('/confirmar-email')->assertOk()->assertInertia(fn (AssertableInertia $page) => $page->component('auth/VerifyEmail'));
});

test('el enlace del mail confirma el email', function () {
    $user = User::factory()->unverified()->create();
    $url = URL::temporarySignedRoute('verification.verify', now()->addHour(), ['id' => $user->id, 'hash' => sha1($user->email)]);

    $this->actingAs($user)->get($url)->assertRedirect('/');

    expect($user->fresh()->hasVerifiedEmail())->toBeTrue();
});

test('un enlace de confirmación adulterado o de otra cuenta no sirve', function () {
    $user = User::factory()->unverified()->create();
    $other = User::factory()->unverified()->create();

    $this->actingAs($user)->get("/confirmar-email/{$user->id}/".sha1($user->email))->assertForbidden(); // sin firma
    $url = URL::temporarySignedRoute('verification.verify', now()->addHour(), ['id' => $other->id, 'hash' => sha1($other->email)]);
    $this->actingAs($user)->get($url)->assertForbidden();

    expect($user->fresh()->hasVerifiedEmail())->toBeFalse();
});

test('se puede pedir otro mail de confirmación', function () {
    $user = User::factory()->unverified()->create();

    $this->actingAs($user)->post('/confirmar-email/reenviar')->assertSessionHas('status');

    Notification::assertSentTo($user, VerifyEmail::class);
});

// --- login con contraseña ---

test('entra con email y contraseña, sin importar mayúsculas en el email', function () {
    $user = withPassword();

    $this->post('/login', ['email' => 'ANA@example.com', 'password' => 'secreta123'])->assertRedirect('/');

    $this->assertAuthenticatedAs($user);
    expect($user->fresh()->last_login_at)->not->toBeNull();
});

test('con la contraseña equivocada no entra', function () {
    withPassword();

    $this->post('/login', ['email' => 'ana@example.com', 'password' => 'mal'])
        ->assertSessionHasErrors(['email' => 'El email o la contraseña no son correctos.']);
    $this->assertGuest();
});

test('una cuenta de Google sin contraseña recibe una pista', function () {
    User::factory()->create(['email' => 'ana@example.com', 'password' => null, 'google_id' => 'g-1']);

    $this->post('/login', ['email' => 'ana@example.com', 'password' => 'algo'])
        ->assertSessionHasErrors(['email' => 'Esta cuenta entra con Google. Usá «Continuar con Google» o creá una contraseña con «¿Olvidaste tu contraseña?».']);
});

test('después de 5 intentos fallidos hay que esperar', function () {
    withPassword();

    foreach (range(1, 5) as $i) {
        $this->post('/login', ['email' => 'ana@example.com', 'password' => 'mal']);
    }

    $this->post('/login', ['email' => 'ana@example.com', 'password' => 'secreta123'])->assertSessionHasErrors('email');

    expect(session('errors')->first('email'))->toStartWith('Demasiados intentos');
    $this->assertGuest();
});

test('un bloqueado no entra con contraseña', function () {
    withPassword(['blocked_at' => now()]);

    $this->post('/login', ['email' => 'ana@example.com', 'password' => 'secreta123'])->assertRedirect('/login');
    $this->assertGuest();
});

// --- recuperar contraseña ---

test('olvidé mi contraseña manda el enlace, y responde igual si el email no existe', function () {
    $user = withPassword();

    $this->post('/olvide-mi-contrasena', ['email' => 'ana@example.com'])->assertSessionHas('status');
    Notification::assertSentTo($user, ResetPassword::class);

    $this->post('/olvide-mi-contrasena', ['email' => 'nadie@example.com'])
        ->assertSessionHasNoErrors()
        ->assertSessionHas('status');
});

test('con el enlace elige una contraseña nueva y queda confirmado', function () {
    $user = withPassword(['email_verified_at' => null]);
    $token = Password::createToken($user);

    $this->post('/restablecer-contrasena', [
        'token' => $token, 'email' => 'ana@example.com', 'password' => 'nueva12345', 'password_confirmation' => 'nueva12345',
    ])->assertRedirect('/login')->assertSessionHas('status');

    $user->refresh();
    expect(Hash::check('nueva12345', $user->password))->toBeTrue()->and($user->hasVerifiedEmail())->toBeTrue();
});

test('un enlace inválido no cambia la contraseña', function () {
    withPassword();

    $this->post('/restablecer-contrasena', [
        'token' => 'falso', 'email' => 'ana@example.com', 'password' => 'nueva12345', 'password_confirmation' => 'nueva12345',
    ])->assertSessionHasErrors(['email' => 'El enlace venció o ya se usó. Pedí uno nuevo.']);
});

test('una cuenta de Google puede crearse contraseña con el enlace del mail', function () {
    $user = User::factory()->create(['email' => 'ana@example.com', 'password' => null, 'google_id' => 'g-1']);

    $this->post('/restablecer-contrasena', [
        'token' => Password::createToken($user), 'email' => 'ana@example.com', 'password' => 'nueva12345', 'password_confirmation' => 'nueva12345',
    ])->assertRedirect('/login');

    $this->post('/login', ['email' => 'ana@example.com', 'password' => 'nueva12345'])->assertRedirect('/');
    $this->assertAuthenticatedAs($user);
});

// --- Mi cuenta ---

test('mi cuenta muestra cómo entra', function () {
    $this->actingAs(User::factory()->create(['password' => null, 'google_id' => 'g-1']))
        ->get('/mi-cuenta')
        ->assertInertia(fn (AssertableInertia $page) => $page
            ->component('account/Show')
            ->where('account.hasPassword', false)
            ->where('account.hasGoogle', true));
});

test('una cuenta de Google crea su contraseña sin pedir la actual', function () {
    $user = User::factory()->create(['password' => null, 'google_id' => 'g-1']);

    $this->actingAs($user)->put('/mi-cuenta/contrasena', ['password' => 'nueva12345', 'password_confirmation' => 'nueva12345'])
        ->assertSessionHas('success');

    expect(Hash::check('nueva12345', $user->fresh()->password))->toBeTrue();
});

test('para cambiar la contraseña pide la actual', function () {
    $user = withPassword();

    $this->actingAs($user)->put('/mi-cuenta/contrasena', ['current_password' => 'mal', 'password' => 'nueva12345', 'password_confirmation' => 'nueva12345'])
        ->assertSessionHasErrors(['current_password' => 'La contraseña actual no es correcta.']);
    $this->actingAs($user)->put('/mi-cuenta/contrasena', ['current_password' => 'secreta123', 'password' => 'nueva12345', 'password_confirmation' => 'nueva12345'])
        ->assertSessionHasNoErrors();

    expect(Hash::check('nueva12345', $user->fresh()->password))->toBeTrue();
});

test('cambiar el nombre', function () {
    $user = withPassword();

    $this->actingAs($user)->put('/mi-cuenta/nombre', ['name' => '  Ana María '])->assertSessionHas('success');

    expect($user->fresh()->name)->toBe('Ana María');
});

// --- convivencia con Google ---

test('si alguien registró tu email sin confirmarlo, entrar con Google descarta esa contraseña', function () {
    config(['services.google.client_id' => 'x', 'services.google.client_secret' => 'y']);
    $intruso = withPassword(['email_verified_at' => null, 'name' => 'Intruso']);

    Socialite::shouldReceive('driver->user')->andReturn((new GoogleUser)->map([
        'id' => 'g-ana', 'name' => 'Ana', 'email' => 'ana@example.com', 'avatar' => null,
    ]));
    $this->get('/auth/google/callback?code=x')->assertRedirect('/');

    $cuenta = $intruso->fresh();
    expect($cuenta->password)->toBeNull()
        ->and($cuenta->hasVerifiedEmail())->toBeTrue()
        ->and($cuenta->google_id)->toBe('g-ana');

    auth()->logout();
    $this->post('/login', ['email' => 'ana@example.com', 'password' => 'secreta123'])->assertSessionHasErrors('email');
});

test('una cuenta con contraseña ya confirmada conserva la contraseña al vincular Google', function () {
    config(['services.google.client_id' => 'x', 'services.google.client_secret' => 'y']);
    $user = withPassword();

    Socialite::shouldReceive('driver->user')->andReturn((new GoogleUser)->map([
        'id' => 'g-ana', 'name' => 'Ana G.', 'email' => 'ana@example.com', 'avatar' => null,
    ]));
    $this->get('/auth/google/callback?code=x');

    expect(Hash::check('secreta123', $user->fresh()->password))->toBeTrue()
        ->and($user->fresh()->name)->toBe($user->name); // no le pisa el nombre que eligió
});
