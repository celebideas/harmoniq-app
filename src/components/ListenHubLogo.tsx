import React from 'react';

interface Props {
  className?: string;
}

/**
 * Bespoke minimalist ListenHub emblem — 3 sleek vertical acoustic bars.
 */
export const ListenHubLogo: React.FC<Props> = ({ className = 'w-5 h-5' }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    aria-hidden="true"
  >
    <path
      d="M7 8.5V15.5M12 4.5V19.5M17 9.5V14.5"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
    />
  </svg>
);
