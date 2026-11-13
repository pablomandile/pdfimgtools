<?php

namespace App\Models;

use Database\Factories\UserFactory;
use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;

/**
 * Las cuentas con contraseña tienen que confirmar el email (MustVerifyEmail);
 * las de Google llegan confirmadas.
 */
class User extends Authenticatable implements MustVerifyEmail
{
    /** @use HasFactory<UserFactory> */
    use HasFactory, Notifiable;

    /**
     * @var list<string>
     */
    protected $fillable = [
        'name',
        'email',
        'password',
        'google_id',
        'avatar',
        'last_login_at',
    ];

    /**
     * @var list<string>
     */
    protected $hidden = [
        'password',
        'remember_token',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'last_login_at' => 'datetime',
            'blocked_at' => 'datetime',
            'password' => 'hashed',
        ];
    }

    /** @return HasMany<ToolUsage, $this> */
    public function usages(): HasMany
    {
        return $this->hasMany(ToolUsage::class);
    }

    /** Admin = su email figura en ADMIN_EMAILS (separados por coma). */
    public function isAdmin(): bool
    {
        return in_array(strtolower($this->email), config('auth.admin_emails'), true);
    }

    public function isBlocked(): bool
    {
        return $this->blocked_at !== null;
    }
}
