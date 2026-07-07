import React from 'react';

interface FarmersGateLogoProps {
  variant?: 'default' | 'light' | 'header' | 'monogram';
  className?: string;
}

export default function FarmersGateLogo({ variant = 'default', className = '' }: FarmersGateLogoProps) {
  // Select color schemes based on variant
  const isLight = variant === 'light';
  const isHeader = variant === 'header';
  const isMonogram = variant === 'monogram';

  const farmersColor = isLight ? '#4ade80' : '#15803d'; // Cursive "Farmer's"
  const gateColor = isLight ? '#ffffff' : '#0f172a';    // Clean capitals "GATE"
  const lineColor = isLight ? '#22c55e' : '#15803d';    // Side lines
  
  if (isMonogram) {
    return (
      <svg
        className={`h-10 w-10 shrink-0 ${className}`}
        viewBox="0 0 100 100"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Glowing background circle */}
        <circle cx="50" cy="50" r="44" fill={isLight ? '#022c22' : '#f0fdf4'} stroke={isLight ? '#10b981' : '#15803d'} strokeWidth="2.5" />
        
        {/* Monogram "F" in script */}
        <text
          x="44"
          y="56"
          textAnchor="middle"
          fill={farmersColor}
          fontFamily="'Satisfy', 'Dancing Script', cursive"
          fontSize="38"
          fontWeight="bold"
        >
          F
        </text>
        
        {/* Monogram "G" in bold block style overlap */}
        <text
          x="58"
          y="72"
          textAnchor="middle"
          fill={gateColor}
          fontFamily="'Plus Jakarta Sans', sans-serif"
          fontSize="24"
          fontWeight="900"
        >
          G
        </text>

        {/* Small sprout leaf */}
        <path d="M 68 32 C 78 32 78 42 68 42 C 64 38 64 34 68 32 Z" fill="#22c55e" />
        <path d="M 66 36 L 68 38" stroke="#15803d" strokeWidth="0.8" />
      </svg>
    );
  }

  // Header or full standard responsive logo
  return (
    <div className={`flex flex-col items-center justify-center select-none ${isHeader ? 'scale-[0.85] origin-left -my-1.5' : ''} ${className}`}>
      {/* Cursive script part */}
      <div 
        className={`font-normal tracking-wide text-center drop-shadow-xs italic ${
          isHeader ? 'text-xl leading-none' : 'text-3xl leading-none'
        }`}
        style={{ 
          fontFamily: "'Satisfy', 'Dancing Script', cursive",
          color: farmersColor,
          textShadow: isLight ? '0 1px 2px rgba(0,0,0,0.3)' : '0 0.5px 0.5px rgba(22,163,74,0.1)'
        }}
      >
        Farmer's
      </div>

      {/* GATE and decorative lines container */}
      <div className="flex items-center justify-center gap-2 w-full mt-0.5">
        {/* Left Tapered Line */}
        <div className="flex items-center shrink-0">
          <svg width={isHeader ? "22" : "34"} height="6" viewBox="0 0 34 6" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M2 3H30" stroke={lineColor} strokeWidth="1.2" strokeLinecap="round" />
            {/* Diamond tip */}
            <polygon points="32,3 27,1 27,5" fill={lineColor} />
          </svg>
        </div>

        {/* GATE text */}
        <div 
          className={`font-black tracking-[0.25em] text-center uppercase ${
            isHeader ? 'text-[10px]' : 'text-[13px]'
          }`}
          style={{ 
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            color: gateColor,
            textShadow: isLight ? '0 1px 1px rgba(0,0,0,0.2)' : 'none'
          }}
        >
          Gate
        </div>

        {/* Right Tapered Line */}
        <div className="flex items-center shrink-0">
          <svg width={isHeader ? "22" : "34"} height="6" viewBox="0 0 34 6" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M32 3H4" stroke={lineColor} strokeWidth="1.2" strokeLinecap="round" />
            {/* Diamond tip */}
            <polygon points="2,3 7,1 7,5" fill={lineColor} />
          </svg>
        </div>
      </div>
    </div>
  );
}
