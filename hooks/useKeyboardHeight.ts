'use client';

import { useState, useEffect } from 'react';

/**
 * Hook to detect mobile keyboard height using the Visual Viewport API.
 * Returns the keyboard height in pixels when the keyboard is open, 0 otherwise.
 */
export function useKeyboardHeight() {
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    // Only run on client and if visualViewport is available
    if (typeof window === 'undefined' || !window.visualViewport) {
      return;
    }

    const viewport = window.visualViewport;

    const handleResize = () => {
      // The keyboard height is the difference between window height and viewport height
      const keyboardH = window.innerHeight - viewport.height;
      // Only set if positive and significant (> 100px to avoid false positives from address bar)
      setKeyboardHeight(keyboardH > 100 ? keyboardH : 0);
    };

    viewport.addEventListener('resize', handleResize);
    viewport.addEventListener('scroll', handleResize);

    // Initial check
    handleResize();

    return () => {
      viewport.removeEventListener('resize', handleResize);
      viewport.removeEventListener('scroll', handleResize);
    };
  }, []);

  return keyboardHeight;
}
