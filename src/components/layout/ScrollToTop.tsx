import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Global Scroll Restoration Component:
 * Automatically resets window and document scroll position to the top (0, 0)
 * whenever the user navigates to a new route or page.
 * 
 * Prevents the critical usability bug where users landing on a form or detail page
 * were left scrolled down into the middle or bottom of the interface.
 */
export const ScrollToTop: React.FC = () => {
  const { pathname, search } = useLocation();

  useEffect(() => {
    // 1. Immediately reset standard window scroll position
    window.scrollTo(0, 0);

    // 2. Fallback for documentElement and body (handles mobile browsers and diverse root setups)
    if (document.documentElement) {
      document.documentElement.scrollTop = 0;
    }
    if (document.body) {
      document.body.scrollTop = 0;
    }

    // 3. Clean up any stale background scroll locks on route transitions
    document.body.style.overflow = '';
  }, [pathname, search]);

  return null;
};

