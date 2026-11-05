<?php

/*
|--------------------------------------------------------------------------
| Catálogo de herramientas
|--------------------------------------------------------------------------
|
| Fuente única de las herramientas: de acá salen la home, las rutas y la
| validación del endpoint de procesamiento.
|
| - component: página Vue en resources/js/pages/tools/{component}.vue
| - mode:      'client' se procesa en el navegador, 'server' acá.
| - requires:  binario externo que necesita (ver 'binaries').
| - accept:    atributo accept del input de archivos.
|
*/

$pdf = '.pdf,application/pdf';
$images = '.jpg,.jpeg,.png,.webp,.gif,.bmp,.heic,.heif,image/jpeg,image/png,image/webp,image/gif,image/bmp,image/heic,image/heif';
$markdown = '.md,.markdown,.txt,text/markdown,text/plain';
$office = '.doc,.docx,.odt,.rtf,.txt,.xls,.xlsx,.ods,.csv,.ppt,.pptx,.odp';

return [

    'categories' => [
        'organizar' => 'Organizar',
        'convertir' => 'Convertir',
        'editar' => 'Editar',
        'seguridad' => 'Seguridad',
        'optimizar' => 'Optimizar',
    ],

    'list' => [
        'unir-pdf' => [
            'name' => 'Unir PDF',
            'description' => 'Juntá varios PDF en uno solo, en el orden que elijas.',
            'category' => 'organizar',
            'icon' => 'Combine',
            'component' => 'Merge',
            'mode' => 'client',
            'accept' => $pdf,
            'multiple' => true,
        ],
        'dividir-pdf' => [
            'name' => 'Dividir PDF',
            'description' => 'Separá un PDF por rangos, cada N páginas o en páginas sueltas.',
            'category' => 'organizar',
            'icon' => 'Scissors',
            'component' => 'Split',
            'mode' => 'client',
            'accept' => $pdf,
            'multiple' => false,
        ],
        'extraer-paginas' => [
            'name' => 'Extraer páginas',
            'description' => 'Elegí páginas y armá un PDF nuevo solo con ellas.',
            'category' => 'organizar',
            'icon' => 'FileOutput',
            'component' => 'Pages',
            'mode' => 'client',
            'accept' => $pdf,
            'multiple' => false,
        ],
        'eliminar-paginas' => [
            'name' => 'Eliminar páginas',
            'description' => 'Sacá las páginas que sobran de un PDF.',
            'category' => 'organizar',
            'icon' => 'FileMinus',
            'component' => 'Pages',
            'mode' => 'client',
            'accept' => $pdf,
            'multiple' => false,
        ],
        'ordenar-paginas' => [
            'name' => 'Ordenar páginas',
            'description' => 'Arrastrá las páginas para cambiarles el orden.',
            'category' => 'organizar',
            'icon' => 'ArrowDownUp',
            'component' => 'Pages',
            'mode' => 'client',
            'accept' => $pdf,
            'multiple' => false,
        ],
        'rotar-pdf' => [
            'name' => 'Rotar PDF',
            'description' => 'Girá todas las páginas o solo algunas.',
            'category' => 'organizar',
            'icon' => 'RotateCw',
            'component' => 'Pages',
            'mode' => 'client',
            'accept' => $pdf,
            'multiple' => false,
        ],

        'imagen-a-pdf' => [
            'name' => 'Imágenes a PDF',
            'description' => 'Convertí JPG, PNG, WebP o HEIC en un PDF, una imagen por página.',
            'category' => 'convertir',
            'icon' => 'ImagePlus',
            'component' => 'ImagesToPdf',
            'mode' => 'client',
            'accept' => $images,
            'multiple' => true,
        ],
        'pdf-a-imagen' => [
            'name' => 'PDF a imágenes',
            'description' => 'Exportá cada página del PDF como JPG o PNG.',
            'category' => 'convertir',
            'icon' => 'Images',
            'component' => 'PdfToImages',
            'mode' => 'client',
            'accept' => $pdf,
            'multiple' => false,
        ],
        'pdf-a-markdown' => [
            'name' => 'PDF a Markdown',
            'description' => 'Extraé el texto de un PDF (todo o algunas páginas) como Markdown, con títulos y listas.',
            'category' => 'convertir',
            'icon' => 'FileCode',
            'component' => 'PdfToMarkdown',
            'mode' => 'client',
            'accept' => $pdf,
            'multiple' => false,
        ],
        'markdown-a-pdf' => [
            'name' => 'Markdown a PDF',
            'description' => 'Convertí un archivo .md (o texto pegado) en un PDF con formato.',
            'category' => 'convertir',
            'icon' => 'FileInput',
            'component' => 'MarkdownToPdf',
            'mode' => 'client',
            'accept' => $markdown,
            'multiple' => false,
        ],
        'convertir-imagen' => [
            'name' => 'Convertir imágenes',
            'description' => 'Pasá imágenes (también HEIC de iPhone) a JPG, PNG o WebP y cambiales el tamaño.',
            'category' => 'convertir',
            'icon' => 'RefreshCw',
            'component' => 'ConvertImage',
            'mode' => 'client',
            'accept' => $images,
            'multiple' => true,
        ],
        'quitar-fondo' => [
            'name' => 'Quitar fondo',
            'description' => 'Dejá el fondo de una imagen transparente: automático con IA o por color.',
            'category' => 'editar',
            'icon' => 'Eraser',
            'component' => 'RemoveBackground',
            'mode' => 'client',
            'accept' => $images,
            'multiple' => true,
        ],
        'office-a-pdf' => [
            'name' => 'Office a PDF',
            'description' => 'Convertí documentos de Word, Excel o PowerPoint a PDF.',
            'category' => 'convertir',
            'icon' => 'FileText',
            'component' => 'Server',
            'mode' => 'server',
            'requires' => 'soffice',
            'accept' => $office,
            'multiple' => false,
        ],
        'pdf-a-word' => [
            'name' => 'PDF a Word',
            'description' => 'Convertí un PDF en un .docx editable (mejor con PDF de texto simple).',
            'category' => 'convertir',
            'icon' => 'FileType',
            'component' => 'Server',
            'mode' => 'server',
            'requires' => 'soffice',
            'accept' => $pdf,
            'multiple' => false,
        ],

        'numerar-paginas' => [
            'name' => 'Numerar páginas',
            'description' => 'Agregá números de página, con la posición y el formato que quieras.',
            'category' => 'editar',
            'icon' => 'ListOrdered',
            'component' => 'PageNumbers',
            'mode' => 'client',
            'accept' => $pdf,
            'multiple' => false,
        ],
        'marca-de-agua' => [
            'name' => 'Marca de agua',
            'description' => 'Estampá un texto o una imagen sobre las páginas.',
            'category' => 'editar',
            'icon' => 'Stamp',
            'component' => 'Watermark',
            'mode' => 'client',
            'accept' => $pdf,
            'multiple' => false,
        ],
        'firmar-pdf' => [
            'name' => 'Firmar PDF',
            'description' => 'Dibujá o subí tu firma y ubicala en la página.',
            'category' => 'editar',
            'icon' => 'Signature',
            'component' => 'Sign',
            'mode' => 'client',
            'accept' => $pdf,
            'multiple' => false,
        ],

        'proteger-pdf' => [
            'name' => 'Proteger PDF',
            'description' => 'Poné una contraseña para abrir el PDF (cifrado AES-256).',
            'category' => 'seguridad',
            'icon' => 'Lock',
            'component' => 'Server',
            'mode' => 'server',
            'requires' => 'qpdf',
            'accept' => $pdf,
            'multiple' => false,
        ],
        'desbloquear-pdf' => [
            'name' => 'Desbloquear PDF',
            'description' => 'Sacale la contraseña a un PDF del que la conocés.',
            'category' => 'seguridad',
            'icon' => 'LockOpen',
            'component' => 'Server',
            'mode' => 'server',
            'requires' => 'qpdf',
            'accept' => $pdf,
            'multiple' => false,
        ],

        'comprimir-pdf' => [
            'name' => 'Comprimir PDF',
            'description' => 'Achicá el tamaño del PDF eligiendo cuánta calidad sacrificar.',
            'category' => 'optimizar',
            'icon' => 'Minimize2',
            'component' => 'Server',
            'mode' => 'server',
            'requires' => 'gs',
            'accept' => $pdf,
            'multiple' => false,
        ],
    ],

    /*
    | Binarios para las herramientas de servidor. Si la ruta del .env está
    | vacía, se buscan en el PATH y en las carpetas de instalación típicas.
    */
    'binaries' => [
        'gs' => [
            'label' => 'Ghostscript',
            'path' => env('GS_PATH'),
            'names' => ['gswin64c', 'gswin32c', 'gs'],
            'globs' => ['C:/Program Files/gs/gs*/bin/gswin64c.exe'],
            'install' => 'winget install ArtifexSoftware.GhostScript',
        ],
        'qpdf' => [
            'label' => 'qpdf',
            'path' => env('QPDF_PATH'),
            'names' => ['qpdf'],
            'globs' => ['C:/Program Files/qpdf*/bin/qpdf.exe'],
            'install' => 'winget install QPDF.QPDF',
        ],
        'soffice' => [
            'label' => 'LibreOffice',
            'path' => env('SOFFICE_PATH'),
            'names' => ['soffice', 'libreoffice'],
            'globs' => ['C:/Program Files/LibreOffice/program/soffice.exe'],
            'install' => 'winget install TheDocumentFoundation.LibreOffice',
        ],
    ],

    'max_upload_mb' => (int) env('MAX_UPLOAD_MB', 100),

    // Segundos máximos por proceso externo (LibreOffice puede tardar).
    'timeout' => (int) env('TOOLS_TIMEOUT', 300),

];
