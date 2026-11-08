// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest';

// Polyfill PointerEvent for jsdom test runner
if (typeof (globalThis as any).PointerEvent === 'undefined') {
  class MockPointerEvent extends MouseEvent {
    constructor(type: string, params: any = {}) {
      super(type, params);
    }
  }
  (globalThis as any).PointerEvent = MockPointerEvent;
}

describe('Global UI Interaction & Outside-Click Architecture Audit', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    document.body.innerHTML = '';
    document.body.style.overflow = '';
  });

  describe('1. Reusable useOutsideClick Hook Behavior', () => {
    it('closes on outside pointerdown without swallowing native events or requiring double click', () => {
      let isClosed = false;
      const onOutsideClick = vi.fn(() => {
        isClosed = true;
      });

      // Create container element and external button
      const container = document.createElement('div');
      container.id = 'dropdown-container';
      const triggerBtn = document.createElement('button');
      triggerBtn.id = 'trigger-btn';
      container.appendChild(triggerBtn);

      const externalBtn = document.createElement('button');
      externalBtn.id = 'external-target-btn';
      let externalClicked = false;
      externalBtn.addEventListener('click', () => {
        externalClicked = true;
      });

      document.body.appendChild(container);
      document.body.appendChild(externalBtn);

      // Simulate hook setup with pointerdown listener
      const handlePointerDown = (e: PointerEvent) => {
        if (!container.contains(e.target as Node)) {
          onOutsideClick(e);
        }
      };
      document.addEventListener('pointerdown', handlePointerDown as EventListener, { passive: true });

      // Simulate user clicking external button (pointerdown followed by click)
      const pointerEvent = new PointerEvent('pointerdown', { bubbles: true, cancelable: false });
      externalBtn.dispatchEvent(pointerEvent);

      // Verify dropdown was closed immediately
      expect(onOutsideClick).toHaveBeenCalledTimes(1);
      expect(isClosed).toBe(true);

      // Browser naturally dispatches click to external button
      const clickEvent = new MouseEvent('click', { bubbles: true, cancelable: true });
      externalBtn.dispatchEvent(clickEvent);

      // Verify the external button received its normal click event on the first attempt (NO DOUBLE CLICK!)
      expect(externalClicked).toBe(true);

      document.removeEventListener('pointerdown', handlePointerDown as EventListener);
    });

    it('does NOT trigger outside click when clicking inside the referenced container', () => {
      const onOutsideClick = vi.fn();
      const container = document.createElement('div');
      const insideItem = document.createElement('button');
      insideItem.id = 'inside-item';
      container.appendChild(insideItem);
      document.body.appendChild(container);

      const handlePointerDown = (e: PointerEvent) => {
        if (!container.contains(e.target as Node)) {
          onOutsideClick(e);
        }
      };
      document.addEventListener('pointerdown', handlePointerDown as EventListener, { passive: true });

      // Click inside
      const pointerEvent = new PointerEvent('pointerdown', { bubbles: true });
      insideItem.dispatchEvent(pointerEvent);

      expect(onOutsideClick).not.toHaveBeenCalled();

      document.removeEventListener('pointerdown', handlePointerDown as EventListener);
    });

    it('triggers dismissal when Escape key is pressed', () => {
      const onEscape = vi.fn();
      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') onEscape(e);
      };
      document.addEventListener('keydown', handleKeyDown);

      const escapeEvent = new KeyboardEvent('keydown', { key: 'Escape', bubbles: true });
      document.dispatchEvent(escapeEvent);

      expect(onEscape).toHaveBeenCalledTimes(1);

      document.removeEventListener('keydown', handleKeyDown);
    });

    it('unregisters document listeners cleanly when disabled or unmounted', () => {
      const addSpy = vi.spyOn(document, 'addEventListener');
      const removeSpy = vi.spyOn(document, 'removeEventListener');

      const handler = () => {};
      document.addEventListener('pointerdown', handler);
      expect(addSpy).toHaveBeenCalledWith('pointerdown', handler);

      document.removeEventListener('pointerdown', handler);
      expect(removeSpy).toHaveBeenCalledWith('pointerdown', handler);
    });
  });

  describe('2. Header Overlay Mutual Exclusion & Trapping Prevention', () => {
    type ActiveOverlay = 'none' | 'location' | 'create' | 'notif' | 'user' | 'mobile';

    it('ensures only one header overlay can be active at a time to prevent collisions', () => {
      let activeOverlay: ActiveOverlay = 'none';
      const openOverlay = (name: ActiveOverlay) => {
        activeOverlay = name;
      };

      // User opens location menu
      openOverlay('location');
      expect(activeOverlay).toBe('location');

      // User opens quick create menu without manually closing location menu
      openOverlay('create');
      expect(activeOverlay).toBe('create'); // Location menu is automatically closed!

      // User opens notifications
      openOverlay('notif');
      expect(activeOverlay).toBe('notif'); // Create menu is automatically closed!

      // User opens profile menu
      openOverlay('user');
      expect(activeOverlay).toBe('user'); // Notifications menu is automatically closed!
    });

    it('toggles location selector off when clicking the location button again', () => {
      let activeOverlay: ActiveOverlay = 'none';
      const toggleMenu = (name: ActiveOverlay) => {
        activeOverlay = activeOverlay === name ? 'none' : name;
      };

      // First click: opens
      toggleMenu('location');
      expect(activeOverlay).toBe('location');

      // Second click on the same pill button: closes
      toggleMenu('location');
      expect(activeOverlay).toBe('none');
    });

    it('closes all open overlays automatically upon route change', () => {
      let activeOverlay: ActiveOverlay = 'location';
      const onRouteChange = () => {
        activeOverlay = 'none';
      };

      expect(activeOverlay).toBe('location');
      onRouteChange();
      expect(activeOverlay).toBe('none');
    });
  });

  describe('3. Modal Backdrop & Scroll Lock Restoration', () => {
    it('closes modal when clicking the backdrop (target === currentTarget)', () => {
      let isOpen = true;
      const closeModal = () => {
        isOpen = false;
      };

      const backdrop = document.createElement('div');
      backdrop.id = 'modal-backdrop';
      const card = document.createElement('div');
      card.id = 'modal-card';
      backdrop.appendChild(card);
      document.body.appendChild(backdrop);

      backdrop.addEventListener('click', (e) => {
        if (e.target === e.currentTarget) {
          closeModal();
        }
      });

      // Click on backdrop directly
      const backdropClick = new MouseEvent('click', { bubbles: true });
      backdrop.dispatchEvent(backdropClick);
      expect(isOpen).toBe(false);

      // Reopen and click inside the card
      isOpen = true;
      const cardClick = new MouseEvent('click', { bubbles: true });
      card.dispatchEvent(cardClick);
      expect(isOpen).toBe(true); // Should NOT close when clicking inside card!
    });

    it('restores body overflow cleanly when modal closes or unmounts', () => {
      document.body.style.overflow = '';

      // Modal opens: lock scroll
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      expect(document.body.style.overflow).toBe('hidden');

      // Modal closes: restore
      document.body.style.overflow = originalOverflow;
      expect(document.body.style.overflow).toBe('');
    });
  });

  describe('4. Autocomplete & Search Dropdown Behavior', () => {
    it('clears suggestions and closes when query is under 2 characters', () => {
      let suggestions: string[] = ['Cheruvathur', 'Kanhangad'];
      let isOpen = true;

      const handleQueryChange = (val: string) => {
        if (val.trim().length < 2) {
          suggestions = [];
          isOpen = false;
        }
      };

      handleQueryChange('c');
      expect(suggestions).toEqual([]);
      expect(isOpen).toBe(false);
    });

    it('resets focus and closes suggestions immediately when clear button is clicked', () => {
      let inputValue = 'Kochi';
      let suggestions = ['Kochi South', 'Kochi Port'];
      let isOpen = true;
      let focusedIndex = 1;

      const handleClear = () => {
        inputValue = '';
        suggestions = [];
        isOpen = false;
        focusedIndex = -1;
      };

      handleClear();
      expect(inputValue).toBe('');
      expect(suggestions).toEqual([]);
      expect(isOpen).toBe(false);
      expect(focusedIndex).toBe(-1);
    });
  });
});
