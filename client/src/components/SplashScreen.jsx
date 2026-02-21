import { useState, useEffect } from 'react';

export default function SplashScreen({ onComplete }) {
  const [phase, setPhase] = useState('enter'); // enter → hold → exit

  useEffect(() => {
    const holdTimer = setTimeout(() => setPhase('hold'), 100);
    const exitTimer = setTimeout(() => setPhase('exit'), 4300);
    const doneTimer = setTimeout(() => onComplete(), 5000);
    return () => {
      clearTimeout(holdTimer);
      clearTimeout(exitTimer);
      clearTimeout(doneTimer);
    };
  }, [onComplete]);

  return (
    <div
      className={`fixed inset-0 z-[9999] flex items-center justify-center transition-opacity duration-700 ${
        phase === 'exit' ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
      style={{
        background: 'radial-gradient(ellipse at center, #1a0533 0%, #0a1628 50%, #050510 100%)',
      }}
    >
      {/* Animated ring */}
      <div className="absolute w-[280px] h-[280px] splash-ring" />
      <div className="absolute w-[320px] h-[320px] splash-ring-outer" />

      {/* Floating particles */}
      {[...Array(12)].map((_, i) => (
        <div
          key={i}
          className="absolute w-1 h-1 rounded-full bg-gold/60 splash-particle"
          style={{
            '--angle': `${i * 30}deg`,
            '--delay': `${i * 0.15}s`,
            '--radius': `${140 + (i % 3) * 20}px`,
          }}
        />
      ))}

      {/* Center content */}
      <div className="relative text-center z-10">
        {/* Om symbol */}
        <div
          className={`text-7xl mb-6 transition-all duration-1000 ${
            phase === 'enter' ? 'opacity-0 scale-50' : 'opacity-100 scale-100'
          }`}
          style={{
            color: '#d4a017',
            textShadow: '0 0 30px rgba(212,160,23,0.6), 0 0 60px rgba(212,160,23,0.3)',
            transitionDelay: '0.2s',
          }}
        >
          &#x0950;
        </div>

        {/* Title */}
        <h1
          className={`text-3xl font-bold tracking-widest mb-2 transition-all duration-800 ${
            phase === 'enter' ? 'opacity-0 translate-y-4' : 'opacity-100 translate-y-0'
          }`}
          style={{
            color: '#d4a017',
            textShadow: '0 0 15px rgba(212,160,23,0.5)',
            transitionDelay: '0.5s',
          }}
        >
          ॥ प्रश्न कुंडली ॥
        </h1>

        <p
          className={`text-white/30 text-xs tracking-[0.3em] uppercase mb-10 transition-all duration-800 ${
            phase === 'enter' ? 'opacity-0' : 'opacity-100'
          }`}
          style={{ transitionDelay: '0.7s' }}
        >
          KP Ruling Planets + Ank Shastra
        </p>

        {/* Divider line */}
        <div
          className={`mx-auto mb-6 h-px bg-gradient-to-r from-transparent via-gold/40 to-transparent transition-all duration-1000 ${
            phase === 'enter' ? 'w-0' : 'w-48'
          }`}
          style={{ transitionDelay: '0.9s' }}
        />

        {/* Attribution */}
        <p
          className={`text-white/25 text-[11px] tracking-wide leading-relaxed transition-all duration-800 ${
            phase === 'enter' ? 'opacity-0 translate-y-2' : 'opacity-100 translate-y-0'
          }`}
          style={{ transitionDelay: '1.1s' }}
        >
          Created with knowledge from
        </p>
        <p
          className={`text-gold/50 text-sm font-medium tracking-wide mt-1 transition-all duration-800 ${
            phase === 'enter' ? 'opacity-0 translate-y-2' : 'opacity-100 translate-y-0'
          }`}
          style={{
            transitionDelay: '1.3s',
            textShadow: '0 0 10px rgba(212,160,23,0.2)',
          }}
        >
          Shri Chandrakant ji B. Randhir
        </p>
      </div>
    </div>
  );
}
