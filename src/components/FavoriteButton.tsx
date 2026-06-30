import { useState, useCallback } from 'react';
import { HeartIcon as HeartOutline } from '@heroicons/react/24/outline';
import { HeartIcon as HeartSolid } from '@heroicons/react/24/solid';
import { useAuthStatus } from '@sudobility/auth-components';
import { useLocalizedNavigate } from '../hooks/useLocalizedNavigate';

interface FavoriteButtonProps {
  isFavorited: boolean;
  onToggle: () => Promise<void>;
  size?: 'sm' | 'md';
  className?: string;
}

export function FavoriteButton({
  isFavorited,
  onToggle,
  size = 'md',
  className = '',
}: FavoriteButtonProps) {
  const { user } = useAuthStatus();
  const { navigate } = useLocalizedNavigate();
  const [animating, setAnimating] = useState(false);

  const iconSize = size === 'sm' ? 'w-5 h-5' : 'w-6 h-6';

  const handleClick = useCallback(
    async (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();

      if (!user) {
        navigate('/login');
        return;
      }

      setAnimating(true);
      try {
        await onToggle();
      } catch {
        // error handled by caller
      }
      setTimeout(() => setAnimating(false), 400);
    },
    [user, navigate, onToggle]
  );

  return (
    <button
      type="button"
      onClick={handleClick}
      className={`${className} transition-colors`}
      aria-label={isFavorited ? 'Unfavorite' : 'Favorite'}
    >
      {isFavorited ? (
        <HeartSolid
          className={`${iconSize} text-destructive ${animating ? 'animate-heart-bounce' : ''}`}
        />
      ) : (
        <HeartOutline
          className={`${iconSize} text-muted-foreground hover:text-destructive/80 ${animating ? 'animate-heart-bounce' : ''}`}
        />
      )}
    </button>
  );
}
