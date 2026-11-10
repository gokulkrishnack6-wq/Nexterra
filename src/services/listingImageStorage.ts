import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { compressImage } from '../utils/imageCompressor';

export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
export const MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB
export const MAX_LISTING_IMAGES = 5;

export interface ImageValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Validates a user-selected file for format (JPG, JPEG, PNG, WEBP) and maximum size.
 */
export function validateWasteImageFile(file: File): ImageValidationResult {
  if (!file) {
    return { valid: false, error: 'No file selected.' };
  }

  const fileType = (file.type || '').toLowerCase();
  const fileExt = (file.name.split('.').pop() || '').toLowerCase();
  const isTypeAllowed =
    ALLOWED_IMAGE_TYPES.includes(fileType) ||
    ['jpg', 'jpeg', 'png', 'webp'].includes(fileExt);

  if (!isTypeAllowed) {
    return {
      valid: false,
      error: 'Unsupported image format. Please upload a JPG, JPEG, PNG, or WEBP photograph.',
    };
  }

  if (file.size > MAX_IMAGE_SIZE_BYTES) {
    return {
      valid: false,
      error: 'File size exceeds the 10 MB limit. Please select a smaller photo.',
    };
  }

  return { valid: true };
}

export interface UploadPhotoResult {
  success: boolean;
  url?: string;
  storagePath?: string;
  error?: string;
}

/**
 * Transforms raw Supabase Storage API error responses into descriptive, actionable error messages.
 */
export function parseStorageUploadError(error: any): string {
  if (!error) return 'Failed to upload photo. Please try again.';

  const msg = (typeof error === 'string' ? error : error.message || error.error || '').toLowerCase();
  const code = (error.code || error.statusCode || error.status || '').toString().toLowerCase();

  // 1. Bucket not found
  if (
    msg.includes('bucket not found') ||
    msg.includes('nosuchbucket') ||
    code.includes('nosuchbucket') ||
    code === '404' ||
    (msg.includes('bucket') && msg.includes('not found'))
  ) {
    return "Storage configuration error: The 'listing-images' storage bucket does not exist in Supabase. Please ensure the bucket has been created in your Supabase Dashboard Storage section with public read access enabled.";
  }

  // 2. Permission denied / Row-Level Security failure
  if (
    msg.includes('row-level security') ||
    msg.includes('accessdenied') ||
    msg.includes('permission denied') ||
    msg.includes('unauthorized') ||
    msg.includes('violates row-level') ||
    code === '403' ||
    code === '401'
  ) {
    return 'Upload permission denied: You must be signed in with an active account to upload waste photographs, and files may only be uploaded into your own account directory.';
  }

  // 3. File too large
  if (
    msg.includes('payload too large') ||
    msg.includes('exceeds limit') ||
    msg.includes('entitytoolarge') ||
    msg.includes('too large') ||
    code === '413'
  ) {
    return 'File size exceeds the 10 MB limit. Please select a smaller photo or compress it before uploading.';
  }

  // 4. Unsupported image format
  if (
    msg.includes('mime') ||
    msg.includes('unsupported') ||
    msg.includes('invalid media') ||
    msg.includes('format')
  ) {
    return 'Unsupported image format. Please upload a JPG, JPEG, PNG, or WEBP photograph.';
  }

  // 5. Network failure / Offline
  if (
    msg.includes('fetch failed') ||
    msg.includes('network') ||
    msg.includes('offline') ||
    msg.includes('failed to fetch') ||
    msg.includes('connection')
  ) {
    return 'Network connection error: Unable to reach Supabase Storage. Please check your internet connection and try again.';
  }

  // 6. Upload timeout
  if (msg.includes('timeout') || msg.includes('timed out') || msg.includes('aborterror')) {
    return 'Upload timed out: The photograph could not be uploaded in time. Please try again with a better connection.';
  }

  // 7. Invalid configuration
  if (msg.includes('placeholder') || msg.includes('not configured')) {
    return 'Supabase Storage is not configured. Please verify your Supabase environment settings.';
  }

  return `Storage upload error: ${error.message || 'Unknown error'}. Please verify storage settings and try again.`;
}

/**
 * Uploads a verified waste material photograph to Supabase Storage ('listing-images' bucket).
 * Follows a predictable path: `listings/{user_id}/{listing_id}-{timestamp}-{random}.jpg`
 * Client-side compression is applied first to protect mobile bandwidth and ensure rapid uploads.
 */
export async function uploadListingPhoto(
  file: File,
  userId: string,
  listingId?: string
): Promise<UploadPhotoResult> {
  const validation = validateWasteImageFile(file);
  if (!validation.valid) {
    return { success: false, error: validation.error };
  }

  try {
    // 1. Client-side compression for high responsiveness and quota protection
    const compressed = await compressImage(file, 1600, 1600, 0.85);

    // 2. Upload to Supabase Storage if configured and running in browser
    if (isSupabaseConfigured && typeof window !== 'undefined') {
      const cleanUserId = userId ? userId.replace(/[^a-zA-Z0-9_-]/g, '') : 'user';
      const cleanListingId = listingId ? listingId.replace(/[^a-zA-Z0-9_-]/g, '') : 'temp';
      const randomPart = Math.random().toString(36).substring(2, 9);
      // Predictable storage path: listings/{user_id}/{unique_filename}
      const filePath = `listings/${cleanUserId}/${cleanListingId}-${Date.now()}-${randomPart}.jpg`;

      // Convert data URL to Blob for Supabase Storage upload
      const response = await fetch(compressed.dataUrl);
      const blob = await response.blob();

      const { error: uploadError } = await supabase.storage
        .from('listing-images')
        .upload(filePath, blob, {
          contentType: 'image/jpeg',
          upsert: true,
          cacheControl: '31536000',
        });

      if (uploadError) {
        console.error('Supabase Storage upload error:', uploadError);
        return {
          success: false,
          error: parseStorageUploadError(uploadError),
        };
      }

      const { data: publicData } = supabase.storage
        .from('listing-images')
        .getPublicUrl(filePath);

      if (!publicData?.publicUrl) {
        return {
          success: false,
          error: 'Failed to retrieve uploaded image public URL from storage.',
        };
      }

      return {
        success: true,
        url: publicData.publicUrl,
        storagePath: filePath,
      };
    }

    // Offline / Mock / Unit Testing fallback: return compressed Data URL directly
    return {
      success: true,
      url: compressed.dataUrl,
      storagePath: `mock-storage/${Date.now()}.jpg`,
    };
  } catch (err: any) {
    console.error('Photo processing/upload error:', err);
    return {
      success: false,
      error: parseStorageUploadError(err),
    };
  }
}

/**
 * Cleans up uploaded photos from Supabase Storage when listing creation fails or user removes an image.
 */
export async function cleanupListingPhotos(storagePaths: string[]): Promise<void> {
  if (!isSupabaseConfigured || !storagePaths || storagePaths.length === 0) return;

  const validPaths = storagePaths.filter((p) => p && !p.startsWith('mock-storage/'));
  if (validPaths.length === 0) return;

  try {
    const { error } = await supabase.storage.from('listing-images').remove(validPaths);
    if (error) {
      console.warn('Could not clean up orphaned storage photos:', error.message);
    }
  } catch (err) {
    console.warn('Storage cleanup exception:', err);
  }
}

