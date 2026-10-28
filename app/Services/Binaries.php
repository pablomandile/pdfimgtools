<?php

namespace App\Services;

use Symfony\Component\Process\ExecutableFinder;

/**
 * Ubica los binarios externos (Ghostscript, qpdf, LibreOffice) que usan las
 * herramientas de servidor.
 */
class Binaries
{
    /** @var array<string, string|null> */
    private array $resolved = [];

    public function path(string $key): ?string
    {
        if (array_key_exists($key, $this->resolved)) {
            return $this->resolved[$key];
        }

        $config = config("tools.binaries.$key");

        return $this->resolved[$key] = $config ? $this->find($config) : null;
    }

    public function has(string $key): bool
    {
        return $this->path($key) !== null;
    }

    /**
     * Estado de cada binario, para mostrar en la UI.
     *
     * @return array<string, array{label: string, available: bool, install: string}>
     */
    public function status(): array
    {
        $status = [];

        foreach (config('tools.binaries') as $key => $config) {
            $status[$key] = [
                'label' => $config['label'],
                'available' => $this->has($key),
                'install' => $config['install'],
            ];
        }

        return $status;
    }

    /**
     * @param  array{path?: string|null, names: array<string>, globs: array<string>}  $config
     */
    private function find(array $config): ?string
    {
        if (! empty($config['path'])) {
            return is_file($config['path']) ? $config['path'] : null;
        }

        $finder = new ExecutableFinder;

        foreach ($config['names'] as $name) {
            if ($found = $finder->find($name)) {
                return $found;
            }
        }

        foreach ($config['globs'] as $pattern) {
            $matches = glob($pattern) ?: [];
            rsort($matches); // la versión más nueva primero

            if ($matches) {
                return $matches[0];
            }
        }

        return null;
    }
}
