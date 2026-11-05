/**
 * Quitar fondo con IA, en el navegador: transformers.js + RMBG-1.4 (versión
 * cuantizada, ~44 MB). La primera vez el modelo se descarga de Hugging Face y
 * queda en la caché del navegador; la librería se carga recién al usarla.
 *
 * RMBG-1.4 tiene licencia solo para uso no comercial: va bien para esta app
 * personal, no para venderla.
 */

const MODEL = 'briaai/RMBG-1.4';

type Transformers = typeof import('@huggingface/transformers');

interface Segmenter {
    lib: Transformers;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    model: any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    processor: any;
}

let loading: Promise<Segmenter> | null = null;

/** `onProgress` recibe los bytes bajados y el total mientras se descarga el modelo. */
function loadSegmenter(onProgress?: (loaded: number, total: number) => void): Promise<Segmenter> {
    loading ??= (async () => {
        const lib = await import('@huggingface/transformers');

        // El pipeline «background-removal» no reconoce a RMBG (se declara Segformer):
        // se carga como modelo propio, igual que en el ejemplo oficial de transformers.js.
        const load = (device: 'webgpu' | 'wasm') =>
            lib.AutoModel.from_pretrained(MODEL, {
                config: { model_type: 'custom' } as never,
                device,
                dtype: 'q8',
                progress_callback: (info) => {
                    if (info.status === 'progress' && info.file.endsWith('.onnx')) onProgress?.(info.loaded, info.total);
                },
            });

        // Hay navegadores que dicen tener WebGPU y después no consiguen adaptador.
        const model = 'gpu' in navigator ? await load('webgpu').catch(() => load('wasm')) : await load('wasm');

        const processor = await lib.AutoProcessor.from_pretrained(MODEL, {
            config: {
                do_normalize: true,
                do_pad: false,
                do_rescale: true,
                do_resize: true,
                image_mean: [0.5, 0.5, 0.5],
                feature_extractor_type: 'ImageFeatureExtractor',
                image_std: [1, 1, 1],
                resample: 2,
                rescale_factor: 1 / 255,
                size: { width: 1024, height: 1024 },
            },
        } as never);

        return { lib, model, processor };
    })().catch((e) => {
        loading = null; // que se pueda reintentar
        throw e;
    });

    return loading;
}

/** Recibe la imagen ya dibujada (derecha según EXIF) y le pone el fondo transparente, en el mismo canvas. */
export async function removeBackgroundAi(canvas: HTMLCanvasElement, onProgress?: (loaded: number, total: number) => void): Promise<HTMLCanvasElement> {
    const { lib, model, processor } = await loadSegmenter(onProgress);

    const image = await lib.RawImage.read(canvas);
    const { pixel_values } = await processor(image);
    const { output } = await model({ input: pixel_values });

    // La máscara sale a 1024×1024: se lleva al tamaño original y se usa como alfa.
    const mask = await lib.RawImage.fromTensor(output[0].mul(255).to('uint8')).resize(canvas.width, canvas.height);

    const ctx = canvas.getContext('2d')!;
    const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height);
    for (let i = 0; i < mask.data.length; i++) {
        pixels.data[i * 4 + 3] = mask.data[i];
    }
    ctx.putImageData(pixels, 0, 0);

    return canvas;
}
