import React from 'react';

interface LandscapeIllustrationProps {
  className?: string;
}

/**
 * Editorial Kerala-inspired Landscape Illustration
 * Subtle layered SVG with gentle atmospheric hills, restrained palm tree silhouettes,
 * flowing river curve, and ivory-to-transparent blending.
 * Designed strictly as subtle background art that never covers text or buttons.
 */
export const LandscapeIllustration: React.FC<LandscapeIllustrationProps> = ({ className = '' }) => {
  return (
    <div
      className={`pointer-events-none select-none overflow-hidden ${className}`}
      aria-hidden="true"
    >
      <svg
        viewBox="0 0 680 220"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full object-cover object-right"
        preserveAspectRatio="xMaxYMid slice"
      >
        <defs>
          {/* Gentle atmospheric gradient mask from left (transparent/ivory) to right */}
          <linearGradient id="fadeMask" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#F8F6EF" stopOpacity="1" />
            <stop offset="35%" stopColor="#F8F6EF" stopOpacity="0.85" />
            <stop offset="70%" stopColor="#F8F6EF" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#F8F6EF" stopOpacity="0" />
          </linearGradient>

          {/* Vertical fading gradient to ground the hills */}
          <linearGradient id="mistFade" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#8BA681" stopOpacity="0.25" />
            <stop offset="70%" stopColor="#8BA681" stopOpacity="0.12" />
            <stop offset="100%" stopColor="#F8F6EF" stopOpacity="0.8" />
          </linearGradient>
        </defs>

        {/* 1. Distant Western Ghats Silhouette (Softest Layer) */}
        <path
          d="M120 160 C 200 110, 260 135, 330 95 C 400 55, 470 100, 540 70 C 600 45, 650 75, 680 60 L 680 220 L 120 220 Z"
          fill="#8BA681"
          fillOpacity="0.18"
        />

        {/* 2. Midground Rolling Tea & Spice Hills */}
        <path
          d="M180 180 C 260 130, 320 155, 390 120 C 460 85, 520 125, 590 100 C 630 85, 660 105, 680 95 L 680 220 L 180 220 Z"
          fill="#315F3B"
          fillOpacity="0.16"
        />

        {/* 3. Near-midground Hill Ridge */}
        <path
          d="M260 200 C 330 160, 410 175, 470 145 C 530 115, 590 150, 650 130 C 665 125, 675 130, 680 128 L 680 220 L 260 220 Z"
          fill="#103D2A"
          fillOpacity="0.14"
        />

        {/* 4. Single Thin Flowing Sage-Green Water Contour / River Wave */}
        <path
          d="M200 205 C 320 190, 420 215, 520 185 C 580 168, 630 180, 680 165"
          stroke="#8BA681"
          strokeWidth="1.5"
          strokeOpacity="0.45"
          fill="none"
          strokeLinecap="round"
        />
        <path
          d="M280 215 C 370 202, 470 220, 560 198 C 610 185, 650 192, 680 182"
          stroke="#315F3B"
          strokeWidth="1"
          strokeOpacity="0.25"
          fill="none"
          strokeLinecap="round"
        />

        {/* 5. Minimalist Restrained Palm Tree Silhouettes (Right Edge) */}
        {/* Palm 1: Taller, elegant trunk with 5 delicate fronds */}
        <g opacity="0.32" transform="translate(620, 95)">
          {/* Gently curved trunk */}
          <path
            d="M15 105 C 16 75, 12 45, 8 0"
            stroke="#103D2A"
            strokeWidth="2.2"
            strokeLinecap="round"
            fill="none"
          />
          {/* Palm Fronds */}
          <path d="M8 0 C 3 -12, -12 -18, -26 -16" stroke="#103D2A" strokeWidth="1.6" fill="none" strokeLinecap="round" />
          <path d="M8 0 C 12 -16, 2 -25, -15 -28" stroke="#103D2A" strokeWidth="1.6" fill="none" strokeLinecap="round" />
          <path d="M8 0 C 14 -18, 26 -20, 36 -12" stroke="#103D2A" strokeWidth="1.6" fill="none" strokeLinecap="round" />
          <path d="M8 0 C 20 -10, 32 -6, 38 4" stroke="#103D2A" strokeWidth="1.6" fill="none" strokeLinecap="round" />
          <path d="M8 0 C 10 -6, 18 10, 22 22" stroke="#103D2A" strokeWidth="1.6" fill="none" strokeLinecap="round" />
          <path d="M8 0 C -2 -4, -14 6, -20 18" stroke="#103D2A" strokeWidth="1.6" fill="none" strokeLinecap="round" />
        </g>

        {/* Palm 2: Slightly shorter, flanking on the right */}
        <g opacity="0.26" transform="translate(650, 115)">
          <path
            d="M10 90 C 9 65, 12 35, 6 0"
            stroke="#103D2A"
            strokeWidth="1.8"
            strokeLinecap="round"
            fill="none"
          />
          <path d="M6 0 C 1 -10, -10 -15, -22 -12" stroke="#103D2A" strokeWidth="1.4" fill="none" strokeLinecap="round" />
          <path d="M6 0 C 10 -14, 20 -15, 28 -8" stroke="#103D2A" strokeWidth="1.4" fill="none" strokeLinecap="round" />
          <path d="M6 0 C 15 -8, 24 -4, 30 5" stroke="#103D2A" strokeWidth="1.4" fill="none" strokeLinecap="round" />
          <path d="M6 0 C -2 -4, -10 4, -16 14" stroke="#103D2A" strokeWidth="1.4" fill="none" strokeLinecap="round" />
        </g>

        {/* Palm 3: Distant smaller palm */}
        <g opacity="0.18" transform="translate(560, 130)">
          <path
            d="M6 65 C 5 45, 8 25, 4 0"
            stroke="#103D2A"
            strokeWidth="1.4"
            strokeLinecap="round"
            fill="none"
          />
          <path d="M4 0 C 0 -8, -8 -11, -16 -8" stroke="#103D2A" strokeWidth="1.1" fill="none" strokeLinecap="round" />
          <path d="M4 0 C 7 -10, 14 -11, 20 -5" stroke="#103D2A" strokeWidth="1.1" fill="none" strokeLinecap="round" />
          <path d="M4 0 C -1 -3, -6 3, -10 10" stroke="#103D2A" strokeWidth="1.1" fill="none" strokeLinecap="round" />
        </g>

        {/* 6. Seamless Left-to-Right Blending Overlay */}
        <rect x="0" y="0" width="680" height="220" fill="url(#fadeMask)" />
      </svg>
    </div>
  );
};

