<?php

use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\File;
use Illuminate\Support\Facades\Schedule;

Artisan::command('tmp:purge {--minutes=60}', function () {
    $limit = now()->subMinutes((int) $this->option('minutes'))->getTimestamp();
    $deleted = 0;

    foreach (File::directories(storage_path('app/tmp')) as $dir) {
        if (File::lastModified($dir) < $limit) {
            File::deleteDirectory($dir);
            $deleted++;
        }
    }

    $this->info("Carpetas temporales borradas: $deleted");
})->purpose('Borra los archivos temporales de las herramientas de servidor');

Schedule::command('tmp:purge')->hourly();
