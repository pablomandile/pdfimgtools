# PDFImgTools

Herramientas PDF para uso personal: unir, dividir, ordenar, rotar, convertir, numerar, firmar, proteger y comprimir.

Laravel 12 + Inertia + Vue 3 + Tailwind.

## Dónde se procesa cada cosa

- **En el navegador** (el archivo no sale de la compu): unir, dividir, extraer, eliminar, ordenar y rotar páginas; imágenes ↔ PDF; convertir imágenes (JPG, PNG, WebP); numerar; marca de agua; firmar. Usa `pdf-lib` y `pdfjs-dist`.
- **En el servidor** (se borra al terminar): comprimir (Ghostscript), proteger y desbloquear (qpdf), Office ↔ PDF (LibreOffice).

El catálogo completo está en [config/tools.php](config/tools.php): de ahí salen la home, las rutas y la validación.

## Instalación

```bash
composer install
npm install
cp .env.example .env && php artisan key:generate
npm run build      # o npm run dev mientras se desarrolla
```

Con Laragon queda en http://pdfimgtools.test (recargá Laragon para que cree el vhost).

### Programas para las herramientas de servidor (Windows)

```bash
winget install ArtifexSoftware.GhostScript       # Comprimir PDF
winget install QPDF.QPDF                         # Proteger / desbloquear
winget install TheDocumentFoundation.LibreOffice # Office a PDF, PDF a Word
```

Se detectan solos (PATH y `C:\Program Files`). Si están en otro lado, indicá la ruta en `.env` (`GS_PATH`, `QPDF_PATH`, `SOFFICE_PATH`). Mientras falten, la herramienta aparece marcada como «Requiere instalar» y explica cómo hacerlo.

Otras variables: `MAX_UPLOAD_MB` (100) y `TOOLS_TIMEOUT` (300 segundos por proceso).

Los temporales viven en `storage/app/tmp` y se borran al responder. `php artisan tmp:purge` borra los que hayan quedado colgados (corre cada hora si está el scheduler).

## Tests

```bash
npm test           # lógica de PDF (Vitest)
php artisan test   # endpoint de servidor (Pest)
```
