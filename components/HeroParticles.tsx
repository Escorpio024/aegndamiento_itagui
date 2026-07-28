'use client';
import { useEffect, useRef } from 'react';

export default function HeroParticles() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    const colors = ['rgba(0,212,170,.4)', 'rgba(79,172,254,.35)', 'rgba(124,58,237,.25)'];
    for (let i = 0; i < 25; i++) {
      const p = document.createElement('div');
      p.className = 'particle';
      const size = Math.random() * 5 + 2;
      Object.assign(p.style, {
        width: `${size}px`, height: `${size}px`,
        left: `${Math.random() * 100}%`,
        animationDuration: `${8 + Math.random() * 16}s`,
        animationDelay:    `${Math.random() * 12}s`,
        background: colors[Math.floor(Math.random() * colors.length)],
      });
      ref.current.appendChild(p);
    }
  }, []);

  return <div className="hero-particles" ref={ref} />;
}
