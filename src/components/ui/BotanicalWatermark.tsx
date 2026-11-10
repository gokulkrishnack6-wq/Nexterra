import React from 'react';

interface BotanicalWatermarkProps {
  className?: string;
}

/**
 * Botanical Leaf Sprig Watermark
 * Subtle illustrated Kerala foliage sprig that sits in the corner of panels and metric cards,
 * exactly matching the reference design.
 */
export const BotanicalWatermark: React.FC<BotanicalWatermarkProps> = ({ className = '' }) => {
  return (
    <div
      className={`absolute bottom-0 right-0 pointer-events-none select-none overflow-hidden opacity-[0.22] ${className}`}
      aria-hidden="true"
    >
      <svg
        viewBox="0 0 120 120"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-20 h-20 sm:w-24 sm:h-24 object-contain translate-x-2 translate-y-2"
      >
        {/* Main curved branch */}
        <path
          d="M10 110 C 35 95, 60 70, 95 20"
          stroke="#47764C"
          strokeWidth="1.8"
          strokeLinecap="round"
        />

        {/* Leaf 1 (Left lower) */}
        <path
          d="M32 90 C 20 85, 12 72, 18 64 C 26 62, 36 72, 38 84 Z"
          fill="#8BA681"
          stroke="#47764C"
          strokeWidth="0.8"
        />

        {/* Leaf 2 (Right lower) */}
        <path
          d="M48 80 C 62 82, 70 74, 68 64 C 58 62, 48 70, 48 80 Z"
          fill="#A4C49D"
          stroke="#47764C"
          strokeWidth="0.8"
        />

        {/* Leaf 3 (Left mid) */}
        <path
          d="M52 65 C 40 58, 36 44, 44 38 C 52 38, 58 48, 56 60 Z"
          fill="#8BA681"
          stroke="#47764C"
          strokeWidth="0.8"
        />

        {/* Leaf 4 (Right mid) */}
        <path
          d="M68 54 C 82 52, 90 42, 86 34 C 76 34, 68 42, 68 54 Z"
          fill="#A4C49D"
          stroke="#47764C"
          strokeWidth="0.8"
        />

        {/* Leaf 5 (Left upper) */}
        <path
          d="M76 38 C 66 28, 65 16, 73 12 C 81 14, 82 24, 78 34 Z"
          fill="#8BA681"
          stroke="#47764C"
          strokeWidth="0.8"
        />

        {/* Leaf 6 (Tip) */}
        <path
          d="M95 20 C 102 12, 104 4, 98 2 C 92 4, 90 12, 95 20 Z"
          fill="#47764C"
          stroke="#174B32"
          strokeWidth="0.8"
        />
      </svg>
    </div>
  );
};

