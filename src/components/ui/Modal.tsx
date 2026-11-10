import React, { useEffect, useRef, useCallback } from 'react';
import { X } from 'lucide-react';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  subtitle?: React.ReactNode;
  icon?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | 'full';
  showCloseButton?: boolean;
  ariaLabel?: string;
  closeOnBackdropClick?: boolean;
  closeOnEscape?: boolean;
  className?: string;
}

const maxWidthClasses = {
  sm: 'max-w-sm',
  md: 'max-w-md',
  lg: 'max-w-lg',
  xl: 'max-w-xl',
  '2xl': 'max-w-2xl',
  full: 'max-w-full',
};

/**
 * Global Accessible Modal Component
 * 
 * Guarantees that:
 * 1. The modal header, title, and initial controls are ALWAYS visible immediately.
 * 2. Modals start comfortably near the top of the viewport (items-start), never pushed
 *    off-screen by flexbox vertical centering.
 * 3. Mobile viewport height (100dvh) is fully respected with safe-area spacing.
 * 4. Background page scrolling is locked while open and restored accurately upon close.
 * 5. Body scrolls independently inside the modal without losing the header or action buttons.
 */
export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  icon,
  children,
  footer,
  maxWidth = 'lg',
  showCloseButton = true,
  ariaLabel,
  closeOnBackdropClick = true,
  closeOnEscape = true,
  className = '',
}) => {
  const overlayRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const scrollPositionRef = useRef<number>(0);
  const previousActiveElementRef = useRef<HTMLElement | null>(null);

  // Safe callback to close
  const handleClose = useCallback(() => {
    onClose();
  }, [onClose]);

  // Escape key handler
  useEffect(() => {
    if (!isOpen || !closeOnEscape) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        handleClose();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, closeOnEscape, handleClose]);

  // Body scroll lock & restoration + focus management
  useEffect(() => {
    if (!isOpen) return;

    // Remember currently focused element to restore on close
    previousActiveElementRef.current = document.activeElement as HTMLElement;

    // Save window scroll position before locking
    scrollPositionRef.current = window.scrollY || window.pageYOffset || document.documentElement.scrollTop;

    // Lock body scrolling
    const originalOverflow = document.body.style.overflow;
    const originalPaddingRight = document.body.style.paddingRight;
    
    // Prevent layout shift from scrollbar disappearing
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    }
    document.body.style.overflow = 'hidden';

    // Focus modal dialog container (or first focusable control) at the top
    if (dialogRef.current) {
      dialogRef.current.focus({ preventScroll: true });
    }

    // Reset overlay scroll position to top
    if (overlayRef.current) {
      overlayRef.current.scrollTop = 0;
    }

    return () => {
      document.body.style.overflow = originalOverflow;
      document.body.style.paddingRight = originalPaddingRight;

      // Restore focus to previous triggering element
      if (previousActiveElementRef.current && typeof previousActiveElementRef.current.focus === 'function') {
        previousActiveElementRef.current.focus();
      }
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (closeOnBackdropClick && e.target === e.currentTarget) {
      handleClose();
    }
  };

  return (
    <div
      ref={overlayRef}
      onClick={handleBackdropClick}
      className="fixed inset-0 z-50 flex justify-center items-start overflow-y-auto overscroll-contain bg-black/50 backdrop-blur-xs p-3 xs:p-4 sm:p-6 md:p-8 pt-[max(0.75rem,env(safe-area-inset-top))] pb-[max(0.75rem,env(safe-area-inset-bottom))] transition-opacity duration-150 animate-fadeIn cursor-pointer"
      role="dialog"
      aria-modal="true"
      aria-label={typeof title === 'string' ? title : ariaLabel || 'Dialog Window'}
    >
      <div
        ref={dialogRef}
        tabIndex={-1}
        onClick={(e) => e.stopPropagation()}
        className={`w-full ${maxWidthClasses[maxWidth]} bg-[#FFFEFA] border border-[#E9E2D5] rounded-2xl shadow-2xl flex flex-col mt-2 sm:mt-6 md:mt-10 mb-auto max-h-[calc(100dvh-1.5rem)] sm:max-h-[calc(100dvh-3rem)] overflow-hidden focus:outline-none cursor-default select-text animate-modalScale ${className}`}
      >
        {/* Modal Header: Always visible, never clipped off the top */}
        {(title || showCloseButton) && (
          <div className="shrink-0 px-5 py-4 border-b border-[#E6E0D5] bg-[#FAF8F2] flex items-center justify-between gap-3 select-none">
            <div className="flex items-center gap-3 min-w-0">
              {icon && (
                <div className="w-9 h-9 rounded-xl bg-[#E8EEDC] text-[#174B32] border border-[#D5DEC4] flex items-center justify-center shrink-0">
                  {icon}
                </div>
              )}
              <div className="min-w-0">
                {title && (
                  <h2 className="font-editorial text-lg sm:text-xl font-bold text-[#18251F] leading-tight truncate">
                    {title}
                  </h2>
                )}
                {subtitle && (
                  <p className="font-sans text-xs text-[#68736B] mt-0.5 leading-snug line-clamp-2">
                    {subtitle}
                  </p>
                )}
              </div>
            </div>

            {showCloseButton && (
              <button
                type="button"
                onClick={handleClose}
                className="p-1.5 rounded-lg text-[#68736B] hover:text-[#18251F] hover:bg-[#E9E2D5]/50 transition-colors shrink-0"
                aria-label="Close dialog"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        )}

        {/* Modal Body: Independently scrollable, resets to top */}
        <div className="flex-1 overflow-y-auto overscroll-contain p-5 text-left text-sm text-[#18251F]">
          {children}
        </div>

        {/* Modal Footer: Sticky bottom actions */}
        {footer && (
          <div className="shrink-0 px-5 py-3.5 border-t border-[#E6E0D5] bg-[#FAF8F2] flex items-center justify-end gap-2.5">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};

