import { Maximize2, Minimize2 } from "lucide-react";
import * as React from "react";
import { useRef, useState } from "react";

import { cn } from "@/lib/utils";

interface ZoomableImageProps {
  src: string;
  alt?: string;
  /** Called on a horizontal swipe while the image is not zoomed. */
  onSwipe?: (delta: number) => void;
  className?: string;
  overlay?: React.ReactNode;
}

const MIN = 1;
const MAX = 4;
const SWIPE_THRESHOLD = 64;

/**
 * Pinch / double-tap zoom with panning, plus horizontal swipe navigation while
 * at 1× — shared by the admin review deck and the student photo viewer.
 */
export const ZoomableImage = ({ src, alt = "", onSwipe, className, overlay }: ZoomableImageProps) => {
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const gesture = useRef({
    startDist: 0,
    startScale: 1,
    startX: 0,
    startY: 0,
    startOffsetX: 0,
    startOffsetY: 0,
    swiped: false,
  });

  const reset = () => {
    setScale(1);
    setOffset({ x: 0, y: 0 });
  };

  const onPointerDown = (event: React.PointerEvent) => {
    (event.target as HTMLElement).setPointerCapture?.(event.pointerId);
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    const pts = [...pointers.current.values()];
    gesture.current.startX = event.clientX;
    gesture.current.startY = event.clientY;
    gesture.current.startOffsetX = offset.x;
    gesture.current.startOffsetY = offset.y;
    gesture.current.swiped = false;
    gesture.current.startDist = pts.length === 2 ? Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y) : 0;
    gesture.current.startScale = scale;
  };

  const onPointerMove = (event: React.PointerEvent) => {
    if (!pointers.current.has(event.pointerId)) return;
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    const pts = [...pointers.current.values()];

    if (pts.length >= 2) {
      const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
      if (!gesture.current.startDist) {
        gesture.current.startDist = dist;
        gesture.current.startScale = scale;
        return;
      }
      const next = Math.min(MAX, Math.max(MIN, (gesture.current.startScale * dist) / gesture.current.startDist));
      setScale(next);
      if (next === 1) setOffset({ x: 0, y: 0 });
      gesture.current.swiped = true;
      return;
    }

    const dx = event.clientX - gesture.current.startX;
    const dy = event.clientY - gesture.current.startY;
    if (scale > 1) {
      setOffset({
        x: gesture.current.startOffsetX + dx,
        y: gesture.current.startOffsetY + dy,
      });
      gesture.current.swiped = true;
    } else if (Math.abs(dx) > 12) {
      gesture.current.swiped = true;
    }
  };

  const onPointerUp = (event: React.PointerEvent) => {
    const pts = [...pointers.current.values()];
    const dx = event.clientX - gesture.current.startX;
    pointers.current.delete(event.pointerId);

    if (pts.length <= 1 && scale === MIN && onSwipe && Math.abs(dx) > SWIPE_THRESHOLD) {
      onSwipe(dx < 0 ? 1 : -1);
      reset();
      return;
    }
    if (pointsEqual(pts, 2)) {
      gesture.current.startDist = 0;
    }
  };

  const pointsEqual = (pts: { x: number; y: number }[], n: number) => pts.length === n;

  const zoomed = scale > 1.02;

  return (
    <div
      className={cn("relative touch-none overflow-hidden", className)}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onDoubleClick={() => (zoomed ? reset() : setScale(2.4))}
    >
      <img
        src={src}
        alt={alt}
        crossOrigin="anonymous"
        draggable={false}
        className="size-full select-none object-contain transition-transform duration-150 ease-out"
        style={{
          transform: `translate3d(${offset.x}px, ${offset.y}px, 0) scale(${scale})`,
        }}
      />
      {overlay}
      <button
        type="button"
        onClick={() => (zoomed ? reset() : setScale(2.4))}
        className="absolute bottom-3 left-3 inline-flex items-center gap-1.5 rounded-full border border-onimage-border bg-onimage-surface px-2.5 py-1 text-caption font-semibold text-onimage backdrop-blur-md"
        aria-label={zoomed ? "Reset zoom" : "Zoom in"}
      >
        {zoomed ? <Minimize2 className="size-3.5" aria-hidden="true" /> : <Maximize2 className="size-3.5" aria-hidden="true" />}
        {zoomed ? "Reset zoom" : "Pinch to zoom"}
      </button>
    </div>
  );
};
