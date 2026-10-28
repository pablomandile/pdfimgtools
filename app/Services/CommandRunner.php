<?php

namespace App\Services;

use RuntimeException;
use Symfony\Component\Process\Process;

/**
 * Ejecuta un comando externo. Está aparte para poder reemplazarlo en los tests.
 */
class CommandRunner
{
    /**
     * @param  array<string>  $command
     * @param  array<int>  $okCodes  códigos de salida que cuentan como éxito
     *
     * @throws RuntimeException si el comando termina con error
     */
    public function run(array $command, string $cwd, array $okCodes = [0]): void
    {
        $process = new Process($command, $cwd, null, null, config('tools.timeout'));
        $process->run();

        if (! in_array($process->getExitCode(), $okCodes, true)) {
            throw new RuntimeException(trim($process->getErrorOutput() ?: $process->getOutput()));
        }
    }
}
