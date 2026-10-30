<?php

use App\Services\Binaries;
use App\Services\CommandRunner;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\File;
use Inertia\Testing\AssertableInertia;

/** Binarios falsos: todos "instalados", o ninguno. */
function fakeBinaries(bool $available): void
{
    app()->instance(Binaries::class, new class($available) extends Binaries
    {
        public function __construct(private bool $available) {}

        public function path(string $key): ?string
        {
            return $this->available ? "/fake/$key" : null;
        }
    });
}

/**
 * Runner falso: en vez de correr el programa, escribe en el archivo de salida
 * (el que viene después de -sOutputFile= o el último argumento) y guarda el comando.
 */
function fakeRunner(string $output = '%PDF-1.4 resultado', ?string $error = null): object
{
    $runner = new class($output, $error) extends CommandRunner
    {
        public array $commands = [];

        public function __construct(private string $output, private ?string $error) {}

        public function run(array $command, string $cwd, array $okCodes = [0]): void
        {
            $this->commands[] = $command;

            if ($this->error) {
                throw new RuntimeException($this->error);
            }

            $target = collect($command)->first(fn ($arg) => str_starts_with($arg, '-sOutputFile='));
            $target = $target ? substr($target, strlen('-sOutputFile=')) : end($command);
            file_put_contents($target, $this->output);
        }
    };

    app()->instance(CommandRunner::class, $runner);

    return $runner;
}

function tmpDirs(): array
{
    return File::directories(storage_path('app/tmp'));
}

/**
 * Archivo subido desde un archivo real en disco. UploadedFile::fake() deja
 * abierto el handle del temporal, y en Windows eso impide borrar la carpeta.
 */
function upload(string $name, string $content): UploadedFile
{
    $path = tempnam(sys_get_temp_dir(), 'pdfimgtools');
    file_put_contents($path, $content);

    return new UploadedFile($path, $name, null, null, true);
}

function pdfUpload(string $name = 'informe.pdf'): UploadedFile
{
    return upload($name, "%PDF-1.4\n% un pdf de prueba\n".str_repeat('x', 2000));
}

beforeEach(fn () => array_map(File::deleteDirectory(...), tmpDirs()));

test('la home lista las herramientas y el estado de los binarios', function () {
    fakeBinaries(false);

    $this->get('/')
        ->assertOk()
        ->assertInertia(fn (AssertableInertia $page) => $page
            ->component('Home')
            ->has('tools', count(config('tools.list')))
            ->where('binaries.gs.available', false)
            ->where('binaries.qpdf.install', 'winget install QPDF.QPDF'));
});

test('cada herramienta tiene su página', function (string $slug) {
    $this->get("/$slug")
        ->assertOk()
        ->assertInertia(fn (AssertableInertia $page) => $page
            ->component('tools/'.config("tools.list.$slug.component"))
            ->where('tool.slug', $slug));
})->with(fn () => array_keys((require __DIR__.'/../../config/tools.php')['list']));

test('una herramienta que no existe da 404', function () {
    $this->get('/no-existe')->assertNotFound();
    $this->postJson('/procesar/no-existe')->assertNotFound();
});

test('las herramientas del navegador no se pueden procesar en el servidor', function () {
    $this->postJson('/procesar/unir-pdf', ['file' => pdfUpload()])->assertNotFound();
});

test('si falta el binario responde 503 con cómo instalarlo', function () {
    fakeBinaries(false);

    $this->postJson('/procesar/comprimir-pdf', ['file' => pdfUpload(), 'level' => 'media'])
        ->assertStatus(503)
        ->assertJsonPath('message', fn ($m) => str_contains($m, 'Ghostscript') && str_contains($m, 'winget install'));
});

test('valida el archivo y las opciones', function () {
    fakeBinaries(true);
    fakeRunner();

    $this->postJson('/procesar/comprimir-pdf', ['level' => 'media'])->assertJsonValidationErrors('file');
    $this->postJson('/procesar/comprimir-pdf', ['file' => UploadedFile::fake()->create('foto.jpg', 10), 'level' => 'media'])
        ->assertJsonValidationErrors('file');
    $this->postJson('/procesar/comprimir-pdf', ['file' => pdfUpload(), 'level' => 'extrema'])->assertJsonValidationErrors('level');
    $this->postJson('/procesar/proteger-pdf', ['file' => pdfUpload(), 'password' => 'ab'])->assertJsonValidationErrors('password');
});

test('respeta el límite de tamaño', function () {
    fakeBinaries(true);
    config(['tools.max_upload_mb' => 1]);

    $this->postJson('/procesar/comprimir-pdf', [
        'file' => UploadedFile::fake()->create('grande.pdf', 2048, 'application/pdf'),
        'level' => 'media',
    ])->assertJsonValidationErrors('file');
});

test('comprimir devuelve el resultado y borra los temporales', function () {
    fakeBinaries(true);
    $runner = fakeRunner('%PDF-1.4 chico');

    $response = $this->post('/procesar/comprimir-pdf', ['file' => pdfUpload(), 'level' => 'alta'], ['Accept' => 'application/json']);

    $response->assertOk()->assertDownload('informe_comprimido.pdf');
    expect($response->streamedContent())->toBe('%PDF-1.4 chico')
        ->and($runner->commands[0])->toContain('-dPDFSETTINGS=/screen')
        ->and(tmpDirs())->toBeEmpty();
});

test('si comprimir no achica, devuelve el original', function () {
    fakeBinaries(true);
    fakeRunner(str_repeat('y', 50_000));

    $response = $this->post('/procesar/comprimir-pdf', ['file' => pdfUpload(), 'level' => 'baja'], ['Accept' => 'application/json']);

    expect($response->streamedContent())->toStartWith('%PDF-1.4');
});

test('proteger cifra con AES-256 y usa la misma contraseña de propietario si no hay otra', function () {
    fakeBinaries(true);
    $runner = fakeRunner();

    $this->post('/procesar/proteger-pdf', ['file' => pdfUpload(), 'password' => 'secreta'], ['Accept' => 'application/json'])
        ->assertOk()
        ->assertDownload('informe_protegido.pdf');

    expect($runner->commands[0])->toMatchArray([1 => '--encrypt', 2 => 'secreta', 3 => 'secreta', 4 => '256']);
});

test('desbloquear con la contraseña equivocada da un error claro y limpia', function () {
    fakeBinaries(true);
    fakeRunner(error: 'qpdf: informe.pdf: invalid password');

    $this->postJson('/procesar/desbloquear-pdf', ['file' => pdfUpload(), 'password' => 'mal'])
        ->assertStatus(422)
        ->assertJsonPath('message', 'La contraseña no es correcta.');

    expect(tmpDirs())->toBeEmpty();
});

test('office a pdf acepta documentos de Word y devuelve un pdf con el mismo nombre', function () {
    fakeBinaries(true);
    // LibreOffice escribe input.pdf en la carpeta de salida: el runner falso lo imita.
    app()->instance(CommandRunner::class, new class extends CommandRunner
    {
        public function run(array $command, string $cwd, array $okCodes = [0]): void
        {
            file_put_contents($cwd.'/input.pdf', '%PDF-1.4 desde word');
        }
    });

    $response = $this->post('/procesar/office-a-pdf', [
        'file' => upload('Carta a Juan.docx', 'PK contenido'),
    ], ['Accept' => 'application/json']);

    $response->assertOk()->assertDownload('Carta a Juan.pdf');
    expect($response->streamedContent())->toBe('%PDF-1.4 desde word');
});

test('tmp:purge borra solo las carpetas viejas', function () {
    $old = storage_path('app/tmp/vieja');
    $new = storage_path('app/tmp/nueva');
    File::ensureDirectoryExists($old);
    File::ensureDirectoryExists($new);
    touch($old, now()->subHours(2)->getTimestamp());

    $this->artisan('tmp:purge')->assertSuccessful();

    expect(is_dir($old))->toBeFalse()->and(is_dir($new))->toBeTrue();
    File::deleteDirectory($new);
});
