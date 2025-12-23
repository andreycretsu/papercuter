'use client';

import { useState } from 'react';
import { Heart } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LikeButtonProps {
  papercutId: string;
  initialLikeCount: number;
  initialIsLiked: boolean;
  onLikeChange?: (liked: boolean, newCount: number) => void;
}

export function LikeButton({
  papercutId,
  initialLikeCount,
  initialIsLiked,
  onLikeChange,
}: LikeButtonProps) {
  const [likeCount, setLikeCount] = useState(initialLikeCount);
  const [isLiked, setIsLiked] = useState(initialIsLiked);
  const [isAnimating, setIsAnimating] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleLike = async () => {
    if (isLoading) return;

    const previousLiked = isLiked;
    const previousCount = likeCount;

    // Optimistic update
    setIsLiked(!isLiked);
    setLikeCount(isLiked ? likeCount - 1 : likeCount + 1);
    setIsAnimating(true);

    setTimeout(() => setIsAnimating(false), 600);

    setIsLoading(true);

    try {
      const response = await fetch(`/api/papercuts/${papercutId}/like`, {
        method: isLiked ? 'DELETE' : 'POST',
      });

      if (!response.ok) {
        throw new Error('Failed to update like');
      }

      const data = await response.json();
      setLikeCount(data.likeCount);
      onLikeChange?.(!previousLiked, data.likeCount);
    } catch (error) {
      console.error('Error updating like:', error);
      // Revert on error
      setIsLiked(previousLiked);
      setLikeCount(previousCount);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <button
      onClick={handleLike}
      disabled={isLoading}
      className={cn(
        'group flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-all duration-200',
        'hover:bg-pink-50 dark:hover:bg-pink-950/20',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        isLiked && 'bg-pink-50 dark:bg-pink-950/20'
      )}
      aria-label={isLiked ? 'Unlike' : 'Like'}
    >
      <div className="relative">
        <Heart
          className={cn(
            'w-5 h-5 transition-all duration-200',
            isLiked
              ? 'fill-pink-500 text-pink-500'
              : 'text-gray-400 group-hover:text-pink-400'
          )}
        />
        {isAnimating && (
          <>
            <Heart
              className="absolute inset-0 w-5 h-5 fill-pink-500 text-pink-500 animate-ping"
              style={{ animationDuration: '600ms' }}
            />
            <div
              className="absolute inset-0 w-5 h-5 rounded-full bg-pink-200 animate-ping"
              style={{ animationDuration: '600ms', opacity: 0.6 }}
            />
          </>
        )}
      </div>
      <span
        className={cn(
          'text-sm font-medium tabular-nums transition-colors duration-200',
          isLiked ? 'text-pink-600 dark:text-pink-400' : 'text-gray-600 dark:text-gray-400'
        )}
      >
        {likeCount}
      </span>
    </button>
  );
}
