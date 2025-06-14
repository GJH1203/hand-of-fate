'use client';

import React, { useEffect, useState } from 'react';

interface CardPlacementEffectProps {
  position: { x: number; y: number };
  onComplete: () => void;
}

export default function CardPlacementEffect({ position, onComplete }: CardPlacementEffectProps) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
      onComplete();
    }, 1000);

    return () => clearTimeout(timer);
  }, [onComplete]);

  if (!visible) return null;

  return (
    <div 
      className="absolute pointer-events-none"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        transform: 'translate(-50%, -50%)',
        zIndex: 100
      }}
    >
      {/* Lightning burst effect */}
      <div className="absolute inset-0 animate-ping">
        <div className="w-32 h-32 bg-yellow-400/30 rounded-full blur-xl" />
      </div>
      
      {/* Electric rings */}
      <svg
        width="200"
        height="200"
        className="absolute -top-[100px] -left-[100px] animate-spin-slow"
        style={{ animation: 'spin 2s linear' }}
      >
        <circle
          cx="100"
          cy="100"
          r="80"
          fill="none"
          stroke="url(#lightning-gradient)"
          strokeWidth="2"
          strokeDasharray="10 5"
          opacity="0.8"
        />
        <circle
          cx="100"
          cy="100"
          r="60"
          fill="none"
          stroke="url(#lightning-gradient)"
          strokeWidth="1"
          strokeDasharray="5 10"
          opacity="0.6"
        />
        <defs>
          <linearGradient id="lightning-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#fbbf24" />
            <stop offset="50%" stopColor="#a855f7" />
            <stop offset="100%" stopColor="#3b82f6" />
          </linearGradient>
        </defs>
      </svg>
      
      {/* Sparkles */}
      {[...Array(8)].map((_, i) => (
        <div
          key={i}
          className="absolute w-1 h-1 bg-yellow-300 rounded-full animate-ping"
          style={{
            top: `${50 + 40 * Math.cos((i * Math.PI) / 4)}px`,
            left: `${50 + 40 * Math.sin((i * Math.PI) / 4)}px`,
            animationDelay: `${i * 0.1}s`,
            animationDuration: '1s'
          }}
        />
      ))}
    </div>
  );
}