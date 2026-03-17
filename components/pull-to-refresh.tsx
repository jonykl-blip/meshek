"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

const PULL_THRESHOLD = 80; // px to trigger refresh

export default function PullToRefresh() {
  const router = useRouter();
  const [pullDistance, setPullDistance] = useState(0);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const startYRef = useRef<number | null>(null);
  const isPullingRef = useRef(false);

  useEffect(() => {
    function onTouchStart(e: TouchEvent) {
      // Only activate when scrolled to very top
      if (window.scrollY !== 0) return;
      startYRef.current = e.touches[0].clientY;
      isPullingRef.current = true;
    }

    function onTouchMove(e: TouchEvent) {
      if (!isPullingRef.current || startYRef.current === null) return;
      if (window.scrollY !== 0) {
        isPullingRef.current = false;
        setPullDistance(0);
        return;
      }
      const delta = e.touches[0].clientY - startYRef.current;
      if (delta > 0) {
        // Apply resistance: show less movement than actual pull
        setPullDistance(Math.min(delta * 0.5, PULL_THRESHOLD));
      }
    }

    function onTouchEnd() {
      if (!isPullingRef.current) return;
      isPullingRef.current = false;

      if (pullDistance >= PULL_THRESHOLD * 0.5) {
        setIsRefreshing(true);
        setPullDistance(0);
        // router.refresh() triggers a server-side re-fetch
        router.refresh();
        // Hide spinner after a short delay so users see feedback
        setTimeout(() => setIsRefreshing(false), 1200);
      } else {
        setPullDistance(0);
      }
      startYRef.current = null;
    }

    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: true });
    window.addEventListener("touchend", onTouchEnd, { passive: true });

    return () => {
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
    };
  }, [pullDistance, router]);

  const showIndicator = isRefreshing || pullDistance > 0;

  if (!showIndicator) return null;

  return (
    <div
      className="fixed top-14 left-0 right-0 z-30 flex justify-center pointer-events-none"
      style={{ transform: `translateY(${isRefreshing ? 8 : pullDistance * 0.1}px)` }}
    >
      <div className="flex items-center gap-2 rounded-full bg-card border shadow-md px-4 py-2 text-sm text-muted-foreground">
        <svg
          className={`h-4 w-4 shrink-0 ${isRefreshing ? "animate-spin text-primary" : "text-muted-foreground"}`}
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8v4l3-3-3-3v4a8 8 0 100 16v-4l-3 3 3 3v-4a8 8 0 01-8-8z"
          />
        </svg>
        {isRefreshing ? "מרענן..." : "משוך לרענון"}
      </div>
    </div>
  );
}
