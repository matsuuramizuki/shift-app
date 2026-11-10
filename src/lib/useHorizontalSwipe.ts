import { useCallback, useRef } from "react";
import type React from "react";

const MIN_SWIPE_DISTANCE = 50;
const HORIZONTAL_RATIO = 1.25;
const CLICK_SUPPRESS_MS = 350;

/**
 * Detects a horizontal swipe and reports its direction.
 * Clicks fired right after a swipe can be ignored with `isClickSuppressed()`.
 */
export function useHorizontalSwipe<T extends HTMLElement = HTMLDivElement>(
  onSwipe: (direction: "next" | "prev") => void,
  enabled = true
) {
  const startRef = useRef<{ x: number; y: number } | null>(null);
  const suppressUntilRef = useRef(0);

  const onTouchStart = useCallback((event: React.TouchEvent<T>) => {
    if (!enabled) return;
    const touch = event.touches[0];
    if (touch) startRef.current = { x: touch.clientX, y: touch.clientY };
  }, [enabled]);

  const onTouchEnd = useCallback((event: React.TouchEvent<T>) => {
    const start = startRef.current;
    startRef.current = null;
    if (!enabled || !start) return;

    const touch = event.changedTouches[0];
    if (!touch) return;

    const deltaX = touch.clientX - start.x;
    const deltaY = touch.clientY - start.y;
    if (Math.abs(deltaX) < MIN_SWIPE_DISTANCE || Math.abs(deltaX) < Math.abs(deltaY) * HORIZONTAL_RATIO) return;

    suppressUntilRef.current = Date.now() + CLICK_SUPPRESS_MS;
    if (event.cancelable) event.preventDefault();
    onSwipe(deltaX < 0 ? "next" : "prev");
  }, [enabled, onSwipe]);

  const onTouchCancel = useCallback(() => {
    startRef.current = null;
  }, []);

  const isClickSuppressed = useCallback(() => Date.now() < suppressUntilRef.current, []);

  return { handlers: { onTouchStart, onTouchEnd, onTouchCancel }, isClickSuppressed };
}
