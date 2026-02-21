import { useState, useEffect, useCallback } from 'react';
import { useI18n } from '../i18n/useI18n';

function formatTime(isoString, lang) {
  if (!isoString) return '—';
  return new Date(isoString).toLocaleTimeString(lang === 'mr' ? 'mr-IN' : 'en-IN', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatDeg(d) {
  const deg = Math.floor(d);
  const min = Math.floor((d - deg) * 60);
  return `${deg}°${min}'`;
}

export default function LiveLagnaBar({ location }) {
  const { t, lang } = useI18n();
  const [lagnaData, setLagnaData] = useState(null);
  const [remainingMin, setRemainingMin] = useState(null);

  const fetchLagna = useCallback(async () => {
    if (!location) return;
    try {
      const res = await fetch(
        `/api/lagna-status?latitude=${location.latitude}&longitude=${location.longitude}`
      );
      const data = await res.json();
      if (data.success) {
        setLagnaData(data.lagna);
      }
    } catch (err) {
      console.error('Lagna fetch error:', err);
    }
  }, [location]);

  // Fetch on mount and every 60 seconds
  useEffect(() => {
    fetchLagna();
    const interval = setInterval(fetchLagna, 60000);
    return () => clearInterval(interval);
  }, [fetchLagna]);

  // Live countdown
  useEffect(() => {
    if (!lagnaData?.endTime) return;
    const target = new Date(lagnaData.endTime).getTime();
    const update = () => {
      const diff = Math.max(0, Math.round((target - Date.now()) / 60000));
      setRemainingMin(diff);
    };
    update();
    const interval = setInterval(update, 15000);
    return () => clearInterval(interval);
  }, [lagnaData]);

  if (!lagnaData) {
    return (
      <div className="card-glass px-4 py-3 animate-pulse">
        <div className="h-4 bg-white/5 rounded w-48 mx-auto" />
      </div>
    );
  }

  const sign = lagnaData.sign;
  const nextSign = lagnaData.nextSign;
  const startTime = formatTime(lagnaData.startTime, lang);
  const endTime = formatTime(lagnaData.endTime, lang);

  // Progress bar: how far through the current lagna sign are we
  const totalMinFromStart = lagnaData.startTime && lagnaData.endTime
    ? (new Date(lagnaData.endTime).getTime() - new Date(lagnaData.startTime).getTime()) / 60000
    : 120;
  const elapsed = totalMinFromStart - (remainingMin || 0);
  const progress = Math.min(100, Math.max(0, (elapsed / totalMinFromStart) * 100));

  return (
    <div className="card-glass px-4 py-3">
      <div className="flex items-center justify-between gap-4">
        {/* Current lagna */}
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-gold/15 border border-gold/30 flex items-center justify-center">
            <span className="text-gold text-sm font-bold">
              {lang === 'mr' ? 'ल' : 'L'}
            </span>
          </div>
          <div>
            <div className="text-gold font-bold text-sm">
              {lang === 'mr' ? sign?.mr : sign?.en}
            </div>
            <div className="text-white/30 text-xs">
              {formatDeg(lagnaData.degreeInSign)} &middot; {lang === 'mr' ? lagnaData.nakshatra?.mr : lagnaData.nakshatra?.en}
            </div>
          </div>
        </div>

        {/* Time range */}
        <div className="flex-1 max-w-xs hidden sm:block">
          <div className="flex justify-between text-xs text-white/30 mb-1">
            <span>{startTime}</span>
            <span>{endTime}</span>
          </div>
          {/* Progress bar */}
          <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-1000 bg-gradient-to-r from-gold/60 to-saffron/60"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Remaining time */}
        <div className="text-right">
          <div className={`font-mono font-bold text-sm ${
            remainingMin <= 5 ? 'text-red-400' : remainingMin <= 15 ? 'text-saffron' : 'text-emerald-400'
          }`}>
            {remainingMin !== null ? `${remainingMin} ${t('minutes')}` : '—'}
          </div>
          <div className="text-white/30 text-xs">
            {lang === 'mr' ? 'पुढे' : 'next'}: {lang === 'mr' ? nextSign?.mr : nextSign?.en}
          </div>
        </div>
      </div>
    </div>
  );
}
