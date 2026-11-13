<?php

use App\Models\ToolUsage;
use App\Models\User;
use Carbon\CarbonImmutable;
use Inertia\Testing\AssertableInertia;

function admin(): User
{
    config(['auth.admin_emails' => ['admin@example.com']]);

    return User::factory()->create(['email' => 'admin@example.com', 'name' => 'Admin']);
}

function usage(User $user, string $tool, bool $ok = true, string $when = 'now', int $bytes = 1000): ToolUsage
{
    $usage = ToolUsage::create([
        'user_id' => $user->id, 'tool' => $tool, 'ok' => $ok, 'error' => $ok ? null : 'falló',
        'files' => 1, 'bytes' => $bytes, 'duration_ms' => 200,
    ]);
    $usage->forceFill(['created_at' => CarbonImmutable::parse($when)])->save();

    return $usage;
}

// --- registro de uso desde el navegador ---

test('registra el uso de una herramienta del navegador', function () {
    $user = User::factory()->create();

    $this->actingAs($user)->postJson('/uso', [
        'tool' => 'unir-pdf', 'ok' => true, 'files' => 3, 'bytes' => 52000, 'duration_ms' => 840,
    ])->assertNoContent();

    expect(ToolUsage::sole()->only('user_id', 'tool', 'ok', 'files', 'bytes', 'duration_ms', 'error'))->toBe([
        'user_id' => $user->id, 'tool' => 'unir-pdf', 'ok' => true, 'files' => 3, 'bytes' => 52000, 'duration_ms' => 840, 'error' => null,
    ]);
});

test('guarda el mensaje de error recortado', function () {
    $this->actingAs(User::factory()->create())->postJson('/uso', [
        'tool' => 'pdf-a-markdown', 'ok' => false, 'error' => str_repeat('x', 900), 'files' => 1, 'bytes' => 10, 'duration_ms' => 5,
    ])->assertNoContent();

    expect(mb_strlen(ToolUsage::sole()->error))->toBe(500);
});

test('rechaza herramientas inexistentes o de servidor (esas se registran solas)', function (string $tool) {
    $this->actingAs(User::factory()->create())
        ->postJson('/uso', ['tool' => $tool, 'ok' => true, 'files' => 1, 'bytes' => 1, 'duration_ms' => 1])
        ->assertJsonValidationErrors('tool');
})->with(['no-existe', 'comprimir-pdf']);

// --- acceso ---

test('solo los admins ven Estadísticas', function () {
    $this->actingAs(User::factory()->create())->get('/estadisticas')->assertForbidden();
    $this->actingAs(admin())->get('/estadisticas')->assertOk();
});

// --- vista general ---

test('la vista general suma el uso del período, por herramienta y por usuario', function () {
    $this->travelTo(CarbonImmutable::parse('2026-11-13 15:00', 'UTC'));
    $admin = admin();
    $ana = User::factory()->create(['name' => 'Ana']);
    $beto = User::factory()->create(['name' => 'Beto']);

    usage($ana, 'unir-pdf', true, '2026-11-13 10:00', 3000);
    usage($ana, 'unir-pdf', false, '2026-11-12 10:00');
    usage($beto, 'dividir-pdf', true, '2026-11-12 11:00');
    usage($beto, 'dividir-pdf', true, '2026-09-01 11:00'); // fuera de los 30 días

    $this->actingAs($admin)->get('/estadisticas?dias=30')
        ->assertInertia(fn (AssertableInertia $page) => $page
            ->component('stats/Index')
            ->where('dias', 30)
            ->where('totales.conversiones', 3)
            ->where('totales.exitos', 2)
            ->where('totales.usuariosActivos', 2)
            ->where('totales.bytes', 5000)
            ->has('serie', 30)
            ->where('serie.29', ['label' => '2026-11-13', 'total' => 1, 'ok' => 1])
            ->where('serie.28', ['label' => '2026-11-12', 'total' => 2, 'ok' => 1])
            ->where('herramientas.0.tool', 'unir-pdf')
            ->where('herramientas.0.total', 2)
            ->has('usuarios', 3) // también los que no usaron nada
            ->where('usuarios.0.name', 'Ana')
            ->where('usuarios.0.conversiones', 2)
            ->where('usuarios.0.exitos', 1)
            ->where('usuarios.2.conversiones', 0));
});

test('«todo» agrupa por mes e incluye el uso viejo', function () {
    $this->travelTo(CarbonImmutable::parse('2026-11-13 15:00', 'UTC'));
    $admin = admin();
    usage($admin, 'unir-pdf', true, '2026-09-01 11:00');
    usage($admin, 'unir-pdf', true, '2026-11-02 11:00');

    $this->actingAs($admin)->get('/estadisticas?dias=todo')
        ->assertInertia(fn (AssertableInertia $page) => $page
            ->where('dias', null)
            ->where('totales.conversiones', 2)
            ->where('serie', [
                ['label' => '2026-09', 'total' => 1, 'ok' => 1],
                ['label' => '2026-10', 'total' => 0, 'ok' => 0],
                ['label' => '2026-11', 'total' => 1, 'ok' => 1],
            ]));
});

test('los días se cuentan en hora argentina', function () {
    $this->travelTo(CarbonImmutable::parse('2026-11-13 15:00', 'UTC'));
    $admin = admin();
    // 01:30 UTC del 13 = 22:30 del 12 en Buenos Aires
    usage($admin, 'unir-pdf', true, '2026-11-13 01:30');

    $this->actingAs($admin)->get('/estadisticas?dias=7')
        ->assertInertia(fn (AssertableInertia $page) => $page
            ->where('serie.5', ['label' => '2026-11-12', 'total' => 1, 'ok' => 1])
            ->where('serie.6', ['label' => '2026-11-13', 'total' => 0, 'ok' => 0]));
});

// --- detalle por usuario ---

test('el detalle de un usuario muestra solo su uso y sus errores', function () {
    $admin = admin();
    $ana = User::factory()->create(['name' => 'Ana']);
    usage($ana, 'unir-pdf');
    usage($ana, 'pdf-a-markdown', false);
    usage($admin, 'unir-pdf');

    $this->actingAs($admin)->get("/estadisticas/usuarios/{$ana->id}")
        ->assertInertia(fn (AssertableInertia $page) => $page
            ->component('stats/User')
            ->where('usuario.name', 'Ana')
            ->where('totales.conversiones', 2)
            ->has('herramientas', 2)
            ->has('errores', 1)
            ->where('errores.0.tool', 'pdf-a-markdown')
            ->where('errores.0.error', 'falló'));
});

// --- bloqueo ---

test('el admin bloquea y desbloquea a un usuario', function () {
    $admin = admin();
    $ana = User::factory()->create();

    $this->actingAs($admin)->post("/estadisticas/usuarios/{$ana->id}/bloquear")->assertSessionHas('success');
    expect($ana->fresh()->isBlocked())->toBeTrue();

    $this->actingAs($admin)->post("/estadisticas/usuarios/{$ana->id}/desbloquear");
    expect($ana->fresh()->isBlocked())->toBeFalse();
});

test('no se puede bloquear a un admin', function () {
    $admin = admin();

    $this->actingAs($admin)->post("/estadisticas/usuarios/{$admin->id}/bloquear")->assertSessionHas('error');
    expect($admin->fresh()->isBlocked())->toBeFalse();
});

test('un usuario común no puede bloquear', function () {
    $ana = User::factory()->create();
    $beto = User::factory()->create();

    $this->actingAs($ana)->post("/estadisticas/usuarios/{$beto->id}/bloquear")->assertForbidden();
});
