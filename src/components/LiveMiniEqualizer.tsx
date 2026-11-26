import React from 'react';

interface Props {
  className?: string;
  label?: string;
}

/**
 * Signature 3-bar calm acoustic micro-equalizer (10px tall, #22C55E) for live listeners.
 */
export const LiveMiniEqualizer: React.FC<Props> = ({
  className = '',
  label = 'Canlı dinliyor',
}) => (
  <span
    className={`inline-flex items-end gap-[2px] h-[10px] shrink-0 ${className}`}
    aria-label={label}
    title={label}
  >
    <span
      className="w-[2px] h-[10px] rounded-full bg-[#16A34A] dark:bg-[#22C55E] animate-eq-bar"
      style={{ animationDelay: '0ms' }}
    />
    <span
      className="w-[2px] h-[10px] rounded-full bg-[#16A34A] dark:bg-[#22C55E] animate-eq-bar"
      style={{ animationDelay: '280ms' }}
    />
    <span
      className="w-[2px] h-[10px] rounded-full bg-[#16A34A] dark:bg-[#22C55E] animate-eq-bar"
      style={{ animationDelay: '560ms' }}
    />
  </span>
);
