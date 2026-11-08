import { useEffect, useRef } from 'react';

export interface UseOutsideClickOptions {
  enabled?: boolean;
  onEscape?: (event: KeyboardEvent) => void;
  ignoreRefs?: React.RefObject<HTMLElement | null>[];
}

/**
 * Custom hook to detect clicks outside a referenced element and dismiss on Escape.
 *
 * Designed for seamless interactions:
 * - Uses `pointerdown` with `{ passive: true }` so touches and clicks close the overlay immediately.
 * - DOES NOT call `preventDefault()` or `stopPropagation()`, so the underlying clicked target
 *   (navigation links, action buttons, form inputs) receives its native click event on the first click.
 * - Avoids double-clicks or trapped focus.
 * - Handles Escape key cleanly.
 * - Prevents memory leaks by unregistering listeners on unmount or when disabled.
 */
export function useOutsideClick<T extends HTMLElement = HTMLElement>(
  onOutsideClick: (event: PointerEvent) => void,
  options: UseOutsideClickOptions = {}
) {
  const ref = useRef<T | null>(null);
  const { enabled = true, onEscape, ignoreRefs = [] } = options;

  const callbackRef = useRef(onOutsideClick);
  callbackRef.current = onOutsideClick;

  const escapeRef = useRef(onEscape);
  escapeRef.current = onEscape;

  const ignoreRefsRef = useRef(ignoreRefs);
  ignoreRefsRef.current = ignoreRefs;

  useEffect(() => {
    if (!enabled) return;

    const handlePointerDown = (event: PointerEvent) => {
      const el = ref.current;
      const target = event.target as Node | null;
      if (!el || !target) return;

      // Clicked inside the referenced element
      if (el.contains(target)) return;

      // Clicked inside any ignored ref element
      if (ignoreRefsRef.current.some((r) => r.current?.contains(target))) {
        return;
      }

      callbackRef.current(event);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (escapeRef.current) {
          escapeRef.current(event);
        } else {
          callbackRef.current(event as any);
        }
      }
    };

    // pointerdown handles mouse, touch, and stylus events uniformly; falls back to mousedown
    const eventType = typeof window !== 'undefined' && 'PointerEvent' in window ? 'pointerdown' : 'mousedown';
    document.addEventListener(eventType, handlePointerDown as EventListener, { passive: true });
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener(eventType, handlePointerDown as EventListener);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [enabled]);

  return ref;
}
