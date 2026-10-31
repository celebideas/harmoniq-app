import React, { useState } from 'react';
import { Music } from 'lucide-react';
import { Song } from '../types';

interface SongCoverProps {
  song: Pick<Song, 'title' | 'artist' | 'album' | 'coverUrl' | 'coverGradient'>;
  className?: string;
  imgClassName?: string;
  showVinylCenter?: boolean;
  isPlaying?: boolean;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export const SongCover: React.FC<SongCoverProps> = ({
  song,
  className = 'w-16 h-16 rounded-2xl',
  imgClassName = 'w-full h-full object-cover',
  showVinylCenter = false,
  isPlaying = false,
}) => {
  const [imageError, setImageError] = useState(false);

  // If local or remote URL fails, try to fallback to default
  const coverSrc = !imageError && song.coverUrl ? song.coverUrl : null;

  return (
    <div
      className={`relative overflow-hidden shrink-0 shadow-lg select-none ${className}`}
      style={{ isolation: 'isolate' }}
    >
      {coverSrc ? (
        <img
          src={coverSrc}
          alt={`${song.artist} - ${song.title}`}
          onError={() => setImageError(true)}
          className={`transition-opacity duration-300 ${imgClassName}`}
          loading="eager"
          decoding="async"
        />
      ) : (
        <div
          className={`w-full h-full bg-gradient-to-tr ${song.coverGradient || 'from-neutral-800 to-neutral-950'} flex flex-col items-center justify-center p-1 text-white`}
        >
          <Music className="w-5 h-5 text-white/80" />
          <span className="text-[9px] font-bold tracking-tight text-white/90 truncate max-w-full px-1 mt-0.5">
            {song.artist}
          </span>
        </div>
      )}

      {/* Subtle vinyl micro-groove texture overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/25 via-transparent to-white/10 pointer-events-none" />

      {/* Optional vinyl center pin badge */}
      {showVinylCenter && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div
            className={`w-5 h-5 rounded-full bg-neutral-950/75 border border-white/25 flex items-center justify-center backdrop-blur-xs shadow-sm ${
              isPlaying ? 'animate-spin' : ''
            }`}
            style={{ animationDuration: '4s' }}
          >
            <div className="w-1.5 h-1.5 rounded-full bg-lime-400 shadow-[0_0_6px_rgba(163,230,53,0.8)]" />
          </div>
        </div>
      )}
    </div>
  );
};
