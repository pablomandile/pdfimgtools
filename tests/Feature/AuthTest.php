<?php

use App\Models\User;
use Inertia\Testing\AssertableInertia;
use Laravel\Socialite\Facades\Socialite;
use Laravel\Socialite\Two\User as GoogleUser;

/** Simula la respuesta de Google en el callback. */
function fakeGoogle(string $id = 'g-123', string $email = 'ana@example.com', string $name = 'Ana Pérez'): void
{
    $user = (new GoogleUser)->map([
        'id' => $id,
        'name' => $name,
        'email' => $email,
        'avatar' => 'https://lh3.googleusercontent.com/a/foto',
    ]);

    Socialite::shouldReceive('driver->user')->andReturn($user);
}

beforeEach(fn () => config([
    'services.google.client_id' => 'id-de-prueba',
    'services.google.client_secret' => 'secreto',
]));

test('sin sesión todo lleva al login', function (string $url) {
    $this->get($url)->assertRedirect('/login');
})->with(['/', '/unir-pdf', '/estadisticas']);

test('el registro de uso y el procesamiento piden sesión', function () {
    $this->postJson('/uso', [])->assertUnauthorized();
    $this->postJson('/procesar/comprimir-pdf')->assertUnauthorized();
});

test('la página de login muestra el botón de Google', function () {
    $this->get('/login')
        ->assertOk()
        ->assertInertia(fn (AssertableInertia $page) => $page->component('auth/Login')->where('googleConfigured', true));
});

test('sin credenciales de Google lo avisa', function () {
    config(['services.google.client_id' => null]);

    $this->get('/login')->assertInertia(fn (AssertableInertia $page) => $page->where('googleConfigured', false));
});

test('el primer ingreso con Google crea la cuenta y entra', function () {
    fakeGoogle();

    $this->get('/auth/google/callback?code=x')->assertRedirect('/');

    $user = User::sole();
    expect($user->only('name', 'email', 'google_id'))->toBe(['name' => 'Ana Pérez', 'email' => 'ana@example.com', 'google_id' => 'g-123'])
        ->and($user->last_login_at)->not->toBeNull()
        ->and($user->email_verified_at)->not->toBeNull();
    $this->assertAuthenticatedAs($user);
});

test('el segundo ingreso reusa la cuenta y no pisa el nombre que eligió', function () {
    $existing = User::factory()->create(['email' => 'ana@example.com', 'google_id' => 'g-123', 'name' => 'Anita']);
    fakeGoogle(name: 'Ana P.');

    $this->get('/auth/google/callback?code=x')->assertRedirect('/');

    expect(User::count())->toBe(1)->and($existing->fresh()->name)->toBe('Anita');
});

test('un usuario bloqueado no puede entrar', function () {
    User::factory()->create(['email' => 'ana@example.com', 'google_id' => 'g-123', 'blocked_at' => now()]);
    fakeGoogle();

    $this->get('/auth/google/callback?code=x')
        ->assertRedirect('/login')
        ->assertSessionHas('error', fn ($m) => str_contains($m, 'bloqueada'));
    $this->assertGuest();
});

test('si Google falla vuelve al login con un mensaje', function () {
    Socialite::shouldReceive('driver->user')->andThrow(new RuntimeException('invalid state'));

    $this->get('/auth/google/callback?code=x')->assertRedirect('/login')->assertSessionHas('error');
    $this->assertGuest();
});

test('si lo bloquean con la sesión abierta, lo saca', function () {
    $user = User::factory()->create();
    $this->actingAs($user)->get('/')->assertOk();

    $user->forceFill(['blocked_at' => now()])->save();

    $this->get('/')->assertRedirect('/login');
    $this->assertGuest();
});

test('cerrar sesión', function () {
    $this->actingAs(User::factory()->create())->post('/logout')->assertRedirect('/login');
    $this->assertGuest();
});

test('los datos del usuario y si es admin llegan a la página', function () {
    config(['auth.admin_emails' => ['jefe@example.com']]);

    $this->actingAs(User::factory()->create(['email' => 'Jefe@Example.com']))
        ->get('/')
        ->assertInertia(fn (AssertableInertia $page) => $page
            ->where('auth.user.email', 'Jefe@Example.com')
            ->where('auth.user.admin', true));
});
