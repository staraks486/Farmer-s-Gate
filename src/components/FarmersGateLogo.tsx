import React from 'react';

interface FarmersGateLogoProps {
  variant?: 'default' | 'light' | 'header' | 'monogram';
  className?: string;
}

export default function FarmersGateLogo({ variant = 'default', className = '' }: FarmersGateLogoProps) {
  const isLight = variant === 'light';
  const isHeader = variant === 'header';
  const isMonogram = variant === 'monogram';

  const farmersColor = isLight ? '#4ade80' : '#2e7d32'; // Vibrant rich organic green for Farmer's
  const gateColor = isLight ? '#ffffff' : '#1b2a22';    // Deep dark slate/charcoal for GATE
  const lineColor = isLight ? '#4ade80' : '#2e7d32';    // Side lines

  if (isMonogram) {
    return (
      <svg
        className={`h-10 w-10 shrink-0 ${className}`}
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <circle cx="50" cy="50" r="44" fill={isLight ? '#022c22' : '#ffffff'} stroke="#2e7d32" strokeWidth="2.5" />
        <text
          x="50"
          y="44"
          textAnchor="middle"
          fill={isLight ? '#4ade80' : '#2e7d32'}
          fontFamily="'Satisfy', 'Dancing Script', cursive"
          fontSize="24"
          fontWeight="bold"
        >
          F's
        </text>
        <text
          x="50"
          y="74"
          textAnchor="middle"
          fill={isLight ? '#ffffff' : '#1b2a22'}
          fontFamily="'Plus Jakarta Sans', sans-serif"
          fontSize="11"
          fontWeight="900"
          letterSpacing="0.15em"
        >
          GATE
        </text>
        <path d="M 28 56 C 40 60, 60 60, 72 56" stroke="#2e7d32" strokeWidth="1.5" strokeLinecap="round" fill="none" />
      </svg>
    );
  }

  // Exact reproduction of the logo in the image using highly-polished SVGs
  const svgWidth = isHeader ? 140 : 200;
  const svgHeight = isHeader ? 60 : 85;

  return (
    <div className={`flex items-center justify-center select-none ${className}`}>
      <svg
        width={svgWidth}
        height={svgHeight}
        viewBox="0 0 200 85"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="transition-all duration-200"
      >
        {/* 1. Cursive "Farmer's" with google reviews font weight feeling */}
        <text
          x="100"
          y="42"
          textAnchor="middle"
          fill={farmersColor}
          fontFamily="'Satisfy', 'Dancing Script', cursive"
          fontSize="41"
          fontWeight="normal"
          className="select-none"
        >
          Farmer's
        </text>

        {/* 2. Beautiful custom swoosh underline matching the image's brush stroke precisely */}
        <path
          d="M 32 48 C 65 57, 115 57, 168 44 C 115 62, 60 60, 32 48 Z"
          fill={farmersColor}
          className="select-none"
        />

        {/* 3. Tapered Left Line Accent */}
        <path
          d="M 22 70 C 40 69.5, 55 69.5, 73 70 C 55 70.5, 40 70.5, 22 70 Z"
          fill={lineColor}
          opacity="0.85"
        />

        {/* 4. "GATE" wordmark in spaced capitalized serif typography */}
        <text
          x="103"
          y="73"
          textAnchor="middle"
          fill={gateColor}
          fontFamily="'Cinzel', 'Georgia', 'Plus Jakarta Sans', serif"
          fontSize="13.5"
          fontWeight="900"
          letterSpacing="0.28em"
          className="select-none"
        >
          GATE
        </text>

        {/* 5. Tapered Right Line Accent */}
        <path
          d="M 127 70 C 145 69.5, 160 69.5, 178 70 C 160 70.5, 145 70.5, 127 70 Z"
          fill={lineColor}
          opacity="0.85"
        />
      </svg>
    </div>
  );
}
