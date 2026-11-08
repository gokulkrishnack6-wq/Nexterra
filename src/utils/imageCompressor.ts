/**
 * GreenLoop Image Compression Utility
 * Resizes and compresses images client-side before sending to Gemini AI Edge Function
 * or transferring in listing prefill payloads.
 *
 * Prevents mobile memory crashes, sessionStorage QuotaExceededError,
 * and Supabase PostgREST 413 Payload Too Large errors.
 */

export interface CompressedImageResult {
  dataUrl: string;
  mimeType: string;
  width: number;
  height: number;
  sizeBytes: number;
}

export async function compressImage(
  input: File | Blob | string,
  maxWidth: number = 1200,
  maxHeight: number = 1200,
  quality: number = 0.82
): Promise<CompressedImageResult> {
  // If in SSR or non-DOM test environment, return fallback
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    const raw = typeof input === 'string' ? input : '';
    return {
      dataUrl: raw,
      mimeType: 'image/jpeg',
      width: 0,
      height: 0,
      sizeBytes: raw.length,
    };
  }

  return new Promise((resolve, reject) => {
    let sourceUrl: string;
    let isCreatedUrl = false;

    if (typeof input === 'string') {
      sourceUrl = input;
    } else {
      try {
        sourceUrl = URL.createObjectURL(input);
        isCreatedUrl = true;
      } catch (err) {
        // Fallback to FileReader if createObjectURL fails
        const reader = new FileReader();
        reader.onload = (e) => {
          processImageUrl(e.target?.result as string, false);
        };
        reader.onerror = reject;
        reader.readAsDataURL(input);
        return;
      }
    }

    processImageUrl(sourceUrl, isCreatedUrl);

    function processImageUrl(url: string, created: boolean) {
      const img = new Image();
      img.crossOrigin = 'anonymous';

      img.onload = () => {
        if (created) {
          try {
            URL.revokeObjectURL(url);
          } catch (_) {}
        }

        try {
          let { width, height } = img;

          // Downsample if dimensions exceed maximum
          if (width > maxWidth || height > maxHeight) {
            const ratio = Math.min(maxWidth / width, maxHeight / height);
            width = Math.max(1, Math.round(width * ratio));
            height = Math.max(1, Math.round(height * ratio));
          }

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');

          if (!ctx) {
            // If canvas context fails, fallback safely
            resolve({
              dataUrl: typeof input === 'string' ? input : url,
              mimeType: 'image/jpeg',
              width: img.width,
              height: img.height,
              sizeBytes: url.length,
            });
            return;
          }

          ctx.drawImage(img, 0, 0, width, height);
          const dataUrl = canvas.toDataURL('image/jpeg', quality);

          resolve({
            dataUrl,
            mimeType: 'image/jpeg',
            width,
            height,
            sizeBytes: Math.round((dataUrl.length * 3) / 4),
          });
        } catch (e) {
          // If canvas tainted or export fails, return original url safely
          resolve({
            dataUrl: typeof input === 'string' ? input : url,
            mimeType: 'image/jpeg',
            width: img.width,
            height: img.height,
            sizeBytes: url.length,
          });
        }
      };

      img.onerror = () => {
        if (created) {
          try {
            URL.revokeObjectURL(url);
          } catch (_) {}
        }
        // Fallback if image cannot be rendered by Image element
        if (typeof input === 'string') {
          resolve({
            dataUrl: input,
            mimeType: 'image/jpeg',
            width: 0,
            height: 0,
            sizeBytes: input.length,
          });
        } else {
          reject(new Error('Failed to load image for compression'));
        }
      };

      img.src = url;
    }
  });
}

