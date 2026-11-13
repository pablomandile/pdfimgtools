<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Un uso de una herramienta (ver la migración create_tool_usages_table).
 */
class ToolUsage extends Model
{
    public const UPDATED_AT = null;

    protected $fillable = ['user_id', 'tool', 'ok', 'error', 'files', 'bytes', 'duration_ms'];

    protected function casts(): array
    {
        return [
            'ok' => 'boolean',
            'files' => 'integer',
            'bytes' => 'integer',
            'duration_ms' => 'integer',
            'created_at' => 'datetime',
        ];
    }

    /** @return BelongsTo<User, $this> */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
