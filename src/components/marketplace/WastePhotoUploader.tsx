import React, { useState, useRef } from 'react';
import {
  Camera,
  Upload,
  X,
  AlertCircle,
  Loader2,
  CheckCircle2,
  RefreshCw,
  Plus,
  ImageIcon,
} from 'lucide-react';
import {
  uploadListingPhoto,
  validateWasteImageFile,
  cleanupListingPhotos,
  MAX_LISTING_IMAGES,
} from '../../services/listingImageStorage';

interface WastePhotoUploaderProps {
  images: string[];
  onChange: (images: string[]) => void;
  userId: string;
  listingId?: string;
  isEdit?: boolean;
  hasAttemptedSubmit?: boolean;
  onNewStoragePathAdded?: (path: string) => void;
}

export const WastePhotoUploader: React.FC<WastePhotoUploaderProps> = ({
  images,
  onChange,
  userId,
  listingId,
  isEdit = false,
  hasAttemptedSubmit = false,
  onNewStoragePathAdded,
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [replaceIndex, setReplaceIndex] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const replaceInputRef = useRef<HTMLInputElement>(null);

  const isInvalid = hasAttemptedSubmit && images.length === 0;

  const handleFiles = async (files: FileList | null, isReplacement = false, targetIndex: number | null = null) => {
    if (!files || files.length === 0) return;
    setUploadError(null);

    const file = files[0];
    const validation = validateWasteImageFile(file);
    if (!validation.valid) {
      setUploadError(validation.error || 'Invalid file format.');
      return;
    }

    if (!isReplacement && images.length >= MAX_LISTING_IMAGES) {
      setUploadError(`Maximum ${MAX_LISTING_IMAGES} photographs allowed per listing.`);
      return;
    }

    setIsUploading(true);

    try {
      const res = await uploadListingPhoto(file, userId, listingId);

      if (!res.success || !res.url) {
        setUploadError(res.error || 'Failed to upload photo. Please try again.');
        return;
      }

      if (res.storagePath && onNewStoragePathAdded) {
        onNewStoragePathAdded(res.storagePath);
      }

      if (isReplacement && targetIndex !== null && targetIndex >= 0 && targetIndex < images.length) {
        const next = [...images];
        next[targetIndex] = res.url;
        onChange(next);
        setReplaceIndex(null);
      } else {
        onChange([...images, res.url]);
      }
    } catch (err: any) {
      setUploadError(err?.message || 'Error uploading photograph.');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
      if (replaceInputRef.current) replaceInputRef.current.value = '';
    }
  };

  const handleRemovePhoto = (indexToRemove: number) => {
    // Edit & Create requirement: Prevent removing the last remaining photograph unless a replacement is uploaded
    if (images.length === 1) {
      setUploadError('At least one photo of the waste material is required. Please upload a replacement before removing this image.');
      return;
    }

    const removedUrl = images[indexToRemove];
    const next = images.filter((_, idx) => idx !== indexToRemove);
    onChange(next);
    setUploadError(null);

    // If it was a storage URL, trigger cleanup in background
    if (removedUrl.includes('/listing-images/')) {
      const parts = removedUrl.split('/listing-images/');
      if (parts[1]) {
        cleanupListingPhotos([parts[1].split('?')[0]]);
      }
    }
  };

  const triggerReplace = (index: number) => {
    setReplaceIndex(index);
    if (replaceInputRef.current) {
      replaceInputRef.current.click();
    }
  };

  return (
    <div className="space-y-3" id="waste-photo-uploader-field">
      {/* Hidden file input for adding new photos */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/jpg"
        className="hidden"
        onChange={(e) => handleFiles(e.target.files, false)}
        disabled={isUploading || images.length >= MAX_LISTING_IMAGES}
      />

      {/* Hidden file input for replacing an existing photo */}
      <input
        ref={replaceInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/jpg"
        className="hidden"
        onChange={(e) => handleFiles(e.target.files, true, replaceIndex)}
        disabled={isUploading}
      />

      {/* Header with Title and Required Badge */}
      <div className="flex items-center justify-between">
        <label className="font-sans font-medium text-sm text-[#18251F] flex items-center gap-1.5">
          <Camera className="w-4 h-4 text-[#103D2A]" />
          <span>Waste Material Photograph</span>
          <span className="text-rose-600 font-bold">*</span>
        </label>

        <div className="flex items-center gap-2">
          <span className="text-[11px] font-semibold tracking-wider uppercase px-2 py-0.5 rounded bg-rose-100 text-rose-800 border border-rose-200">
            Required
          </span>
          <span className="text-xs text-[#68736B]">
            ({images.length}/{MAX_LISTING_IMAGES})
          </span>
        </div>
      </div>

      {/* Error / Alert Message Banner */}
      {(uploadError || isInvalid) && (
        <div
          role="alert"
          className="p-3 bg-rose-50 border border-rose-300 text-rose-900 rounded-xl text-xs font-medium flex items-start gap-2.5 shadow-2xs animate-in fade-in duration-150"
        >
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <p className="font-semibold text-rose-900">
              {uploadError || 'Upload at least one photo of the waste material to continue.'}
            </p>
            {isInvalid && !uploadError && (
              <p className="text-[11px] text-rose-700 font-normal">
                Authentic photographs are mandatory so recycling partners can verify condition, cleanliness, and sorting.
              </p>
            )}
          </div>
        </div>
      )}

      {/* If No Photos: Primary Dropzone / Click to Upload */}
      {images.length === 0 ? (
        <div
          onClick={() => {
            if (!isUploading && fileInputRef.current) {
              fileInputRef.current.click();
            }
          }}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            handleFiles(e.dataTransfer.files, false);
          }}
          className={`relative border-2 border-dashed rounded-2xl p-6 sm:p-8 text-center cursor-pointer transition-all duration-150 ${
            isInvalid
              ? 'border-rose-400 bg-rose-50/50 hover:bg-rose-50 ring-2 ring-rose-200'
              : 'border-[#D0C9BD] hover:border-[#103D2A] bg-[#FAF8F2] hover:bg-[#F3EFE6]'
          }`}
        >
          {isUploading ? (
            <div className="flex flex-col items-center justify-center py-4 space-y-2.5 text-xs text-[#103D2A]">
              <Loader2 className="w-8 h-8 animate-spin text-[#103D2A]" />
              <p className="font-semibold text-sm">Compressing &amp; uploading photograph...</p>
              <p className="text-[11px] text-[#68736B]">Saving to secure Supabase storage...</p>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center space-y-2.5">
              <div className="w-12 h-12 rounded-full bg-white border border-[#E6E0D5] flex items-center justify-center shadow-2xs">
                <Upload className="w-5 h-5 text-[#103D2A]" />
              </div>

              <div>
                <p className="text-sm font-semibold text-[#18251F]">
                  Upload at least one photo of the waste material to continue.
                </p>
                <p className="text-xs text-[#68736B] mt-0.5">
                  Click to select a photo from your device or drag and drop here.
                </p>
              </div>

              <div className="pt-1 flex items-center gap-2 text-[11px] text-[#7A857D]">
                <span>Accepts JPG, JPEG, PNG, WEBP</span>
                <span>•</span>
                <span>Max 10 MB per photo</span>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* If Photos Exist: Preview Grid with Controls */
        <div className="space-y-3">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {images.map((imgUrl, index) => (
              <div
                key={`${imgUrl}-${index}`}
                className="group relative aspect-square bg-[#F4F1EA] rounded-xl overflow-hidden border border-[#E6E0D5] shadow-2xs"
              >
                <img
                  src={imgUrl}
                  alt={`Waste material photo ${index + 1}`}
                  className="w-full h-full object-cover"
                />

                {/* Primary Photo Badge */}
                {index === 0 && (
                  <div className="absolute top-2 left-2 bg-[#103D2A]/90 backdrop-blur-xs text-white text-[10px] font-semibold px-2 py-0.5 rounded-md shadow-2xs flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>Primary</span>
                  </div>
                )}

                {/* Overlay actions on hover/focus */}
                <div className="absolute inset-0 bg-[#103D2A]/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2 p-2 text-white">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      triggerReplace(index);
                    }}
                    className="px-2.5 py-1 bg-white/90 hover:bg-white text-[#18251F] rounded-lg text-xs font-semibold inline-flex items-center gap-1 shadow-xs transition-colors"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>Replace</span>
                  </button>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemovePhoto(index);
                    }}
                    className="px-2.5 py-1 bg-rose-600/90 hover:bg-rose-600 text-white rounded-lg text-xs font-semibold inline-flex items-center gap-1 shadow-xs transition-colors"
                  >
                    <X className="w-3 h-3" />
                    <span>Remove</span>
                  </button>
                </div>
              </div>
            ))}

            {/* Additional Photo Slot (if under max images) */}
            {images.length < MAX_LISTING_IMAGES && (
              <button
                type="button"
                onClick={() => {
                  if (!isUploading && fileInputRef.current) {
                    fileInputRef.current.click();
                  }
                }}
                disabled={isUploading}
                className="aspect-square rounded-xl border-2 border-dashed border-[#D0C9BD] hover:border-[#103D2A] bg-[#FAF8F2] hover:bg-[#F3EFE6] flex flex-col items-center justify-center p-3 text-center transition-all disabled:opacity-50"
              >
                {isUploading ? (
                  <Loader2 className="w-5 h-5 animate-spin text-[#103D2A]" />
                ) : (
                  <>
                    <Plus className="w-5 h-5 text-[#103D2A] mb-1" />
                    <span className="text-xs font-semibold text-[#18251F]">Add Photo</span>
                    <span className="text-[10px] text-[#68736B]">({images.length}/{MAX_LISTING_IMAGES})</span>
                  </>
                )}
              </button>
            )}
          </div>

          <div className="flex items-center justify-between text-xs text-[#68736B] pt-1">
            <span className="flex items-center gap-1.5 text-emerald-800 font-medium">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />
              <span>{images.length} verified photo{images.length > 1 ? 's' : ''} attached.</span>
            </span>
            <span>Hover a photo to replace or remove.</span>
          </div>
        </div>
      )}
    </div>
  );
};
