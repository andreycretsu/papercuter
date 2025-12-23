'use client';

import { useState } from 'react';
import { Heart } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LikeButtonProps {
  papercutId: string;
  initialLikeCount: number;
  initialUserLikeCount: number;
  onLikeChange?: (newTotalCount: number, newUserCount: number) => void;
}

export function LikeButton({
  papercutId,
  initialLikeCount,
  initialUserLikeCount,
  onLikeChange,
}: LikeButtonProps) {
  const [likeCount, setLikeCount] = useState(initialLikeCount);
  const [userLikeCount, setUserLikeCount] = useState(initialUserLikeCount);
  const [isAnimating, setIsAnimating] = useState(false);

  const handleLike = async () => {
    // Optimistic update - increment immediately
    setLikeCount(prev => prev + 1);
    setUserLikeCount(prev => prev + 1);
    setIsAnimating(true);

    setTimeout(() => setIsAnimating(false), 300);

    // Fire and forget - don't wait for the response
    fetch(`/api/papercuts/${papercutId}/like`, {
      method: 'POST',
    }).then(response => {
      if (response.ok) {
        return response.json();
      }
      throw new Error('Failed to like');
    }).then(data => {
      // Sync with server response
      setLikeCount(data.likeCount);
      setUserLikeCount(data.userLikeCount);
      onLikeChange?.(data.likeCount, data.userLikeCount);
    }).catch(error => {
      console.error('Error updating like:', error);
      // Decrement on error
      setLikeCount(prev => prev - 1);
      setUserLikeCount(prev => prev - 1);
    });
  };

  return (
    <button
      onClick={handleLike}
      className={cn(
        'group flex items-center gap-2 transition-all duration-200',
        'hover:scale-110'
      )}
      aria-label="Like"
    >
      <div className="relative">
        <Heart
          className={cn(
            'w-5 h-5 transition-all duration-200',
            userLikeCount > 0
              ? 'fill-red-500 text-red-500'
              : 'text-gray-400 group-hover:text-red-400 group-hover:fill-red-100'
          )}
        />
        {isAnimating && (
          <>
            <Heart
              className="absolute inset-0 w-5 h-5 fill-red-500 text-red-500 animate-ping"
              style={{ animationDuration: '600ms' }}
            />
            <div
              className="absolute inset-0 w-5 h-5 rounded-full bg-red-200 animate-ping"
              style={{ animationDuration: '600ms', opacity: 0.6 }}
            />
          </>
        )}
      </div>
      <span
        className={cn(
          'text-sm font-medium tabular-nums transition-colors duration-200',
          userLikeCount > 0 ? 'text-red-600 dark:text-red-400' : 'text-gray-600 dark:text-gray-400'
        )}
      >
        {likeCount}
      </span>
    </button>
  );
}
