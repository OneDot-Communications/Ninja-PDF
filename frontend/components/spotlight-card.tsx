import React, { useRef, ReactNode, useEffect } from 'react';

interface GlowCardProps {
  children: ReactNode;
  className?: string;
  glowColor?: 'blue' | 'purple' | 'green' | 'red' | 'orange';
  size?: 'sm' | 'md' | 'lg';
  width?: string | number;
  height?: string | number;
  customSize?: boolean;
}

const glowColorMap = {
  blue: { base: 220, spread: 200 },
  purple: { base: 280, spread: 300 },
  green: { base: 120, spread: 200 },
  red: { base: 0, spread: 200 },
  orange: { base: 30, spread: 200 }
};

const sizeMap = {
  sm: 'w-48 h-64',
  md: 'w-64 h-80',
  lg: 'w-80 h-96'
};

const GlowCard: React.FC<GlowCardProps> = ({
  children,
  className = '',
  glowColor = 'blue',
  size = 'md',
  width,
  height,
  customSize = false
}) => {
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const card = cardRef.current;
    if (!card) return;

    let AnimationFrameId: number;

    const handleMouseMove = (e: MouseEvent) => {
      if (AnimationFrameId) cancelAnimationFrame(AnimationFrameId);

      AnimationFrameId = requestAnimationFrame(() => {
        const rect = card.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        card.style.setProperty('--x', `${x}px`);
        card.style.setProperty('--y', `${y}px`);
      });
    };

    // Use a passive listener for better scroll performance
    card.addEventListener('mousemove', handleMouseMove, { passive: true });

    return () => {
      card.removeEventListener('mousemove', handleMouseMove);
      if (AnimationFrameId) cancelAnimationFrame(AnimationFrameId);
    };
  }, []);

  const { base } = glowColorMap[glowColor] || glowColorMap.blue;

  // Determine sizing
  const getSizeClasses = () => {
    if (customSize) {
      return '';
    }
    return sizeMap[size] || sizeMap.md;
  };

  // Optimized colors: computed up front
  const spotlightColor = `hsl(${base}, 80%, 70%)`;
  const borderColor = `hsl(${base}, 90%, 60%)`;

  return (
    <div
      ref={cardRef}
      className={`
        ${getSizeClasses()}
        ${!customSize ? 'aspect-[3/4]' : ''}
        rounded-2xl 
        relative 
        overflow-hidden
        bg-white
        group
        border border-slate-100
        ${className}
      `}
      style={{
        width: typeof width === 'number' ? `${width}px` : width,
        height: typeof height === 'number' ? `${height}px` : height,
        // Default variables to center or off-screen to avoid flash
        '--x': '-100px',
        '--y': '-100px',
      } as React.CSSProperties}
    >

      {/* 
         Spotlight Effect (Hover Only)
         - Uses simple radial gradient
         - No backdrop-blur (performance killer removed)
         - No mask-composite (performance killer removed)
      */}
      <div
        className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200 ease-out will-change-[opacity]"
        style={{
          background: `
            radial-gradient(
              600px circle at var(--x) var(--y), 
              ${spotlightColor}10, 
              transparent 40%
            )
          `
        }}
      />

      {/* 
         Border Glow
         - Simulated using a gradient border on a pseudo-element or inner div if needed.
         - Here we simply use a subtle border interaction or a very light gradient overlay.
      */}
      <div
        className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10"
        style={{
          background: `
              radial-gradient(
                300px circle at var(--x) var(--y), 
                ${borderColor}30, 
                transparent 40%
              )
            `,
        }}
      />

      {/* Content Container */}
      <div className="relative z-20 h-full w-full">
        {children}
      </div>
    </div>
  );
};

export { GlowCard };