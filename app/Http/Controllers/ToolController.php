<?php

namespace App\Http\Controllers;

use App\Services\Binaries;
use App\Services\CommandRunner;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Inertia\Inertia;
use Inertia\Response;
use RuntimeException;
use Symfony\Component\HttpFoundation\StreamedResponse;

class ToolController extends Controller
{
    public function __construct(
        private Binaries $binaries,
        private CommandRunner $runner,
    ) {}

    public function show(string $slug): Response
    {
        $tool = config("tools.list.$slug") ?? abort(404);

        return Inertia::render('tools/'.$tool['component'], [
            'tool' => ['slug' => $slug, ...$tool],
        ]);
    }

    /**
     * Procesa un archivo con una herramienta de servidor y devuelve el resultado.
     */
    public function process(Request $request, string $slug): StreamedResponse
    {
        $tool = config("tools.list.$slug");

        abort_unless($tool && $tool['mode'] === 'server', 404);

        if (! $this->binaries->has($tool['requires'])) {
            $binary = config("tools.binaries.{$tool['requires']}");

            abort(503, "Esta herramienta necesita {$binary['label']}, que no está instalado. Instalalo con: {$binary['install']}");
        }

        $options = $request->validate($this->rules($slug));

        /** @var UploadedFile $file */
        $file = $options['file'];
        $dir = storage_path('app/tmp/'.Str::uuid());
        File::ensureDirectoryExists($dir);

        try {
            $input = $dir.'/input.'.strtolower($file->getClientOriginalExtension() ?: 'pdf');
            $file->move($dir, basename($input));

            [$output, $suffix] = $this->handle($slug, $input, $dir, $options);
        } catch (RuntimeException $e) {
            File::deleteDirectory($dir);
            Log::warning("Falló {$slug}: {$e->getMessage()}");

            abort(422, $this->friendlyError($slug, $e->getMessage()));
        }

        $baseName = pathinfo($file->getClientOriginalName(), PATHINFO_FILENAME);
        $downloadName = $baseName.$suffix.'.'.pathinfo($output, PATHINFO_EXTENSION);

        return response()->streamDownload(function () use ($output, $dir) {
            try {
                readfile($output);
            } finally {
                File::deleteDirectory($dir);
            }
        }, $downloadName, [
            'Content-Type' => File::mimeType($output) ?: 'application/octet-stream',
            'Content-Length' => (string) filesize($output),
            'X-Original-Size' => (string) filesize($input),
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    private function rules(string $slug): array
    {
        $maxKb = config('tools.max_upload_mb') * 1024;
        $file = ['required', 'file', "max:$maxKb"];

        return match ($slug) {
            'office-a-pdf' => [
                'file' => [...$file, 'extensions:doc,docx,odt,rtf,txt,xls,xlsx,ods,csv,ppt,pptx,odp'],
            ],
            'comprimir-pdf' => [
                'file' => [...$file, 'mimes:pdf'],
                'level' => ['required', Rule::in(['baja', 'media', 'alta'])],
            ],
            'proteger-pdf' => [
                'file' => [...$file, 'mimes:pdf'],
                'password' => ['required', 'string', 'min:4', 'max:127'],
                'owner_password' => ['nullable', 'string', 'max:127'],
            ],
            'desbloquear-pdf' => [
                'file' => [...$file, 'mimes:pdf'],
                'password' => ['nullable', 'string', 'max:127'],
            ],
            default => [
                'file' => [...$file, 'mimes:pdf'],
            ],
        };
    }

    /**
     * Corre la herramienta y devuelve [ruta del resultado, sufijo del nombre].
     *
     * @param  array<string, mixed>  $options
     * @return array{0: string, 1: string}
     */
    private function handle(string $slug, string $input, string $dir, array $options): array
    {
        $bin = fn (string $key) => $this->binaries->path($key);
        $output = $dir.'/output.pdf';

        switch ($slug) {
            case 'comprimir-pdf':
                $preset = ['baja' => '/printer', 'media' => '/ebook', 'alta' => '/screen'][$options['level']];
                $this->runner->run([
                    $bin('gs'), '-sDEVICE=pdfwrite', '-dCompatibilityLevel=1.5',
                    "-dPDFSETTINGS=$preset", '-dDetectDuplicateImages=true', '-dCompressFonts=true',
                    '-dNOPAUSE', '-dQUIET', '-dBATCH', "-sOutputFile=$output", $input,
                ], $dir);

                // Si no se pudo achicar, mejor devolver el original.
                if (! is_file($output) || filesize($output) >= filesize($input)) {
                    File::copy($input, $output);
                }

                return [$output, '_comprimido'];

            case 'proteger-pdf':
                $owner = ($options['owner_password'] ?? null) ?: $options['password'];
                $this->runner->run([
                    $bin('qpdf'), '--encrypt', $options['password'], $owner, '256', '--', $input, $output,
                ], $dir, [0, 3]);

                return [$output, '_protegido'];

            case 'desbloquear-pdf':
                $this->runner->run([
                    $bin('qpdf'), '--password='.($options['password'] ?? ''), '--decrypt', $input, $output,
                ], $dir, [0, 3]);

                return [$output, '_desbloqueado'];

            case 'office-a-pdf':
                $this->soffice($input, $dir, 'pdf');

                return [$dir.'/input.pdf', ''];

            case 'pdf-a-word':
                $this->soffice($input, $dir, 'docx:MS Word 2007 XML', ['--infilter=writer_pdf_import']);

                return [$dir.'/input.docx', ''];
        }

        throw new RuntimeException("Herramienta sin implementar: $slug");
    }

    /**
     * @param  array<string>  $extra
     */
    private function soffice(string $input, string $dir, string $convertTo, array $extra = []): void
    {
        // Perfil propio por conversión: si LibreOffice está abierto, no choca con él.
        $profile = 'file:///'.ltrim(str_replace('\\', '/', $dir.'/profile'), '/');

        $this->runner->run([
            $this->binaries->path('soffice'), '--headless', '--norestore', '--nologo',
            "-env:UserInstallation=$profile", ...$extra,
            '--convert-to', $convertTo, '--outdir', $dir, $input,
        ], $dir);

        $expected = $dir.'/input.'.Str::before($convertTo, ':');

        if (! is_file($expected)) {
            throw new RuntimeException('LibreOffice no generó el archivo de salida.');
        }
    }

    private function friendlyError(string $slug, string $message): string
    {
        if (str_contains(strtolower($message), 'invalid password')) {
            return 'La contraseña no es correcta.';
        }

        return match ($slug) {
            'office-a-pdf', 'pdf-a-word' => 'LibreOffice no pudo convertir el archivo. Revisá que no esté dañado ni protegido.',
            'comprimir-pdf' => 'Ghostscript no pudo procesar el PDF. Puede estar dañado o protegido con contraseña.',
            default => 'No se pudo procesar el archivo. Puede estar dañado.',
        };
    }
}
