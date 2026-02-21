import { useState, useEffect } from 'react';
import { useI18n } from '../i18n/useI18n';

function formatDeg(d) {
  if (d == null) return '—';
  const deg = Math.floor(d);
  const min = Math.floor((d - deg) * 60);
  return `${deg}°${min}'`;
}

export default function VerificationPanel({ chartData, timestamp, location }) {
  const { t, lang } = useI18n();
  const [prokeralaData, setProkeralaData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!location || !timestamp) return;

    const fetchProkerala = async () => {
      setLoading(true);
      setError(null);
      try {
        const dt = new Date(timestamp).toISOString().replace('Z', '+05:30');
        const res = await fetch(
          `/api/prokerala?latitude=${location.latitude}&longitude=${location.longitude}&datetime=${encodeURIComponent(dt)}`
        );
        const data = await res.json();
        setProkeralaData(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchProkerala();
  }, [location, timestamp]);

  if (!chartData) return null;

  const ourPlanets = chartData.planetPositions || {};
  const pkPlanets = prokeralaData?.planets || {};

  // Planet name mapping for comparison
  const planetKeys = [
    { key: 'sun', label: lang === 'mr' ? 'रवी' : 'Sun' },
    { key: 'moon', label: lang === 'mr' ? 'चंद्र' : 'Moon' },
    { key: 'mars', label: lang === 'mr' ? 'मंगळ' : 'Mars' },
    { key: 'mercury', label: lang === 'mr' ? 'बुध' : 'Mercury' },
    { key: 'jupiter', label: lang === 'mr' ? 'गुरू' : 'Jupiter' },
    { key: 'venus', label: lang === 'mr' ? 'शुक्र' : 'Venus' },
    { key: 'saturn', label: lang === 'mr' ? 'शनी' : 'Saturn' },
    { key: 'rahu', label: lang === 'mr' ? 'राहू' : 'Rahu' },
    { key: 'ketu', label: lang === 'mr' ? 'केतू' : 'Ketu' },
  ];

  return (
    <div className="card-glass p-4 animate-fade-in-up" style={{ animationDelay: '0.5s' }}>
      <h3 className="text-white/50 text-sm font-bold mb-3 flex items-center gap-2">
        <span className="text-lg">&#9881;</span>
        {t('verification')}
      </h3>

      {/* Comparison table */}
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-white/10">
              <th className="text-left text-white/40 py-2 pr-2">{t('planet')}</th>
              <th className="text-right text-white/40 py-2 px-2">{t('ourCalc')}</th>
              <th className="text-left text-white/40 py-2 px-2">{t('sign')}</th>
              <th className="text-right text-white/40 py-2 px-2">ProKerala</th>
              <th className="text-left text-white/40 py-2 pl-2">{t('sign')}</th>
            </tr>
          </thead>
          <tbody>
            {/* Ascendant row */}
            <tr className="border-b border-white/5">
              <td className="text-gold py-1.5 pr-2 font-medium">{t('ascendant')}</td>
              <td className="text-right text-white/70 py-1.5 px-2 font-mono">
                {formatDeg(chartData.ascendant)}
              </td>
              <td className="text-white/40 py-1.5 px-2">
                {lang === 'mr' ? chartData.ascendantSign?.mr : chartData.ascendantSign?.en}
              </td>
              <td className="text-right text-white/70 py-1.5 px-2 font-mono">
                {loading ? '...' : prokeralaData?.ascendant
                  ? formatDeg(prokeralaData.ascendant.longitude)
                  : '—'}
              </td>
              <td className="text-white/40 py-1.5 pl-2">
                {prokeralaData?.ascendant?.rashi || '—'}
              </td>
            </tr>
            {/* Planet rows */}
            {planetKeys.map(({ key, label }) => {
              const our = ourPlanets[key];
              const pk = pkPlanets[key];
              const diff = our && pk
                ? Math.abs(our.degree - pk.longitude)
                : null;
              const match = diff !== null && diff < 1;

              return (
                <tr key={key} className="border-b border-white/5">
                  <td className="text-white/60 py-1.5 pr-2">{label}</td>
                  <td className="text-right text-white/70 py-1.5 px-2 font-mono">
                    {formatDeg(our?.degree)}
                  </td>
                  <td className="text-white/40 py-1.5 px-2">
                    {lang === 'mr' ? our?.sign?.mr : our?.sign?.en}
                    {our?.isRetrograde ? ' (R)' : ''}
                  </td>
                  <td className={`text-right py-1.5 px-2 font-mono ${
                    loading ? 'text-white/30' : match ? 'text-emerald-400/70' : pk ? 'text-saffron/70' : 'text-white/30'
                  }`}>
                    {loading ? '...' : pk ? formatDeg(pk.longitude) : '—'}
                  </td>
                  <td className="text-white/40 py-1.5 pl-2">
                    {pk?.rashi || '—'}
                    {pk?.isRetrograde ? ' (R)' : ''}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Status note */}
      {prokeralaData && !prokeralaData.success && (
        <div className="mt-3 px-3 py-2 bg-saffron/5 border border-saffron/10 rounded-lg">
          <p className="text-saffron/60 text-xs leading-relaxed">
            &#9432; {prokeralaData.note || t('sandboxNote')}
          </p>
        </div>
      )}

      {error && (
        <div className="mt-3 text-red-400/60 text-xs">
          ProKerala error: {error}
        </div>
      )}
    </div>
  );
}
