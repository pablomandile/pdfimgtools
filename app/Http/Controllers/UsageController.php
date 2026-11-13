<?php

namespace App\Http\Controllers;

use App\Models\ToolUsage;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Validation\Rule;

/**
 * Registro de uso de las herramientas que corren en el navegador: el servidor
 * no ve esos archivos, así que la página avisa cuando termina. Las de servidor
 * se registran solas en ToolController.
 */
class UsageController extends Controller
{
    public function store(Request $request): Response
    {
        $clientTools = collect(config('tools.list'))->where('mode', 'client')->keys()->all();

        $data = $request->validate([
            'tool' => ['required', 'string', Rule::in($clientTools)],
            'ok' => ['required', 'boolean'],
            'error' => ['nullable', 'string'],
            'files' => ['required', 'integer', 'min:0', 'max:10000'],
            'bytes' => ['required', 'integer', 'min:0'],
            'duration_ms' => ['required', 'integer', 'min:0'],
        ]);

        ToolUsage::create([
            'user_id' => $request->user()->id,
            'tool' => $data['tool'],
            'ok' => $data['ok'],
            'error' => $data['ok'] ? null : (mb_substr((string) ($data['error'] ?? ''), 0, 500) ?: null),
            'files' => $data['files'],
            'bytes' => $data['bytes'],
            'duration_ms' => min($data['duration_ms'], 86_400_000),
        ]);

        return response()->noContent();
    }
}
