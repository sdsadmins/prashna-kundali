import { useState, useEffect } from 'react';
import { useI18n } from '../i18n/useI18n';

function formatTime(isoString, lang) {
  if (!isoString) return '—';
  return new Date(isoString).toLocaleTimeString(lang === 'mr' ? 'mr-IN' : 'en-IN', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatDegree(d) {
  const deg = Math.floor(d);
  const min = Math.floor((d - deg) * 60);
  const sec = Math.round(((d - deg) * 60 - min) * 60);
  return `${deg}° ${min}' ${sec}"`;
}

export default function LagnaInfo({ lagnaInfo, timestamp }) {
  const { t, lang } = useI18n();
  const [remainingMinutes, setRemainingMinutes] = useState(null);

  // Live countdown to lagna end
  useEffect(() => {
    if (!lagnaInfo?.endTime) return;
    const targetTime = new Date(lagnaInfo.endTime).getTime();
    const update = () => {
      const diff = Math.max(0, Math.round((targetTime - Date.now()) / 60000));
      setRemainingMinutes(diff);
    };
    update();
    const interval = setInterval(update, 30000);
    return () => clearInterval(interval);
  }, [lagnaInfo]);

  if (!lagnaInfo) return null;

  const signEn = lagnaInfo.sign?.en;
  const signMr = lagnaInfo.sign?.mr;
  const nakEn = lagnaInfo.nakshatra?.en;
  const nakMr = lagnaInfo.nakshatra?.mr;
  const nextSignEn = lagnaInfo.nextSign?.en;
  const nextSignMr = lagnaInfo.nextSign?.mr;

  const calcTime = timestamp
    ? new Date(timestamp).toLocaleTimeString(lang === 'mr' ? 'mr-IN' : 'en-IN', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      })
    : '';

  const startTime = formatTime(lagnaInfo.startTime, lang);
  const endTime = formatTime(lagnaInfo.endTime, lang);
  const minsLeft = remainingMinutes !== null ? remainingMinutes : lagnaInfo.nextSignChangeMinutes;

  // Progress through current lagna
  const totalDuration = lagnaInfo.startTime && lagnaInfo.endTime
    ? (new Date(lagnaInfo.endTime).getTime() - new Date(lagnaInfo.startTime).getTime()) / 60000
    : 120;
  const elapsed = totalDuration - (minsLeft || 0);
  const progress = Math.min(100, Math.max(0, (elapsed / totalDuration) * 100));

  return (
    <div className="card-glass p-4 animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
      <h3 className="text-gold glow-text text-sm font-bold mb-3 flex items-center gap-2">
        <span className="text-lg">&#9788;</span>
        {t('lagnaInfoTitle')}
      </h3>

      {/* Lagna sign + time range bar */}
      <div className="bg-white/3 rounded-lg p-3 border border-white/5 mb-3">
        <div className="flex items-center justify-between mb-2">
          <div>
            <span className="text-gold font-bold text-lg">
              {lang === 'mr' ? signMr : signEn}
            </span>
            <span className="text-white/40 text-xs ml-2 font-mono">
              {formatDegree(lagnaInfo.degreeInSign)}
            </span>
          </div>
          <div className="text-right">
            <span className={`font-mono font-bold text-sm ${
              minsLeft <= 5 ? 'text-red-400' : minsLeft <= 15 ? 'text-saffron' : 'text-emerald-400'
            }`}>
              {minsLeft !== null ? `~${minsLeft} ${t('minutes')}` : '—'}
            </span>
          </div>
        </div>

        {/* Time range with progress */}
        <div className="flex justify-between text-xs text-white/30 mb-1">
          <span>{startTime}</span>
          <span className="text-white/50">
            {lang === 'mr' ? 'गणना' : 'calc'}: {calcTime}
          </span>
          <span>{endTime}</span>
        </div>
        <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-gold/60 to-saffron/60"
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Next lagna */}
        {nextSignEn && (
          <div className="mt-2 text-xs text-white/30">
            {lang === 'mr' ? 'पुढचे लग्न' : 'Next lagna'}:{' '}
            <span className="text-white/50 font-medium">
              {lang === 'mr' ? nextSignMr : nextSignEn}
            </span>
            {' '}({lang === 'mr' ? 'पासून' : 'from'} {endTime})
          </div>
        )}
      </div>

      {/* Nakshatra + Moon + details grid */}
      <div className="grid grid-cols-2 gap-3 text-sm">
        {/* Lagna Nakshatra */}
        <div className="bg-white/3 rounded-lg p-3 border border-white/5">
          <div className="text-white/40 text-xs mb-1">{t('lagnaNak')}</div>
          <div className="text-white font-medium">
            {lang === 'mr' ? nakMr : nakEn}
          </div>
          <div className="text-white/30 text-xs">
            {lang === 'mr' ? `पद ${lagnaInfo.pada}` : `Pada ${lagnaInfo.pada}`}
          </div>
          {lagnaInfo.nextNakshatraChangeMinutes && (
            <div className="text-white/20 text-xs mt-1">
              {lang === 'mr' ? 'बदल' : 'Change'}: ~{lagnaInfo.nextNakshatraChangeMinutes} {t('minutes')}
            </div>
          )}
        </div>

        {/* Moon Nakshatra (panchang nakshatra) */}
        <div className="bg-white/3 rounded-lg p-3 border border-saffron/15">
          <div className="text-saffron/60 text-xs mb-1">{t('moonNak')}</div>
          <div className="text-saffron font-medium">
            {lang === 'mr'
              ? lagnaInfo.moonNakshatra?.mr
              : lagnaInfo.moonNakshatra?.en}
          </div>
          <div className="text-white/30 text-xs">
            {lang === 'mr'
              ? `${lagnaInfo.moonSign?.mr} | पद ${lagnaInfo.moonPada || '—'}`
              : `${lagnaInfo.moonSign?.en} | Pada ${lagnaInfo.moonPada || '—'}`}
          </div>
        </div>
      </div>

      {/* Total degree row */}
      <div className="mt-3 bg-white/3 rounded-lg p-3 border border-white/5 text-sm">
        <div className="flex justify-between items-center">
          <div>
            <span className="text-white/40 text-xs">{lang === 'mr' ? 'एकूण अंश' : 'Total Degree'}: </span>
            <span className="text-white font-mono font-medium">{formatDegree(lagnaInfo.degree)}</span>
          </div>
          <span className="text-white/20 text-xs">KP Ayanamsa</span>
        </div>
      </div>

      {/* Same answer note */}
      <div className="mt-3 px-3 py-2 bg-gold/5 border border-gold/10 rounded-lg">
        <p className="text-gold/60 text-xs leading-relaxed">
          &#9432; {t('sameAnswerNote')}
        </p>
      </div>
    </div>
  );
}
