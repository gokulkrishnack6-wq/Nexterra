import React from 'react';

interface LandscapeIllustrationProps {
  className?: string;
}

/**
 * Editorial Kerala-inspired Landscape Illustration
 * Accurately recreates the authentic hand-drawn / watercolor style Kerala landscape
 * from the master reference:
 * - Distant misty rolling hills
 * - Soft flock of birds in the gentle sky
 * - Traditional Kerala cottage with terracotta tiled roof
 * - Cluster of tall coconut palms with lush radiating fronds
 * - Organic foliage clusters and grassy rolling foreground
 * - Seamless fade mask into warm ivory #F7F4EC
 */
export const LandscapeIllustration: React.FC<LandscapeIllustrationProps> = ({ className = '' }) => {
  return (
    <div
      className={`pointer-events-none select-none overflow-hidden ${className}`}
      aria-hidden="true"
    >
      <svg
        viewBox="0 0 760 260"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="w-full h-full object-cover object-right"
        preserveAspectRatio="xMaxYMid meet"
      >
        <defs>
          {/* Gradient mask for smooth fade into warm ivory #F7F4EC on left and bottom */}
          <linearGradient id="keralaFadeLeft" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#F7F4EC" stopOpacity="1" />
            <stop offset="25%" stopColor="#F7F4EC" stopOpacity="0.85" />
            <stop offset="55%" stopColor="#F7F4EC" stopOpacity="0.25" />
            <stop offset="85%" stopColor="#F7F4EC" stopOpacity="0" />
            <stop offset="100%" stopColor="#F7F4EC" stopOpacity="0" />
          </linearGradient>

          <linearGradient id="keralaFadeBottom" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="70%" stopColor="#F7F4EC" stopOpacity="0" />
            <stop offset="100%" stopColor="#F7F4EC" stopOpacity="0.85" />
          </linearGradient>

          {/* Shading gradients for misty hills */}
          <linearGradient id="hillDistantGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#9BB596" stopOpacity="0.55" />
            <stop offset="100%" stopColor="#B8CFB3" stopOpacity="0.25" />
          </linearGradient>

          <linearGradient id="hillMidGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#73976E" stopOpacity="0.7" />
            <stop offset="100%" stopColor="#95B690" stopOpacity="0.35" />
          </linearGradient>

          <linearGradient id="fieldGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#5E8359" stopOpacity="0.75" />
            <stop offset="100%" stopColor="#7FA679" stopOpacity="0.45" />
          </linearGradient>
        </defs>

        {/* 1. Distant Birds in the Ivory Sky */}
        <g stroke="#68736B" strokeWidth="1.2" strokeLinecap="round" opacity="0.6">
          <path d="M 370 42 Q 374 38 378 42 Q 382 38 386 42" />
          <path d="M 396 35 Q 401 30 406 35 Q 411 30 416 35" />
          <path d="M 425 48 Q 429 44 433 48 Q 437 44 441 48" />
          <path d="M 448 38 Q 452 34 456 38 Q 460 34 464 38" />
        </g>

        {/* 2. Distant Misty Mountain Ridge */}
        <path
          d="M 120 180 C 190 140, 260 155, 330 115 C 400 75, 480 120, 560 90 C 620 68, 680 95, 760 80 L 760 260 L 120 260 Z"
          fill="url(#hillDistantGrad)"
        />

        {/* 3. Midground Rolling Hill Ridge */}
        <path
          d="M 180 205 C 260 160, 340 185, 420 145 C 500 110, 570 150, 650 125 C 700 110, 735 125, 760 120 L 760 260 L 180 260 Z"
          fill="url(#hillMidGrad)"
        />

        {/* 4. Near Green Grassy Hills & Paddy Fields */}
        <path
          d="M 240 225 C 330 180, 420 205, 500 170 C 580 140, 660 175, 760 150 L 760 260 L 240 260 Z"
          fill="url(#fieldGrad)"
        />

        {/* 5. Clustered Foliage & Trees in Midground */}
        <g fill="#436B3E" opacity="0.85">
          <circle cx="510" cy="180" r="14" />
          <circle cx="525" cy="176" r="18" />
          <circle cx="538" cy="182" r="13" />
          <circle cx="615" cy="178" r="16" />
          <circle cx="628" cy="174" r="20" />
          <circle cx="645" cy="180" r="17" />
          <circle cx="660" cy="175" r="15" />
          <circle cx="678" cy="179" r="19" />
          <circle cx="695" cy="174" r="18" />
          <circle cx="715" cy="178" r="16" />
          <circle cx="735" cy="176" r="22" />
        </g>
        <g fill="#31552C" opacity="0.75">
          <circle cx="520" cy="183" r="12" />
          <circle cx="622" cy="182" r="14" />
          <circle cx="640" cy="183" r="15" />
          <circle cx="672" cy="182" r="16" />
          <circle cx="690" cy="180" r="14" />
          <circle cx="725" cy="182" r="17" />
        </g>

        {/* 6. Traditional Kerala Cottage / House */}
        {/* House Shadow & Grounding */}
        <ellipse cx="578" cy="192" rx="35" ry="4" fill="#2E4A28" opacity="0.4" />

        {/* House Walls (Warm cream / ochre) */}
        <polygon points="552,192 602,192 602,170 552,170" fill="#EAE0CE" stroke="#5B4834" strokeWidth="0.8" />

        {/* House Door & Windows (Dark wood/umber) */}
        <rect x="573" y="176" width="9" height="16" fill="#4B3828" rx="0.5" />
        <rect x="557" y="174" width="7" height="7" fill="#4B3828" rx="0.5" />
        <rect x="589" y="174" width="7" height="7" fill="#4B3828" rx="0.5" />
        <line x1="560.5" y1="174" x2="560.5" y2="181" stroke="#EAE0CE" strokeWidth="0.6" />
        <line x1="592.5" y1="174" x2="592.5" y2="181" stroke="#EAE0CE" strokeWidth="0.6" />

        {/* Terracotta Pitched Tiled Roof */}
        <polygon points="545,171 577,148 609,171" fill="#B3582A" stroke="#7E3715" strokeWidth="0.9" />
        {/* Roof tile lines & texture */}
        <line x1="552" y1="166" x2="577" y2="148" stroke="#8E401A" strokeWidth="0.7" />
        <line x1="602" y1="166" x2="577" y2="148" stroke="#8E401A" strokeWidth="0.7" />
        <line x1="560" y1="171" x2="577" y2="157" stroke="#7E3715" strokeWidth="0.6" />
        <line x1="594" y1="171" x2="577" y2="157" stroke="#7E3715" strokeWidth="0.6" />
        {/* Roof overhang eave */}
        <line x1="544" y1="171.5" x2="610" y2="171.5" stroke="#5C250B" strokeWidth="1.2" strokeLinecap="round" />

        {/* 7. Coconut Palm Trees (Prominent cluster on right) */}
        {/* PALM 1 (Tallest, center-right) */}
        <g>
          {/* Slender curved trunk */}
          <path
            d="M 618 190 C 616 150, 610 110, 614 72"
            stroke="#594432"
            strokeWidth="3.2"
            strokeLinecap="round"
          />
          {/* Trunk ring segments */}
          <path d="M 616.5 170 L 618 170 M 615 150 L 617 150 M 613 130 L 615 130 M 612 110 L 614 110 M 612 90 L 614 90" stroke="#7A6048" strokeWidth="0.8" />
          
          {/* Radiating Coconut Fronds */}
          {/* Left fronds */}
          <path d="M 614 72 C 596 68, 574 74, 560 88" stroke="#2B5725" strokeWidth="2.2" strokeLinecap="round" />
          <path d="M 614 72 C 590 56, 566 58, 552 68" stroke="#35662E" strokeWidth="2.2" strokeLinecap="round" />
          <path d="M 614 72 C 602 46, 582 38, 568 44" stroke="#417737" strokeWidth="2.2" strokeLinecap="round" />
          {/* Top fronds */}
          <path d="M 614 72 C 612 44, 608 26, 604 16" stroke="#4A863E" strokeWidth="2.2" strokeLinecap="round" />
          <path d="M 614 72 C 620 42, 626 26, 630 18" stroke="#3F7635" strokeWidth="2.2" strokeLinecap="round" />
          {/* Right fronds */}
          <path d="M 614 72 C 632 46, 650 42, 666 48" stroke="#35662E" strokeWidth="2.2" strokeLinecap="round" />
          <path d="M 614 72 C 640 58, 664 64, 678 78" stroke="#2B5725" strokeWidth="2.2" strokeLinecap="round" />
          <path d="M 614 72 C 634 76, 652 88, 662 102" stroke="#234B1E" strokeWidth="2.2" strokeLinecap="round" />

          {/* Leaflet feathery touches */}
          <path d="M 576 72 L 574 80 M 584 68 L 582 78 M 594 66 L 592 76 M 634 68 L 638 78 M 646 72 L 650 82 M 658 80 L 664 90" stroke="#35662E" strokeWidth="1.2" strokeLinecap="round" />
          {/* Coconut bunch */}
          <circle cx="612" cy="74" r="2.8" fill="#5F7E3B" />
          <circle cx="616" cy="74" r="2.8" fill="#6A8944" />
          <circle cx="614" cy="77" r="2.8" fill="#546E34" />
        </g>

        {/* PALM 2 (Mid-right, leaning gently right) */}
        <g>
          <path
            d="M 655 190 C 657 150, 664 120, 672 82"
            stroke="#594432"
            strokeWidth="2.8"
            strokeLinecap="round"
          />
          {/* Radiating Coconut Fronds */}
          <path d="M 672 82 C 654 74, 634 82, 622 96" stroke="#2B5725" strokeWidth="2" strokeLinecap="round" />
          <path d="M 672 82 C 650 64, 630 64, 616 72" stroke="#35662E" strokeWidth="2" strokeLinecap="round" />
          <path d="M 672 82 C 662 56, 646 46, 634 50" stroke="#417737" strokeWidth="2" strokeLinecap="round" />
          <path d="M 672 82 C 672 52, 670 34, 668 26" stroke="#4A863E" strokeWidth="2" strokeLinecap="round" />
          <path d="M 672 82 C 682 52, 692 38, 700 32" stroke="#3F7635" strokeWidth="2" strokeLinecap="round" />
          <path d="M 672 82 C 694 60, 712 58, 726 66" stroke="#35662E" strokeWidth="2" strokeLinecap="round" />
          <path d="M 672 82 C 698 74, 718 84, 730 98" stroke="#2B5725" strokeWidth="2" strokeLinecap="round" />
        </g>

        {/* PALM 3 (Slightly further right, backdrop) */}
        <g opacity="0.9">
          <path
            d="M 700 188 C 704 150, 712 118, 720 90"
            stroke="#503E2D"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
          {/* Fronds */}
          <path d="M 720 90 C 702 78, 684 84, 672 96" stroke="#2B5725" strokeWidth="1.8" strokeLinecap="round" />
          <path d="M 720 90 C 706 68, 692 62, 680 66" stroke="#35662E" strokeWidth="1.8" strokeLinecap="round" />
          <path d="M 720 90 C 722 62, 724 46, 726 38" stroke="#417737" strokeWidth="1.8" strokeLinecap="round" />
          <path d="M 720 90 C 736 68, 750 68, 760 76" stroke="#35662E" strokeWidth="1.8" strokeLinecap="round" />
          <path d="M 720 90 C 740 86, 756 98, 760 108" stroke="#234B1E" strokeWidth="1.8" strokeLinecap="round" />
        </g>

        {/* 8. Forefront Grassy Contours & Ground Blend */}
        <path
          d="M 320 235 C 410 205, 500 225, 590 198 C 650 180, 705 190, 760 178 L 760 260 L 320 260 Z"
          fill="#47764C"
          opacity="0.35"
        />

        {/* 9. Soft Atmospheric Left Fade (Blends seamlessly into ivory greeting) */}
        <rect x="0" y="0" width="760" height="260" fill="url(#keralaFadeLeft)" />
        <rect x="0" y="0" width="760" height="260" fill="url(#keralaFadeBottom)" />
      </svg>
    </div>
  );
};
