"use client";

import * as React from "react";
import { Check } from "lucide-react";

interface SwipeToResolveProps {
  onResolve: () => void;
  isResolving: boolean;
  isResolved: boolean;
}

export function SwipeToResolve({ onResolve, isResolving, isResolved }: SwipeToResolveProps) {
  const [dragOffset, setDragOffset] = React.useState(0);
  const [isDragging, setIsDragging] = React.useState(false);
  const [containerWidth, setContainerWidth] = React.useState(0);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const startXRef = React.useRef(0);

  const SWIPE_THRESHOLD = 0.8; // 80% of container width

  React.useEffect(() => {
    if (containerRef.current) {
      setContainerWidth(containerRef.current.offsetWidth);
    }
  }, []);

  const handleStart = (clientX: number) => {
    if (isResolving || isResolved) return;
    setIsDragging(true);
    startXRef.current = clientX - dragOffset;
  };

  const handleMove = (clientX: number) => {
    if (!isDragging || isResolving || isResolved) return;

    const newOffset = clientX - startXRef.current;
    const maxOffset = containerWidth - 48; // 48px is the button width

    // Only allow dragging to the right
    if (newOffset >= 0 && newOffset <= maxOffset) {
      setDragOffset(newOffset);
    }
  };

  const handleEnd = () => {
    if (!isDragging) return;
    setIsDragging(false);

    const threshold = containerWidth * SWIPE_THRESHOLD;

    if (dragOffset >= threshold) {
      // Swipe successful
      setDragOffset(containerWidth - 48);
      setTimeout(() => {
        onResolve();
      }, 200);
    } else {
      // Swipe not far enough, reset
      setDragOffset(0);
    }
  };

  // Mouse events
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    handleStart(e.clientX);
  };

  const handleMouseMove = (e: MouseEvent) => {
    handleMove(e.clientX);
  };

  const handleMouseUp = () => {
    handleEnd();
  };

  // Touch events
  const handleTouchStart = (e: React.TouchEvent) => {
    handleStart(e.touches[0].clientX);
  };

  const handleTouchMove = (e: TouchEvent) => {
    handleMove(e.touches[0].clientX);
  };

  const handleTouchEnd = () => {
    handleEnd();
  };

  React.useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      window.addEventListener('touchmove', handleTouchMove);
      window.addEventListener('touchend', handleTouchEnd);

      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
        window.removeEventListener('touchmove', handleTouchMove);
        window.removeEventListener('touchend', handleTouchEnd);
      };
    }
  }, [isDragging, dragOffset, containerWidth]);

  const progress = containerWidth > 0 ? dragOffset / (containerWidth - 48) : 0;
  const backgroundColor = `rgba(34, 197, 94, ${Math.min(progress * 0.3, 0.3)})`;

  if (isResolved) {
    return (
      <div className="flex h-12 items-center justify-center rounded-lg bg-green-100 text-green-700 font-medium">
        <Check className="mr-2 h-5 w-5" />
        Resolved
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="relative h-12 overflow-hidden rounded-lg border border-border"
      style={{ backgroundColor, touchAction: 'none' }}
    >
      <div className="absolute inset-0 flex items-center justify-center text-sm font-medium text-muted-foreground pointer-events-none select-none">
        {isResolving ? "Resolving..." : "Swipe to resolve"}
      </div>

      <div
        className="absolute left-0 top-0 h-full w-12 flex items-center justify-center bg-green-500 text-white rounded-lg cursor-grab active:cursor-grabbing shadow-lg transition-shadow"
        style={{
          transform: `translateX(${dragOffset}px)`,
          transition: isDragging ? 'none' : 'transform 0.3s ease-out',
        }}
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
      >
        <Check className="h-5 w-5" />
      </div>
    </div>
  );
}
