<?php

namespace App\Http\Controllers;

use App\Models\ToolUsage;
use App\Models\User;
use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Inertia\Response;

/**
 * Sección Estadísticas (solo administradores): uso general, por herramienta y
 * por usuario. Los días se cuentan en hora argentina aunque la base guarde UTC.
 */
class StatsController extends Controller
{
    private const TZ = 'America/Argentina/Buenos_Aires';

    private const PERIODS = [7, 30, 90];

    public function index(Request $request): Response
    {
        $since = $this->since($request);
        $usages = fn (): Builder => ToolUsage::query()->when($since, fn ($q) => $q->where('created_at', '>=', $since));

        return Inertia::render('stats/Index', [
            'dias' => $this->days($request),
            'totales' => $this->totals($usages()),
            'serie' => $this->series($usages(), $since),
            'herramientas' => $this->byTool($usages()),
            'usuarios' => $this->users($since),
        ]);
    }

    public function show(Request $request, User $user): Response
    {
        $since = $this->since($request);
        $usages = fn (): Builder => $user->usages()->getQuery()->when($since, fn ($q) => $q->where('created_at', '>=', $since));

        return Inertia::render('stats/User', [
            'dias' => $this->days($request),
            'usuario' => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'avatar' => $user->avatar,
                'admin' => $user->isAdmin(),
                'blocked' => $user->isBlocked(),
                'registrado' => $user->created_at?->toIso8601String(),
                'ultimoLogin' => $user->last_login_at?->toIso8601String(),
            ],
            'totales' => $this->totals($usages()),
            'serie' => $this->series($usages(), $since),
            'herramientas' => $this->byTool($usages()),
            'errores' => $usages()
                ->where('ok', false)
                ->latest('created_at')
                ->limit(20)
                ->get(['tool', 'error', 'created_at'])
                ->map(fn (ToolUsage $u) => [
                    'tool' => $u->tool,
                    'error' => $u->error,
                    'fecha' => $u->created_at->toIso8601String(),
                ]),
        ]);
    }

    public function block(User $user): RedirectResponse
    {
        if ($user->isAdmin()) {
            return back()->with('error', 'No se puede bloquear a un administrador.');
        }

        $user->forceFill(['blocked_at' => now()])->save();
        DB::table('sessions')->where('user_id', $user->id)->delete(); // lo desloguea ya mismo

        return back()->with('success', "Bloqueaste a {$user->name}.");
    }

    public function unblock(User $user): RedirectResponse
    {
        $user->forceFill(['blocked_at' => null])->save();

        return back()->with('success', "Desbloqueaste a {$user->name}.");
    }

    /** Días del período elegido, o null para «todo». */
    private function days(Request $request): ?int
    {
        $value = $request->query('dias', '30');

        return in_array((int) $value, self::PERIODS, true) ? (int) $value : null;
    }

    private function since(Request $request): ?CarbonImmutable
    {
        $days = $this->days($request);

        return $days ? CarbonImmutable::now(self::TZ)->subDays($days - 1)->startOfDay()->utc() : null;
    }

    /**
     * @return array{conversiones: int, exitos: int, archivos: int, bytes: int, duracionMs: int, usuariosActivos: int}
     */
    private function totals(Builder $usages): array
    {
        $row = $usages
            ->selectRaw('count(*) as total')
            ->selectRaw('coalesce(sum(ok), 0) as exitos')
            ->selectRaw('coalesce(sum(files), 0) as archivos')
            ->selectRaw('coalesce(sum(bytes), 0) as bytes')
            ->selectRaw('coalesce(avg(duration_ms), 0) as duracion')
            ->selectRaw('count(distinct user_id) as usuarios')
            ->first();

        return [
            'conversiones' => (int) $row->total,
            'exitos' => (int) $row->exitos,
            'archivos' => (int) $row->archivos,
            'bytes' => (int) $row->bytes,
            'duracionMs' => (int) round((float) $row->duracion),
            'usuariosActivos' => (int) $row->usuarios,
        ];
    }

    /**
     * Serie para el gráfico: por día, o por mes cuando el período es «todo».
     * Incluye los días sin uso, para que el gráfico no tenga huecos.
     *
     * @return list<array{label: string, total: int, ok: int}>
     */
    private function series(Builder $usages, ?CarbonImmutable $since): array
    {
        $byMonth = $since === null;
        $expr = $byMonth ? $this->monthExpr() : $this->dayExpr();

        $rows = $usages
            ->selectRaw("$expr as periodo")
            ->selectRaw('count(*) as total')
            ->selectRaw('coalesce(sum(ok), 0) as exitos')
            ->groupBy('periodo')
            ->orderBy('periodo')
            ->get()
            ->keyBy('periodo');

        $start = $byMonth
            ? CarbonImmutable::parse(($rows->keys()->first() ?? CarbonImmutable::now(self::TZ)->format('Y-m')).'-01')
            : $since->setTimezone(self::TZ);
        $end = CarbonImmutable::now(self::TZ);

        $serie = [];
        for ($at = $start; $at <= $end; $at = $byMonth ? $at->addMonth() : $at->addDay()) {
            $key = $at->format($byMonth ? 'Y-m' : 'Y-m-d');
            $serie[] = [
                'label' => $key,
                'total' => (int) ($rows[$key]->total ?? 0),
                'ok' => (int) ($rows[$key]->exitos ?? 0),
            ];
        }

        return $serie;
    }

    /**
     * @return list<array{tool: string, total: int, ok: int, bytes: int}>
     */
    private function byTool(Builder $usages): array
    {
        return $usages
            ->selectRaw('tool')
            ->selectRaw('count(*) as total')
            ->selectRaw('coalesce(sum(ok), 0) as exitos')
            ->selectRaw('coalesce(sum(bytes), 0) as bytes')
            ->groupBy('tool')
            ->orderByDesc('total')
            ->get()
            ->map(fn ($row) => [
                'tool' => $row->tool,
                'total' => (int) $row->total,
                'ok' => (int) $row->exitos,
                'bytes' => (int) $row->bytes,
            ])
            ->all();
    }

    /**
     * Todos los usuarios registrados, con su uso dentro del período.
     *
     * @return list<array<string, mixed>>
     */
    private function users(?CarbonImmutable $since): array
    {
        $agg = ToolUsage::query()
            ->when($since, fn ($q) => $q->where('created_at', '>=', $since))
            ->selectRaw('user_id')
            ->selectRaw('count(*) as total')
            ->selectRaw('coalesce(sum(ok), 0) as exitos')
            ->selectRaw('coalesce(sum(files), 0) as archivos')
            ->selectRaw('coalesce(sum(bytes), 0) as bytes')
            ->selectRaw('max(created_at) as ultimo_uso')
            ->groupBy('user_id');

        return User::query()
            ->leftJoinSub($agg, 'uso', 'uso.user_id', '=', 'users.id')
            ->orderByDesc(DB::raw('coalesce(uso.total, 0)'))
            ->orderByDesc('users.last_login_at')
            ->get([
                'users.id', 'users.name', 'users.email', 'users.avatar', 'users.blocked_at', 'users.last_login_at',
                'uso.total', 'uso.exitos', 'uso.archivos', 'uso.bytes', 'uso.ultimo_uso',
            ])
            ->map(fn (User $user) => [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'avatar' => $user->avatar,
                'admin' => $user->isAdmin(),
                'blocked' => $user->blocked_at !== null,
                'ultimoLogin' => $user->last_login_at?->toIso8601String(),
                'conversiones' => (int) ($user->total ?? 0),
                'exitos' => (int) ($user->exitos ?? 0),
                'archivos' => (int) ($user->archivos ?? 0),
                'bytes' => (int) ($user->bytes ?? 0),
                'ultimoUso' => $user->ultimo_uso ? CarbonImmutable::parse($user->ultimo_uso, 'UTC')->toIso8601String() : null,
            ])
            ->all();
    }

    /** Fecha (hora argentina) para agrupar por día. ART no tiene horario de verano. */
    private function dayExpr(): string
    {
        return match (DB::connection()->getDriverName()) {
            'sqlite' => "date(created_at, '-3 hours')",
            default => "DATE(CONVERT_TZ(created_at, '+00:00', '-03:00'))",
        };
    }

    private function monthExpr(): string
    {
        return match (DB::connection()->getDriverName()) {
            'sqlite' => "strftime('%Y-%m', created_at, '-3 hours')",
            default => "DATE_FORMAT(CONVERT_TZ(created_at, '+00:00', '-03:00'), '%Y-%m')",
        };
    }
}
