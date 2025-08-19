import React from 'react';

interface LogoProps {
  size?: number;
  className?: string;
  useImage?: boolean;
  imageSrc?: string;
}

export const Logo: React.FC<LogoProps> = ({ 
  size = 32, 
  className = "",
  useImage = false,
  imageSrc = "/logo.png"
}) => {
  if (useImage && imageSrc) {
    return (
      <img 
        src={imageSrc}
        alt="Logo"
        width={size}
        height={size}
        className={className}
        style={{ objectFit: 'contain' }}
      />
    );
  }

  // Fallback to infinity SVG
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="infinityGradient" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" style={{ stopColor: '#8B5CF6', stopOpacity: 1 }} />
          <stop offset="25%" style={{ stopColor: '#A855F7', stopOpacity: 1 }} />
          <stop offset="50%" style={{ stopColor: '#DC2626', stopOpacity: 1 }} />
          <stop offset="75%" style={{ stopColor: '#EA580C', stopOpacity: 1 }} />
          <stop offset="100%" style={{ stopColor: '#F97316', stopOpacity: 1 }} />
        </linearGradient>
      </defs>
      
      {/* Infinity symbol with intertwined figures */}
      <path
        d="M 20 50 
           C 20 30, 35 20, 50 20 
           C 65 20, 80 30, 80 50 
           C 80 70, 65 80, 50 80 
           C 35 80, 20 70, 20 50 
           Z"
        fill="url(#infinityGradient)"
        stroke="none"
      />
      
      <path
        d="M 30 50 
           C 30 35, 40 30, 50 30 
           C 60 30, 70 35, 70 50 
           C 70 65, 60 70, 50 70 
           C 40 70, 30 65, 30 50 
           Z"
        fill="url(#infinityGradient)"
        stroke="none"
      />
      
      {/* Left figure head */}
      <circle
        cx="25"
        cy="35"
        r="8"
        fill="url(#infinityGradient)"
      />
      
      {/* Right figure head */}
      <circle
        cx="75"
        cy="35"
        r="6"
        fill="url(#infinityGradient)"
      />
      
      {/* Connecting lines to form infinity */}
      <path
        d="M 33 35 Q 50 20 67 35"
        stroke="url(#infinityGradient)"
        strokeWidth="3"
        fill="none"
        strokeLinecap="round"
      />
      
      <path
        d="M 33 65 Q 50 80 67 65"
        stroke="url(#infinityGradient)"
        strokeWidth="3"
        fill="none"
        strokeLinecap="round"
      />
    </svg>
  );
}; 